import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { DGWHandler } from "../../../src/controllers/dgw-handler.ts";
import { EventMapper } from "../../../src/controllers/event-mapper.ts";

describe("DGWHandler", () => {
  let eventMapper: EventMapper;
  let handler: DGWHandler;

  beforeEach(() => {
    eventMapper = {
      emitMappedEvent: jest.fn(),
      emit: jest.fn()
    } as any;
    handler = new DGWHandler(eventMapper);
  });

  it("should handle a valid DGW frame with insertMessage", () => {
    const frame = {
      payloadJson: JSON.stringify({
        payload: JSON.stringify([
          5, "insertMessage", 
          "hello from dgw", // 0: text
          null, null,
          "123456", // 3: chatJid
          null,
          1600000000000, // 5: timestamp
          null, null,
          "mid.dgw.1", // 8: messageId
          null,
          "1001" // 10: senderJid
        ])
      })
    };

    handler.handleDGWFrame(frame as any);

    expect(eventMapper.emitMappedEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: "e2ee_message",
      data: expect.objectContaining({
        messageId: "mid.dgw.1",
        text: "hello from dgw"
      })
    }));
  });

  it("should ignore duplicate message IDs", () => {
    const frame = {
      payloadJson: JSON.stringify({
        payload: JSON.stringify([
          5, "insertMessage", "hello", null, null, "123", null, 123, null, null, "mid.dup", null, "100"
        ])
      })
    };

    handler.handleDGWFrame(frame as any);
    handler.handleDGWFrame(frame as any);

    expect(eventMapper.emitMappedEvent).toHaveBeenCalledTimes(1);
  });
});
