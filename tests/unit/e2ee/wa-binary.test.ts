import { BinaryDecoder, unmarshal, type Node, BinaryToken } from "../../../src/e2ee/transport/binary/wa-binary.ts";

describe("wa-binary", () => {
  describe("unmarshal", () => {
    it("should throw error on empty data", () => {
      expect(() => unmarshal(Buffer.alloc(0))).toThrow("Empty data in unmarshal");
    });

    it("should unmarshal a simple node", () => {
      // 0 = uncompressed, 248 1 = list of size 1, 3 = "s.whatsapp.net" token
      const data = Buffer.from([0, 248, 1, 3]);
      const node = unmarshal(data);
      expect(node.tag).toBe("s.whatsapp.net");
      expect(node.attrs).toEqual({});
    });
  });

  describe("BinaryDecoder", () => {
    it("should read dictionary tokens correctly", () => {
      const data = Buffer.from([BinaryToken.Dictionary0, 1]);
      const decoder = new BinaryDecoder(data);
      // This depends on what's in Dictionary0, but we can at least check it doesn't throw
      expect(() => decoder.readString(decoder.readByte())).not.toThrow();
    });

    it("should read JID pairs correctly", () => {
      // JIDPair token, then user string, then server string
      const data = Buffer.from([250, 252, 4, 117, 115, 101, 114, 3]); // user="user", server="s.whatsapp.net"
      const decoder = new BinaryDecoder(data);
      expect(decoder.read(true)).toBe("user@s.whatsapp.net");
    });

    it("should read FBJID correctly", () => {
      // FBJID token, user, device(u16), server
      const data = Buffer.from([246, 252, 4, 117, 115, 101, 114, 0, 10, 3]); // user="user", device=10, server="s.whatsapp.net"
      const decoder = new BinaryDecoder(data);
      expect(decoder.read(true)).toBe("user.10@s.whatsapp.net");
    });
    
    it("should read packed8 nibbles correctly", () => {
      // Nibble8 token, len byte (MSB=0 means even), packed nibbles
      const data = Buffer.from([255, 2, 0x12, 0x34]); // "1234"
      const decoder = new BinaryDecoder(data);
      expect(decoder.read(true)).toBe("1234");
    });
  });
});
