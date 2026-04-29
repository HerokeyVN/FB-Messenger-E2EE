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
});
