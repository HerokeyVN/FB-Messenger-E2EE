import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { sendE2EETextAction } from "../../../src/actions/messaging/send-e2ee-text.action.ts";
import type { FacebookE2EESocket } from "../../../src/e2ee/transport/noise/noise-socket.ts";

describe("sendE2EETextAction", () => {
  let mockContext: jest.Mocked<ActionContext>;
  let mockE2EEClient: any;
  let mockE2EEHandler: any;
  let mockSocket: jest.Mocked<FacebookE2EESocket>;
  let mockCache: any;

  beforeEach(() => {
    mockE2EEClient = {
      buildDMTextFanoutPayloads: jest.fn<any>().mockResolvedValue({
        messageApp: Buffer.from("app"),
        frankingTag: Buffer.from("tag"),
        devicePayload: Buffer.from("dev"),
        selfDevicePayload: Buffer.from("selfDev"),
      }),
      hasSession: jest.fn<any>().mockResolvedValue(true),
      encryptDevicePayload: jest.fn<any>().mockResolvedValue({
        type: "msg",
        ciphertext: Buffer.from("cipher"),
      }),
    };

    mockE2EEHandler = {
      getDeviceList: jest.fn<any>().mockResolvedValue(["peer.1@msgr", "self.1@msgr"]),
      getPreKeyBundle: jest.fn(),
    };

    mockSocket = {
      sendFrame: jest.fn<any>().mockResolvedValue(undefined),
    } as any;

    mockCache = {
      remember: jest.fn(),
    };

    mockContext = {
      getSelfE2EEJid: jest.fn<any>().mockReturnValue("self.0@msgr"),
      requireE2EESocket: jest.fn<any>().mockReturnValue(mockSocket),
      e2eeService: {
        getClient: jest.fn<any>().mockReturnValue(mockE2EEClient),
      } as any,
      e2eeHandler: mockE2EEHandler,
      outgoingE2EECache: mockCache,
    } as any;
  });

  it("should encrypt and fanout message for DM", async () => {
    const threadId = "peer.0@msgr";
    const text = "Hello E2EE";

    const msgId = await sendE2EETextAction(mockContext, threadId, text);

    expect(mockContext.getSelfE2EEJid).toHaveBeenCalled();
    expect(mockE2EEClient.buildDMTextFanoutPayloads).toHaveBeenCalledWith({
      toJid: threadId,
      selfJid: "self.0@msgr",
      text,
      isGroup: false,
      replyToId: undefined,
      replyToSenderJid: undefined,
    });
    expect(mockE2EEHandler.getDeviceList).toHaveBeenCalledWith([threadId, "self.0@msgr"]);
    expect(mockSocket.sendFrame).toHaveBeenCalled();
    expect(mockCache.remember).toHaveBeenCalled();
    
    // UUID should be string length > 0
    expect(typeof msgId).toBe("string");
    expect(msgId.length).toBeGreaterThan(5);
  });
});
