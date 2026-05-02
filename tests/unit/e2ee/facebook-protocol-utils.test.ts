import {
  decodeVarint,
  encodeVarint,
  parseFBProtobufSKDM,
  parseFBProtobufSKMSG,
  stableDistributionId,
  uuidParse,
  uuidStringify,
  wrapAsSignalSKMSG,
} from "../../../src/e2ee/facebook/facebook-protocol-utils.ts";

const fieldVarint = (field: number, value: number) => Buffer.concat([
  encodeVarint((field << 3) | 0),
  encodeVarint(value),
]);

const fieldBytes = (field: number, value: Buffer) => Buffer.concat([
  encodeVarint((field << 3) | 2),
  encodeVarint(value.length),
  value,
]);

describe("facebook-protocol-utils", () => {
  describe("varint", () => {
    it.each([0, 1, 127, 128, 150, 255, 16_384, 1_234_567, 0xffffffff])(
      "round-trips %i",
      (value) => {
        const buf = encodeVarint(value);
        const decoded = decodeVarint(Buffer.concat([Buffer.from([0xaa]), buf]), 1);
        expect(decoded.value).toBe(value);
        expect(decoded.length).toBe(buf.length);
      },
    );

    it("should throw on unexpected EOF", () => {
      const buf = Buffer.from([0x80, 0x80]);
      expect(() => decodeVarint(buf, 0)).toThrow("Unexpected EOF in varint");
    });

    it("should throw on overlong varints", () => {
      expect(() => decodeVarint(Buffer.alloc(11, 0x80), 0)).toThrow("Varint too long");
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

    it("stableDistributionId should be deterministic and look like a v4 UUID", () => {
      const group = "12345@g.us";
      const sender = "67890@s.whatsapp.net";
      const id1 = stableDistributionId(group, sender);
      const id2 = stableDistributionId(group, sender);
      const other = stableDistributionId(group, "11111@s.whatsapp.net");

      expect(id1).toBe(id2);
      expect(id1).not.toBe(other);
      expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    });
  });

  describe("Facebook protobuf SKMSG/SKDM", () => {
    it("parses SKMSG and skips unknown varint/bytes fields", () => {
      const ciphertext = Buffer.from("ciphertext");
      const encoded = Buffer.concat([
        fieldVarint(9, 1),
        fieldBytes(10, Buffer.from("skip")),
        fieldVarint(1, 42),
        fieldVarint(2, 7),
        fieldBytes(3, ciphertext),
      ]);

      expect(parseFBProtobufSKMSG(encoded)).toEqual({
        id: 42,
        iteration: 7,
        ciphertext,
      });
    });

    it("returns null for malformed SKMSG length prefixes", () => {
      expect(parseFBProtobufSKMSG(Buffer.from([0x1a, 0x80]))).toBeNull();
    });

    it("parses SKDM with optional signing public key", () => {
      const chainKey = Buffer.alloc(32, 1);
      const signingPublicKey = Buffer.alloc(33, 2);
      const encoded = Buffer.concat([
        fieldVarint(1, 123),
        fieldVarint(2, 456),
        fieldBytes(3, chainKey),
        fieldBytes(4, signingPublicKey),
        fieldBytes(12, Buffer.from("unknown")),
      ]);

      expect(parseFBProtobufSKDM(encoded)).toEqual({
        chainId: 123,
        iteration: 456,
        chainKey,
        signingPublicKey,
      });
    });

    it("returns null for malformed SKDM length prefixes", () => {
      expect(parseFBProtobufSKDM(Buffer.from([0x1a, 0x80]))).toBeNull();
    });
  });

  describe("wrapAsSignalSKMSG", () => {
    it("wraps FB sender-key message fields and appends deterministic signature", () => {
      const distributionId = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
      const ciphertext = Buffer.from("group-ciphertext");
      const wrapped = wrapAsSignalSKMSG({
        distributionId,
        id: 5,
        iteration: 9,
        ciphertext,
        senderJid: "100.1@msgr",
      });
      const signedPayloadLength = 1 + 18 + 2 + 2 + 2 + ciphertext.length;

      expect(wrapped).toHaveLength(signedPayloadLength + 64);
      expect(wrapped[0]).toBe(0x33);
      expect(wrapped.subarray(1, 19)).toEqual(Buffer.concat([Buffer.from([0x0a, 0x10]), uuidParse(distributionId)]));
      expect(wrapped.includes(ciphertext)).toBe(true);
      expect(wrapped.subarray(0, signedPayloadLength).includes(ciphertext)).toBe(true);
      expect(wrapped.subarray(signedPayloadLength)).toHaveLength(64);
    });
  });
});
