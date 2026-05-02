import { BinaryDecoder, unmarshal, type Node, BinaryToken, encodePresenceAvailable, encodeKeepAlive, encodeSetPassive, encodePrimingNode, encodeIQ, encodePreKeyUpload, buildUnifiedSessionId, encodeNode, marshal } from "../../../src/e2ee/transport/binary/wa-binary.ts";

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

  describe("stanza encoders", () => {
    it("round-trips presence, keepalive, and passive stanzas", () => {
      expect(unmarshal(encodePresenceAvailable("false"))).toMatchObject({
        tag: "presence",
        attrs: { type: "available", passive: "false" },
      });

      expect(unmarshal(encodeKeepAlive("ka-1"))).toMatchObject({
        tag: "iq",
        attrs: { id: "ka-1", type: "get", xmlns: "w:p" },
      });

      const passive = unmarshal(encodeSetPassive("passive-1", false));
      expect(passive).toMatchObject({ tag: "iq", attrs: { id: "passive-1", type: "set", xmlns: "passive" } });
      expect((passive.content as Node[])[0]!.tag).toBe("active");
    });

    it("builds deterministic unified session IDs within the weekly bucket", () => {
      const id = buildUnifiedSessionId(10_000, 2_000);
      expect(id).toBe(String((10_000 + 2_000 + 3 * 24 * 60 * 60 * 1000) % (7 * 24 * 60 * 60 * 1000)));
    });



    it("round-trips priming and generic IQ stanzas", () => {
      const priming = unmarshal(encodePrimingNode("session-1"));
      expect(priming.tag).toBe("ib");
      expect(priming.attrs).toEqual({});
      expect(priming.content).toEqual([
        { tag: "unified_session", attrs: { id: "session-1" }, content: undefined },
        { tag: "offline", attrs: {}, content: undefined },
        { tag: "dirty", attrs: { type: "account_sync" }, content: undefined },
      ]);

      const iq = unmarshal(encodeIQ({ id: "iq-1", to: "s.whatsapp.net", type: "get", xmlns: "encrypt" }, [
        encodeNode("count", {}, undefined),
      ]));
      expect(iq).toMatchObject({ tag: "iq", attrs: { id: "iq-1", type: "get", xmlns: "encrypt" } });
      expect((iq.content as Node[])[0]).toMatchObject({ tag: "count", attrs: {} });
    });

    it("encodes prekey upload IQ with registration, identity, signed prekey, and one-time prekeys", () => {
      const encoded = encodePreKeyUpload(0x01020304, Buffer.alloc(32, 1), {
        id: 0x0a0b0c,
        pubKey: Buffer.alloc(32, 2),
        signature: Buffer.alloc(64, 3),
      }, [
        { id: 1, pubKey: Buffer.alloc(32, 4) },
        { id: 2, pubKey: Buffer.alloc(32, 5) },
      ]);

      const iq = unmarshal(encoded);
      const children = iq.content as Node[];
      const registration = children.find(n => n.tag === "registration")!;
      const type = children.find(n => n.tag === "type")!;
      const identity = children.find(n => n.tag === "identity")!;
      const list = children.find(n => n.tag === "list")!;
      const skey = children.find(n => n.tag === "skey")!;

      expect(iq).toMatchObject({ tag: "iq", attrs: { to: "s.whatsapp.net", type: "set", xmlns: "encrypt" } });
      expect(registration.content).toEqual(Buffer.from([1, 2, 3, 4]));
      expect(type.content).toEqual(Buffer.from([0x05]));
      expect(identity.content).toEqual(Buffer.alloc(32, 1));
      expect((list.content as Node[])).toHaveLength(2);
      expect(((list.content as Node[])[0]!.content as Node[]).find(n => n.tag === "id")!.content).toEqual(Buffer.from([0, 0, 1]));
      expect((skey.content as Node[]).find(n => n.tag === "id")!.content).toEqual(Buffer.from([0x0a, 0x0b, 0x0c]));
      expect((skey.content as Node[]).find(n => n.tag === "signature")!.content).toEqual(Buffer.alloc(64, 3));
    });

    it("round-trips encoded nodes with Messenger JID attributes", () => {
      const node = unmarshal(marshal(encodeNode("message", { to: "100.160@msgr", participant: "200:5@msgr", id: "m1" }, Buffer.from("body"))));

      expect(node.tag).toBe("message");
      expect(node.attrs.to).toBe("100.160@msgr");
      expect(node.attrs.participant).toBe("200.5@msgr");
      expect(node.content).toEqual(Buffer.from("body"));
    });
  });

});
