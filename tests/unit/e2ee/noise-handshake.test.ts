import { createCipheriv, createDecipheriv, createHash, hkdfSync } from "node:crypto";
import { doHandshake, generateX25519, getX25519PublicKey, x25519DH, WA_HEADER } from "../../../src/e2ee/transport/noise/noise-handshake.ts";

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


const NOISE_START_PATTERN = Buffer.from("Noise_XX_25519_AESGCM_SHA256\0\0\0\0");

function sha256(data: Buffer): Buffer {
  return Buffer.from(createHash("sha256").update(data).digest());
}

class TestNoiseState {
  private h: Buffer;
  private ck: Buffer;
  private k: Buffer | null = null;
  private n = 0;

  constructor() {
    this.h = NOISE_START_PATTERN.length === 32 ? Buffer.from(NOISE_START_PATTERN) : sha256(NOISE_START_PATTERN);
    this.ck = this.h;
    this.mixHash(WA_HEADER);
  }

  mixHash(data: Buffer): void {
    this.h = sha256(Buffer.concat([this.h, data]));
  }

  mixKey(input: Buffer): void {
    const expanded = Buffer.from(hkdfSync("sha256", input, this.ck, "", 64));
    this.ck = expanded.subarray(0, 32);
    this.k = expanded.subarray(32, 64);
    this.n = 0;
  }

  mixSharedSecretIntoKey(priv: Buffer, pub: Buffer): void {
    this.mixKey(x25519DH(priv, pub));
  }

  encrypt(plaintext: Buffer): Buffer {
    if (!this.k) throw new Error("missing key");
    const nonce = Buffer.alloc(12);
    nonce.writeUInt32BE(this.n++, 8);
    const cipher = createCipheriv("aes-256-gcm", this.k, nonce);
    cipher.setAAD(this.h);
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    this.mixHash(encrypted);
    return encrypted;
  }

  decrypt(ciphertext: Buffer): Buffer {
    if (!this.k) throw new Error("missing key");
    const nonce = Buffer.alloc(12);
    nonce.writeUInt32BE(this.n++, 8);
    const body = ciphertext.subarray(0, -16);
    const tag = ciphertext.subarray(-16);
    const decipher = createDecipheriv("aes-256-gcm", this.k, nonce);
    decipher.setAAD(this.h);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(body), decipher.final()]);
    this.mixHash(ciphertext);
    return plaintext;
  }

  finish(): { clientSendKey: Buffer; clientRecvKey: Buffer } {
    const expanded = Buffer.from(hkdfSync("sha256", Buffer.alloc(0), this.ck, Buffer.alloc(0), 64));
    return { clientSendKey: expanded.subarray(0, 32), clientRecvKey: expanded.subarray(32, 64) };
  }
}

function encVarint(n: number): Buffer {
  const bytes: number[] = [];
  let v = n >>> 0;
  while (v > 127) {
    bytes.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  bytes.push(v);
  return Buffer.from(bytes);
}

function encLenDelim(field: number, data: Buffer): Buffer {
  return Buffer.concat([encVarint((field << 3) | 2), encVarint(data.length), data]);
}

function decodeLenDelim(data: Buffer, targetField: number): Buffer {
  let pos = 0;
  while (pos < data.length) {
    const tag = data[pos++]!;
    const field = tag >> 3;
    const wire = tag & 0x07;
    if (wire !== 2) throw new Error(`unexpected wire ${wire}`);
    let len = 0;
    let shift = 0;
    while (true) {
      const b = data[pos++]!;
      len |= (b & 0x7f) << shift;
      if (!(b & 0x80)) break;
      shift += 7;
    }
    const value = data.subarray(pos, pos + len);
    pos += len;
    if (field === targetField) return Buffer.from(value);
  }
  throw new Error(`field ${targetField} not found`);
}

function prependLength(data: Buffer): Buffer {
  const header = Buffer.alloc(3);
  header.writeUIntBE(data.length, 0, 3);
  return Buffer.concat([header, data]);
}

function decryptAppFrame(frame: Buffer, key: Buffer, counter: number): Buffer {
  const len = frame.readUIntBE(0, 3);
  const payload = frame.subarray(3, 3 + len);
  const body = payload.subarray(0, -16);
  const tag = payload.subarray(-16);
  const nonce = Buffer.alloc(12);
  nonce.writeBigUInt64BE(BigInt(counter), 4);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]);
}

function encryptAppPayload(plaintext: Buffer, key: Buffer, counter: number): Buffer {
  const nonce = Buffer.alloc(12);
  nonce.writeBigUInt64BE(BigInt(counter), 4);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  return Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
}

class FakeNoiseWebSocket {
  public sent: Buffer[] = [];
  public clientPayload: Buffer | null = null;
  public keys: { clientSendKey: Buffer; clientRecvKey: Buffer } | null = null;
  public closed = false;
  private inbound: Buffer[] = [];
  private readonly serverEphemeral = generateX25519();
  private readonly serverStatic = generateX25519();
  private readonly state = new TestNoiseState();

  send(data: Buffer): void {
    this.sent.push(Buffer.from(data));
    if (this.sent.length === 2) this.processClientFinish(data);
  }

  async readRaw(len?: number): Promise<Buffer> {
    if (this.inbound.length === 0) this.enqueueServerHello();
    const chunk = this.inbound.shift();
    if (!chunk) throw new Error("no inbound data");
    if (len !== undefined) expect(chunk).toHaveLength(len);
    return chunk;
  }

  close(): void {
    this.closed = true;
  }

  enqueueServerAppFrame(plaintext: Buffer): void {
    if (!this.keys) throw new Error("handshake keys not ready");
    const encrypted = encryptAppPayload(plaintext, this.keys.clientRecvKey, 0);
    const header = Buffer.alloc(3);
    header.writeUIntBE(encrypted.length, 0, 3);
    this.inbound.push(header, encrypted);
  }

  private enqueueServerHello(): void {
    const first = this.sent[0];
    if (!first) throw new Error("client hello not sent");
    expect(first.subarray(0, 4)).toEqual(WA_HEADER);
    const clientHelloLen = first.readUIntBE(4, 3);
    const clientHello = first.subarray(7, 7 + clientHelloLen);
    const hello = decodeLenDelim(clientHello, 2);
    const clientEphemeral = decodeLenDelim(hello, 1);

    this.state.mixHash(clientEphemeral);
    this.state.mixHash(this.serverEphemeral.pub);
    this.state.mixSharedSecretIntoKey(this.serverEphemeral.priv, clientEphemeral);
    const encryptedStatic = this.state.encrypt(this.serverStatic.pub);
    this.state.mixSharedSecretIntoKey(this.serverStatic.priv, clientEphemeral);
    const encryptedCert = this.state.encrypt(Buffer.from("test-cert"));

    const serverHello = Buffer.concat([
      encLenDelim(1, this.serverEphemeral.pub),
      encLenDelim(2, encryptedStatic),
      encLenDelim(3, encryptedCert),
    ]);
    const frame = prependLength(encLenDelim(3, serverHello));
    this.inbound.push(frame.subarray(0, 3), frame.subarray(3));
  }

  private processClientFinish(frame: Buffer): void {
    const finishPayload = frame.subarray(3);
    const finish = decodeLenDelim(finishPayload, 4);
    const encryptedStatic = decodeLenDelim(finish, 1);
    const encryptedPayload = decodeLenDelim(finish, 2);
    const clientStatic = this.state.decrypt(encryptedStatic);
    this.state.mixSharedSecretIntoKey(this.serverEphemeral.priv, clientStatic);
    this.clientPayload = this.state.decrypt(encryptedPayload);
    this.keys = this.state.finish();
  }
}

describe("noise-handshake integration", () => {
  it("performs a full Noise XX handshake and returns an encrypted frame socket", async () => {
    const ws = new FakeNoiseWebSocket();
    const noiseKey = generateX25519();
    const clientPayload = Buffer.from("client-payload");

    const result = await doHandshake(ws as any, noiseKey.priv, clientPayload);

    expect(ws.sent).toHaveLength(2);
    expect(ws.sent[0]!.subarray(0, 4)).toEqual(WA_HEADER);
    expect(ws.sent[1]!.subarray(0, 4)).not.toEqual(WA_HEADER);
    expect(ws.clientPayload).toEqual(clientPayload);
    expect(ws.keys).not.toBeNull();

    await result.socket.sendFrame(Buffer.from("ping"));
    expect(ws.sent).toHaveLength(3);
    expect(decryptAppFrame(ws.sent[2]!, ws.keys!.clientSendKey, 0)).toEqual(Buffer.from("ping"));

    ws.enqueueServerAppFrame(Buffer.from("pong"));
    await expect(result.socket.readFrame()).resolves.toEqual(Buffer.from("pong"));

    result.socket.close();
    expect(ws.closed).toBe(true);
  });
});
