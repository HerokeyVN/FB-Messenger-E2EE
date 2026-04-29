import { encodeVarint, decodeVarint, uuidStringify, uuidParse, stableDistributionId } from "../../../src/e2ee/facebook-protocol-utils.ts";

describe("facebook-protocol-utils", () => {
  describe("varint", () => {
    it("should encode and decode simple values", () => {
      const v = 150;
      const buf = encodeVarint(v);
      const { value, length } = decodeVarint(buf, 0);
      expect(value).toBe(v);
      expect(length).toBe(buf.length);
    });

    it("should handle multi-byte varints", () => {
      const v = 1234567;
      const buf = encodeVarint(v);
      const { value, length } = decodeVarint(buf, 0);
      expect(value).toBe(v);
      expect(length).toBe(buf.length);
    });

    it("should throw on unexpected EOF", () => {
      const buf = Buffer.from([0x80, 0x80]); // Incomplete varint
      expect(() => decodeVarint(buf, 0)).toThrow("Unexpected EOF in varint");
    });
  });

  describe("uuid", () => {
    it("should stringify and parse UUIDs correctly", () => {
      const original = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
      const buf = uuidParse(original);
      expect(buf.length).toBe(16);
      const str = uuidStringify(buf);
      expect(str).toBe(original);
    });
  });

  describe("stableDistributionId", () => {
    it("should generate a stable UUID from group and sender", () => {
      const group = "12345@g.us";
      const sender = "67890@s.whatsapp.net";
      const id1 = stableDistributionId(group, sender);
      const id2 = stableDistributionId(group, sender);
      expect(id1).toBe(id2);
      expect(id1).toMatch(/^[0-9a-f-]{36}$/);
    });
  });
});
