import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { FacebookGatewayService } from "../../../src/services/facebook-gateway.service.ts";

describe("FacebookGatewayService", () => {
  let service: FacebookGatewayService;

  beforeEach(() => {
    service = new FacebookGatewayService();
  });

  it("configures FCA listening options", () => {
    const api: any = { setOptions: jest.fn() };

    service.configure(api);

    expect(api.setOptions).toHaveBeenCalledWith(expect.objectContaining({
      selfListen: false,
      listenEvents: true,
      autoMarkRead: false,
      autoMarkDelivery: false,
      online: true,
    }));
  });

  it("starts MQTT listening and normalizes callback errors", async () => {
    const event = { type: "message", body: "hi" };
    const api: any = {
      listenMqtt: jest.fn((callback: (err: unknown, event?: any) => void) => {
        callback(null, event);
        callback("boom");
      }),
    };
    const onEvent = jest.fn();
    const onError = jest.fn();

    await service.startListening(api, onEvent, onError);

    expect(onEvent).toHaveBeenCalledWith(event);
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: "boom" }));
  });

  it("sends text, attachments, stickers, reactions, typing, read, and unsend through FCA", async () => {
    const api: any = {
      sendMessage: jest.fn().mockReturnValue({ messageID: "mid" }),
      setMessageReaction: jest.fn(),
      unsendMessage: jest.fn(),
      sendTypingIndicator: jest.fn(),
      markAsRead: jest.fn(),
    };

    await expect(service.sendMessage(api, "thread", "hello", "reply")).resolves.toEqual({ messageID: "mid" });
    await expect(service.sendAttachmentMessage(api, {
      threadId: "thread",
      data: Buffer.from("abc"),
      fileName: "a.txt",
      caption: "cap",
      replyToMessageId: "reply",
    })).resolves.toEqual({ messageID: "mid" });
    await expect(service.sendStickerMessage(api, { threadId: "thread", stickerId: 123, replyToMessageId: "reply" })).resolves.toEqual({ messageID: "mid" });
    await service.sendReaction(api, "mid", "👍");
    await service.unsendMessage(api, "mid");
    await service.sendTyping(api, "thread", true);
    await service.markAsRead(api, "thread");

    expect(api.sendMessage).toHaveBeenNthCalledWith(1, "hello", "thread", undefined, "reply");
    const attachmentPayload = api.sendMessage.mock.calls[1][0];
    expect(attachmentPayload.body).toBe("cap");
    expect(attachmentPayload.attachment.path).toBe("a.txt");
    expect(api.sendMessage).toHaveBeenNthCalledWith(3, { sticker: 123 }, "thread", undefined, "reply");
    expect(api.setMessageReaction).toHaveBeenCalledWith("👍", "mid", undefined, true);
    expect(api.unsendMessage).toHaveBeenCalledWith("mid");
    expect(api.sendTypingIndicator).toHaveBeenCalledWith(true, "thread");
    expect(api.markAsRead).toHaveBeenCalledWith("thread", true);
  });

  it("throws clear errors when optional FCA methods are missing", async () => {
    await expect(service.sendReaction({} as any, "mid", "👍")).rejects.toThrow("setMessageReaction is not available");
    await expect(service.unsendMessage({} as any, "mid")).rejects.toThrow("unsendMessage is not available");
    await expect(service.sendTyping({} as any, "thread", true)).rejects.toThrow("sendTypingIndicator is not available");
    await expect(service.markAsRead({} as any, "thread")).rejects.toThrow("markAsRead is not available");
  });

  it("stops MQTT listening when available", () => {
    const api: any = { stopListenMqtt: jest.fn() };
    service.stop(api);
    expect(api.stopListenMqtt).toHaveBeenCalled();
  });

  it("fetches CAT from GraphQL responses and rejects malformed responses", async () => {
    const api: any = {
      fb_dtsg: "token",
      getCurrentUserID: jest.fn(() => "1001"),
      httpPost: jest.fn().mockReturnValue('for (;;); {"data":{"secure_message_over_wa_cat_query":{"encrypted_serialized_cat":"cat-token"}}}'),
    };

    await expect(service.fetchCAT(api)).resolves.toBe("cat-token");
    expect(api.httpPost).toHaveBeenCalledWith("https://www.facebook.com/api/graphql/", expect.objectContaining({
      fb_dtsg: "token",
      __user: "1001",
      doc_id: "23999698219677129",
    }));

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await expect(service.fetchCAT({ ...api, httpPost: jest.fn().mockReturnValue("not-json") })).rejects.toThrow("Failed to parse CAT response");
      await expect(service.fetchCAT({ ...api, httpPost: jest.fn().mockReturnValue('{"data":{}}') })).rejects.toThrow("Failed to extract CAT token");
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("fetches and registers ICDC payloads through httpPost", async () => {
    const api: any = {
      getAppState: jest.fn(() => [{ key: "c_user", value: "1001" }]),
      httpPost: jest.fn()
        .mockReturnValueOnce('{"ok":true}')
        .mockReturnValueOnce('{"registered":true}'),
    };

    await expect(service.fetchICDC(api, "1001", "42", Buffer.from("cat"))).resolves.toEqual({ ok: true });
    expect(api.httpPost).toHaveBeenNthCalledWith(1, "https://reg-e2ee.facebook.com/v2/fb_icdc_fetch", expect.objectContaining({
      fbid: "1001",
      fb_cat: "cat",
      device_id: "42",
    }));

    await expect(service.registerICDC(api, "1001", "42", Buffer.from("cat"), { payload: "x" })).resolves.toEqual({ registered: true });
    expect(api.httpPost).toHaveBeenNthCalledWith(2, "https://reg-e2ee.facebook.com/v2/fb_register_v2", expect.objectContaining({
      fbid: "1001",
      fb_cat: Buffer.from("cat").toString("base64"),
      device_id: "42",
      payload: "x",
    }));

    await expect(service.fetchICDC({} as any, "1", "2", Buffer.from("cat"))).rejects.toThrow("api.httpPost is required");
    await expect(service.registerICDC({} as any, "1", "2", Buffer.from("cat"), {})).rejects.toThrow("api.httpPost is required");
  });
});
