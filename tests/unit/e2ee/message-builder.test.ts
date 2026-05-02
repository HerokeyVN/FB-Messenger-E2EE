import { ProtoWriter } from "../../../src/e2ee/message/message-builder.ts";

describe("message-builder", () => {
  describe("ProtoWriter", () => {
    it("should encode varints correctly", () => {
      const writer = new ProtoWriter();
      writer.varint(1, 150); // Field 1, value 150
      // 1 << 3 | 0 = 8 (header)
      // 150 -> [0x96, 0x01] (varint)
      expect(writer.build()).toEqual(Buffer.from([0x08, 0x96, 0x01]));
    });

    it("should encode bigint varints correctly", () => {
      const writer = new ProtoWriter();
      writer.uint64_varint(2, 1234567890123456789n);
      const buf = writer.build();
      expect(buf[0]).toBe((2 << 3) | 0);
      expect(buf.length).toBeGreaterThan(5);
    });

    it("should encode strings/bytes correctly", () => {
      const writer = new ProtoWriter();
      writer.string(3, "test");
      // Header: (3 << 3) | 2 = 26 (0x1a)
      // Len: 4
      // Data: "test"
      expect(writer.build()).toEqual(Buffer.from([0x1a, 0x04, 116, 101, 115, 116]));
    });

    it("should encode booleans correctly", () => {
      const writer = new ProtoWriter();
      writer.bool(4, true);
      expect(writer.build()).toEqual(Buffer.from([(4 << 3) | 0, 0x01]));
    });

    it("should encode fixed64 correctly", () => {
      const writer = new ProtoWriter();
      writer.uint64(5, 0x0102030405060708n);
      expect(writer.build()).toEqual(Buffer.from([(5 << 3) | 1, 0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01]));
    });
  });
});
