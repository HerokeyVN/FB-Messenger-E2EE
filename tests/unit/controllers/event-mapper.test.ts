import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { EventEmitter } from "node:events";
import { EventMapper } from "../../../src/controllers/event-mapper.ts";
import { MediaService } from "../../../src/services/media.service.ts";
import { E2EEService } from "../../../src/services/e2ee.service.ts";

describe("EventMapper", () => {
  let eventBus: EventEmitter;
  let mediaService: MediaService;
  let e2eeService: E2EEService;
  let mapper: EventMapper;

  beforeEach(() => {
    eventBus = new EventEmitter();
    // Mock services
    mediaService = {
      normalizeAttachment: jest.fn().mockImplementation(item => item)
    } as any;
    e2eeService = {
      markConnected: jest.fn()
    } as any;
    mapper = new EventMapper(eventBus, mediaService, e2eeService);
  });

  it("should map a simple text message", (done) => {
    const raw = {
      type: "message",
      messageID: "mid.123",
      threadID: "1000",
      senderID: "1001",
      body: "hello world",
      timestamp: 1600000000000,
      attachments: []
    };

    eventBus.on("message", (data) => {
      expect(data.id).toBe("mid.123");
      expect(data.text).toBe("hello world");
      expect(data.senderId).toBe("1001");
      done();
    });

    mapper.emitMappedEvent(raw);
  });

  it("should map a message reply", (done) => {
    const raw = {
      type: "message_reply",
      messageID: "mid.reply",
      threadID: "1000",
      senderID: "1001",
      body: "replying",
      messageReply: {
        messageID: "mid.original",
        senderID: "1002",
        body: "original content"
      }
    };

    eventBus.on("message", (data) => {
      expect(data.replyTo).toBeDefined();
      expect(data.replyTo.messageId).toBe("mid.original");
      done();
    });

    mapper.emitMappedEvent(raw);
  });

  it("should map a message edit", (done) => {
    const raw = {
      type: "message_edit",
      messageID: "mid.123",
      threadID: "1000",
      newText: "edited text",
      editCount: 1
    };

    eventBus.on("messageEdit", (data) => {
      expect(data.newText).toBe("edited text");
      done();
    });

    mapper.emitMappedEvent(raw);
  });

  it("should map a reaction", (done) => {
    const raw = {
      type: "reaction",
      messageID: "mid.123",
      threadID: "1000",
      senderID: "1001",
      reaction: "👍"
    };

    eventBus.on("reaction", (data) => {
      expect(data.reaction).toBe("👍");
      expect(data.actorId).toBe("1001");
      done();
    });

    mapper.emitMappedEvent(raw);
  });

  it("should map typing status", (done) => {
    const raw = {
      type: "typ",
      threadID: "1000",
      from: "1001",
      isTyping: true
    };

    eventBus.on("typing", (data) => {
      expect(data.isTyping).toBe(true);
      expect(data.senderId).toBe("1001");
      done();
    });

    mapper.emitMappedEvent(raw);
  });

  it("should normalize E2EE message identity and omit empty optional fields", (done) => {
    eventBus.on("e2ee_message", (data) => {
      expect(data.id).toBe("7456191609143713633");
      expect(data.threadId).toBe("100042415119261");
      expect(data.chatJid).toBe("100042415119261.0@msgr");
      expect(data.senderJid).toBe("100042415119261.160@msgr");
      expect(data.senderId).toBe("100042415119261");
      expect(data.senderDeviceId).toBe(160);
      expect(data.isGroup).toBe(false);
      expect(data.kind).toBe("text");
      expect(data.text).toBe("Hehe");
      expect(Object.prototype.hasOwnProperty.call(data, "attachments")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(data, "mentions")).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(data, "replyTo")).toBe(false);
      done();
    });

    mapper.emitMappedEvent({
      type: "e2ee_message",
      data: {
        messageId: "7456191609143713633",
        chatJid: "100042415119261.160@msgr",
        senderJid: "100042415119261.160@msgr",
        kind: "text",
        text: "Hehe",
        timestampMs: 1777694609888,
      },
    });
  });

  it("should preserve group chat JID and sender device for E2EE group messages", (done) => {
    eventBus.on("e2ee_message", (data) => {
      expect(data.threadId).toBe("1805602490133470@g.us");
      expect(data.chatJid).toBe("1805602490133470@g.us");
      expect(data.senderJid).toBe("100042415119261.101@msgr");
      expect(data.senderId).toBe("100042415119261");
      expect(data.senderDeviceId).toBe(101);
      expect(data.isGroup).toBe(true);
      expect(data.kind).toBe("text");
      done();
    });

    mapper.emitMappedEvent({
      type: "e2ee_message",
      data: {
        messageId: "m1",
        chatJid: "1805602490133470@g.us",
        senderJid: "100042415119261.101@msgr",
        type: "text",
        text: "hello group",
      },
    });
  });

  it("should route E2EE decrypt failures through catch-all without unhandled error", (done) => {
    eventBus.on("event", (event) => {
      expect(event.type).toBe("error");
      expect(event.data.message).toContain("E2EE decrypt failed");
      done();
    });

    expect(() => mapper.emitMappedEvent({
      type: "e2ee_message",
      data: {
        type: "decryption_failed",
        chatJid: "1805602490133470@g.us",
        senderJid: "100042415119261.101@msgr",
        error: "missing sender key state",
      },
    })).not.toThrow();
  });


  it("should mark E2EE connected and emit both typed and catch-all events", (done) => {
    const seen: string[] = [];
    eventBus.on("e2ee_connected", () => seen.push("typed"));
    eventBus.on("event", (event) => {
      if (event.type !== "e2ee_connected") return;
      seen.push("catch-all");
      expect(e2eeService.markConnected).toHaveBeenCalledTimes(1);
      expect(seen).toEqual(["typed", "catch-all"]);
      done();
    });

    mapper.emitMappedEvent({ type: "e2eeConnected" });
  });

  it("should infer E2EE media kind and preserve optional payload fields", (done) => {
    eventBus.on("e2ee_message", (data) => {
      expect(data.kind).toBe("image");
      expect(data.media).toEqual({ type: "image", directPath: "/m" });
      expect(data.reaction).toBe("🔥");
      expect(data.targetId).toBe("mid.target");
      expect(data.fromMe).toBe(true);
      expect(data.replyTo).toEqual({ messageId: "mid.reply", senderId: "200" });
      done();
    });

    mapper.emitMappedEvent({
      type: "e2ee_message",
      data: {
        messageId: "mid.media",
        chatJid: "100.0@msgr",
        senderJid: "100.5@msgr",
        media: { type: "image", directPath: "/m" },
        emoji: "🔥",
        targetId: "mid.target",
        fromMe: true,
        replyToId: "mid.reply",
        replyToSenderJid: "200.9@msgr",
      },
    });
  });

  it("should emit typed error events when an error listener exists", (done) => {
    let catchAllSeen = false;
    eventBus.on("event", (event) => {
      if (event.type === "error") catchAllSeen = true;
    });
    eventBus.on("error", (data) => {
      expect(data.message).toBe("boom");
      expect(catchAllSeen).toBe(false);
      setImmediate(() => {
        expect(catchAllSeen).toBe(true);
        done();
      });
    });

    mapper.emit({ type: "error", data: { message: "boom" } });
  });

});
