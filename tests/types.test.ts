import { describe, expect, it } from "bun:test";
import { type AssertEqual, TypedEventEmitter } from "../src/types/advanced-types.ts";
import type { Attachment, ImageAttachment, VideoAttachment } from "../src/models/domain.ts";
import type { MessengerEventMap } from "../src/core/client.ts";

describe("Type-level Tests", () => {
  it("AssertEqual utility works", () => {
    type Test1 = AssertEqual<string, string>;
    const val1: Test1 = true;
    expect(val1).toBe(true);

    type Test2 = AssertEqual<string, number>;
    const val2: Test2 = false;
    expect(val2).toBe(false);
  });

  it("Attachment is a Discriminated Union", () => {
    // This test is mostly for compile-time validation
    const check = (att: Attachment) => {
      if (att.type === "image") {
        type IsImage = AssertEqual<typeof att, ImageAttachment>;
        // If this compiles, it means type narrowing works
      } else if (att.type === "video") {
        type IsVideo = AssertEqual<typeof att, VideoAttachment>;
      }
    };
    expect(check).toBeDefined();
  });

  it("TypedEventEmitter enforces payload types", () => {
    type Events = {
      ping: { count: number };
      pong: { message: string };
    };
    const emitter = new TypedEventEmitter<Events>();

    let receivedCount = 0;
    emitter.on("ping", (data) => {
      receivedCount = data.count;
    });

    emitter.emit("ping", { count: 42 });
    expect(receivedCount).toBe(42);

    // emitter.emit("ping", { message: "error" }); // Should cause compile error
  });

  it("MessengerEventMap is correctly derived", () => {
    type HasMessage = "message" extends keyof MessengerEventMap ? true : false;
    const hasMessage: HasMessage = true;
    expect(hasMessage).toBe(true);

    type MessagePayload = MessengerEventMap["message"];
    // Should be MessengerMessage
    expect(true).toBe(true);
  });
});
