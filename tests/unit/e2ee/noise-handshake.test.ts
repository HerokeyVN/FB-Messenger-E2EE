import { generateX25519, getX25519PublicKey, x25519DH, WA_HEADER } from "../../../src/e2ee/noise-handshake.ts";

describe("noise-handshake", () => {
  describe("X25519 helpers", () => {
    it("should generate valid X25519 keys", () => {
      const { priv, pub } = generateX25519();
      expect(priv.length).toBe(32);
      expect(pub.length).toBe(32);
    });

    it("should derive public key from private key", () => {
      const { priv, pub } = generateX25519();
      const derivedPub = getX25519PublicKey(priv);
      expect(derivedPub.toString("hex")).toBe(pub.toString("hex"));
    });

    it("should perform Diffie-Hellman exchange", () => {
      const alice = generateX25519();
      const bob = generateX25519();

      const secret1 = x25519DH(alice.priv, bob.pub);
      const secret2 = x25519DH(bob.priv, alice.pub);

      expect(secret1.length).toBe(32);
      expect(secret1.toString("hex")).toBe(secret2.toString("hex"));
    });
  });

  describe("Constants", () => {
    it("should have the correct WA_HEADER", () => {
      expect(WA_HEADER).toEqual(Buffer.from([87, 65, 6, 3]));
    });
  });
});
