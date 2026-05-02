import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { E2EEHandler } from "../../../src/controllers/e2ee-handler.ts";
import { EventMapper } from "../../../src/controllers/event-mapper.ts";
import { DeviceStore } from "../../../src/e2ee/store/device-store.ts";
import { unmarshal, type Node } from "../../../src/e2ee/transport/binary/wa-binary.ts";
import {
  encodeImageMessage,
  encodeMessageApplication,
  encodeMessageTransport,
  encodeRevokeMessage,
  encodeTextMessage,
} from "../../../src/e2ee/message/message-builder.ts";

const buildTransport = (consumerApplication: Buffer) => {
  const { messageApp } = encodeMessageApplication(consumerApplication);
  return encodeMessageTransport({ messageApp, padding: Buffer.from([1]) });
};

describe("E2EEHandler", () => {
  let eventMapper: EventMapper;
  let socket: any;
  let store: any;
  let handler: E2EEHandler;
  let logSpy: jest.SpiedFunction<typeof console.log>;
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    eventMapper = {
      emitMappedEvent: jest.fn(),
      emit: jest.fn()
    } as any;
    socket = {
      sendFrame: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as any)
    };
    store = { jidDevice: 1, registrationId: 1234 };
    handler = new E2EEHandler(
      eventMapper,
      () => socket,
      () => store
    );
  });

  afterEach(() => {
    logSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("should handle IQ ping", () => {
    const node = {
      tag: "iq",
      attrs: { id: "123", xmlns: "urn:xmpp:ping", type: "get", from: "s.whatsapp.net" },
      content: undefined
    };

    handler.handleIQ(node as any);

    expect(socket.sendFrame).toHaveBeenCalled();
    const mock = (socket.sendFrame as any);
    expect(mock.mock.calls[0][0]).toBeDefined();
  });

  it("should decrypt and emit normalized DM text messages", async () => {
    const plaintext = buildTransport(encodeTextMessage("hello"));
    const node = {
      tag: "message",
      attrs: { id: "mid.1", from: "1001.2@msgr", type: "chat" },
      content: [
        { tag: "enc", attrs: { v: "3", type: "msg" }, content: Buffer.from("ciphertext") }
      ]
    };
    const e2eeClient = {
      decryptDMMessage: jest.fn<(senderJid: string, ciphertext: Buffer) => Promise<Buffer>>().mockResolvedValue(plaintext as any)
    };

    await handler.handleEncryptedMessage(node as any, "self_id", e2eeClient as any);

    expect(e2eeClient.decryptDMMessage).toHaveBeenCalledWith("1001.2@msgr", Buffer.from("ciphertext"));
    expect(eventMapper.emitMappedEvent).toHaveBeenCalledWith({
      type: "e2ee_message",
      data: expect.objectContaining({
        kind: "text",
        text: "hello",
        messageId: "mid.1",
        senderJid: "1001.2@msgr",
        senderId: "1001",
      }),
    });
  });

  it("should normalize application-data revoke messages", async () => {
    const plaintext = buildTransport(encodeRevokeMessage("mid.remove", true));
    const node = {
      tag: "message",
      attrs: { id: "mid.revoke", from: "1001.2@msgr", type: "chat" },
      content: [
        { tag: "enc", attrs: { v: "3", type: "msg" }, content: Buffer.from("ciphertext") }
      ]
    };
    const e2eeClient = {
      decryptDMMessage: jest.fn<(senderJid: string, ciphertext: Buffer) => Promise<Buffer>>().mockResolvedValue(plaintext as any)
    };

    await handler.handleEncryptedMessage(node as any, "self_id", e2eeClient as any);

    expect(eventMapper.emitMappedEvent).toHaveBeenCalledWith({
      type: "e2ee_message",
      data: expect.objectContaining({
        kind: "revoke",
        targetId: "mid.remove",
        fromMe: true,
      }),
    });
  });

  it("should emit media messages after decoding the ConsumerApplication wrapper", async () => {
    const plaintext = buildTransport(encodeImageMessage({
      mimeType: "image/png",
      fileSHA256: Buffer.alloc(32, 1),
      fileLength: 10,
      mediaKey: Buffer.alloc(32, 2),
      fileEncSHA256: Buffer.alloc(32, 3),
      directPath: "/mms/image",
      caption: "photo caption",
    }));
    const node = {
      tag: "message",
      attrs: { id: "mid.image", from: "1001.2@msgr", type: "chat" },
      content: [
        { tag: "enc", attrs: { v: "3", type: "msg" }, content: Buffer.from("ciphertext") }
      ]
    };
    const e2eeClient = {
      decryptDMMessage: jest.fn<(senderJid: string, ciphertext: Buffer) => Promise<Buffer>>().mockResolvedValue(plaintext as any)
    };

    await handler.handleEncryptedMessage(node as any, "self_id", e2eeClient as any);

    expect(eventMapper.emitMappedEvent).toHaveBeenCalledWith({
      type: "e2ee_message",
      data: expect.objectContaining({
        kind: "image",
        media: expect.objectContaining({
          caption: expect.objectContaining({ text: "photo caption" }),
          image: expect.objectContaining({ version: 1 }),
        }),
      }),
    });
  });

  it("processes participant SKDM fanout before acknowledging a group message without main enc", async () => {
    const skdmBytes = Buffer.from("skdm-bytes");
    const participantTransport = encodeMessageTransport({
      padding: Buffer.from([1]),
      skdm: { groupId: "180@g.us", skdmBytes },
    });
    const node = {
      tag: "message",
      attrs: { id: "mid.skdm", from: "180@g.us", participant: "1001.2@msgr" },
      content: [
        {
          tag: "participants",
          attrs: {},
          content: [
            {
              tag: "to",
              attrs: { jid: "self:1@msgr" },
              content: [{ tag: "enc", attrs: { type: "msg" }, content: Buffer.from("participant-ciphertext") }],
            },
          ],
        },
      ],
    };
    const e2eeClient = {
      decryptDMMessage: jest.fn<(senderJid: string, ciphertext: Buffer) => Promise<Buffer>>().mockResolvedValue(participantTransport as any),
      processSenderKeyDistribution: jest.fn<(senderJid: string, skdm: Buffer, groupJid?: string) => Promise<void>>().mockResolvedValue(undefined),
    };

    await handler.handleEncryptedMessage(node as any, "self", e2eeClient as any);

    expect(e2eeClient.decryptDMMessage).toHaveBeenCalledWith("1001.2@msgr", Buffer.from("participant-ciphertext"));
    expect(e2eeClient.processSenderKeyDistribution).toHaveBeenCalledWith("1001.2@msgr", skdmBytes, "180@g.us");
    expect(unmarshal(socket.sendFrame.mock.calls.at(-1)![0] as Buffer)).toMatchObject({
      tag: "ack",
      attrs: { class: "message", id: "mid.skdm", to: "180@g.us", participant: "1001.2@msgr" },
    });
  });

  it("sends retry receipts for unavailable encrypted group messages", async () => {
    const node = {
      tag: "message",
      attrs: { id: "mid.unavailable", from: "180@g.us", participant: "1001.2@msgr", t: "123" },
      content: [{ tag: "unavailable", attrs: { type: "skmsg" } }],
    };

    await handler.handleEncryptedMessage(node as any, "self", {} as any);

    const receipt = unmarshal(socket.sendFrame.mock.calls[0][0] as Buffer);
    const ack = unmarshal(socket.sendFrame.mock.calls.at(-1)![0] as Buffer);
    expect(receipt).toMatchObject({
      tag: "receipt",
      attrs: { id: "mid.unavailable", to: "180@g.us", type: "retry", participant: "1001.2@msgr" },
    });
    const receiptChildren = receipt.content as Node[];
    expect(receiptChildren.find(n => n.tag === "retry")).toMatchObject({
      attrs: { count: "1", id: "mid.unavailable", t: "123", v: "1" },
    });
    expect(receiptChildren.find(n => n.tag === "registration")!.content).toEqual(Buffer.from([0, 0, 4, 210]));
    expect(ack).toMatchObject({
      tag: "ack",
      attrs: { class: "message", id: "mid.unavailable", to: "180@g.us", participant: "1001.2@msgr" },
    });
    expect(eventMapper.emitMappedEvent).toHaveBeenCalledWith({
      type: "e2ee_message",
      data: expect.objectContaining({
        type: "decryption_failed",
        error: "unavailable encrypted message: skmsg",
        messageId: "mid.unavailable",
      }),
    });
  });

  it("caps retry receipts per message", async () => {
    const node = {
      tag: "message",
      attrs: { id: "mid.retry-cap", from: "180@g.us", participant: "1001.2@msgr" },
      content: [{ tag: "unavailable", attrs: { type: "skmsg" } }],
    };

    await handler.handleEncryptedMessage(node as any, "self", {} as any);
    await handler.handleEncryptedMessage(node as any, "self", {} as any);
    await handler.handleEncryptedMessage(node as any, "self", {} as any);

    const sentNodes = socket.sendFrame.mock.calls.map((call: any[]) => unmarshal(call[0]));
    expect(sentNodes.filter((n: Node) => n.tag === "receipt")).toHaveLength(2);
    expect(sentNodes.filter((n: Node) => n.tag === "ack")).toHaveLength(3);
  });

  it("uploads fresh prekeys when encrypt notification reports a low count", async () => {
    store = await DeviceStore.memoryOnly();
    handler = new E2EEHandler(eventMapper, () => socket, () => store);

    await handler.handleNotification({
      tag: "notification",
      attrs: { type: "encrypt", from: "s.whatsapp.net" },
      content: [{ tag: "count", attrs: { value: "3" } }],
    } as any);

    const iq = unmarshal(socket.sendFrame.mock.calls[0][0] as Buffer);
    const children = iq.content as Node[];
    const list = children.find(n => n.tag === "list")!;
    expect(iq).toMatchObject({ tag: "iq", attrs: { to: "s.whatsapp.net", type: "set", xmlns: "encrypt" } });
    expect(children.find(n => n.tag === "registration")!.content).toHaveLength(4);
    expect(children.find(n => n.tag === "identity")!.content).toHaveLength(32);
    expect((list.content as Node[])).toHaveLength(50);
    expect(children.find(n => n.tag === "skey")).toBeDefined();
  });

});
