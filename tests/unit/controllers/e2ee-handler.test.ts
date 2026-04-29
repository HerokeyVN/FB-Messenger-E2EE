import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { E2EEHandler } from "../../../src/controllers/e2ee-handler.ts";
import { EventMapper } from "../../../src/controllers/event-mapper.ts";

describe("E2EEHandler", () => {
  let eventMapper: EventMapper;
  let socket: any;
  let store: any;
  let handler: E2EEHandler;

  beforeEach(() => {
    eventMapper = {
      emitMappedEvent: jest.fn(),
      emit: jest.fn()
    } as any;
    socket = {
      sendFrame: jest.fn<() => Promise<void>>().mockResolvedValue(undefined as any)
    };
    store = {};
    handler = new E2EEHandler(
      eventMapper,
      () => socket,
      () => store
    );
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

  it("should handle encrypted message (DM)", async () => {
    const node = {
      tag: "message",
      attrs: { id: "mid.1", from: "1001@msgr", type: "chat" },
      content: [
        { tag: "enc", attrs: { v: "3", type: "msg" }, content: Buffer.from("ciphertext") }
      ]
    };

    const e2eeClient = {
      decryptDMMessage: jest.fn<() => Promise<Buffer>>().mockResolvedValue(Buffer.from("decrypted_data") as any)
    };
    
    try {
      await handler.handleEncryptedMessage(node as any, "self_id", e2eeClient as any);
    } catch (e) {
      // Ignore decoding errors
    }

    expect(e2eeClient.decryptDMMessage).toHaveBeenCalled();
  });
});
