import { createHash } from 'crypto';
import { PrivateKey, PublicKey } from '@signalapp/libsignal-client';

/**
 * Facebook-specific Protocol Utilities
 * 
 * This module contains helpers for handling Facebook's variant of the Signal protocol,
 * including varint encoding/decoding, UUID manipulation, and signature spoofing.
 */

export interface FBProtobufSKMSG {
  id: number;
  iteration: number;
  ciphertext: Buffer;
}

export interface FBProtobufSKDM {
  chainId: number;
  iteration: number;
  chainKey: Buffer;
  signingPublicKey?: Buffer;
}

/**
 * Encodes a number into a varint (variable-length integer).
 * Uses arithmetic operations to safely handle large 32-bit unsigned integers.
 */
export function encodeVarint(v: number): Buffer {
  const res: number[] = [];
  while (v >= 0x80) {
    res.push((v % 128) | 0x80);
    v = Math.floor(v / 128);
  }
  res.push(v);
  return Buffer.from(res);
}

/**
 * Decodes a varint from a buffer at a given position.
 */
export function decodeVarint(buf: Buffer | Uint8Array, pos: number): { value: number; length: number } {
  let value = 0;
  let shift = 1;
  let length = 0;
  while (true) {
    const byte = buf[pos + length];
    if (byte === undefined) throw new Error("Unexpected EOF in varint");
    value += (byte & 0x7f) * shift;
    length++;
    if (!(byte & 0x80)) break;
    shift *= 128;
    if (length > 10) throw new Error("Varint too long");
  }
  return { value, length };
}

/**
 * Converts a 16-byte UUID buffer to a string.
 */
export function uuidStringify(buf: Buffer | Uint8Array): string {
  const hex = Buffer.from(buf).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

/**
 * Parses a UUID string into a 16-byte buffer.
 */
export function uuidParse(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

/**
 * Generates a deterministic Mock Private Key based on the sender's JID.
 * This is used to satisfy libsignal-client's signature requirements for FB messages.
 */
export function getMockPrivateKey(jid: string): PrivateKey {
  const hash = createHash('sha256').update(`MOCK_SIG_KEY:${jid}`).digest();
  return PrivateKey.deserialize(hash);
}

/**
 * Derives a stable distributionId (UUID) from a group and sender JID.
 * Facebook often lacks the distributionId in SKDM packets.
 */
export function stableDistributionId(groupJid: string, senderJid: string): string {
  const raw = `${groupJid}:${senderJid}`;
  const bytes = Buffer.alloc(16);
  for (let i = 0; i < raw.length && i < 16; i++) {
    bytes[i] = raw.charCodeAt(i) & 0xff;
  }
  // Set UUID version 4 markers (though it's not a real v4 UUID)
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return uuidStringify(bytes);
}

/**
 * Parses a Facebook-style Protobuf SKMSG.
 */
export function parseFBProtobufSKMSG(buf: Buffer): FBProtobufSKMSG | null {
  let pos = 0;
  let id = 0;
  let iteration = 0;
  let ciphertext = Buffer.alloc(0);

  try {
    while (pos < buf.length) {
      const { value: tagValue, length: tagLen } = decodeVarint(buf, pos);
      pos += tagLen;
      const field = tagValue >> 3;

      if (field === 1) { // id
        const { value, length } = decodeVarint(buf, pos);
        id = value;
        pos += length;
      } else if (field === 2) { // iteration
        const { value, length } = decodeVarint(buf, pos);
        iteration = value;
        pos += length;
      } else if (field === 3) { // ciphertext
        const { value, length } = decodeVarint(buf, pos);
        pos += length;
        ciphertext = buf.slice(pos, pos + value);
        pos += value;
      } else {
        // Skip unknown
        const tag = tagValue & 0x07;
        if (tag === 0) {
          const { length } = decodeVarint(buf, pos);
          pos += length;
        } else if (tag === 2) {
          const { value, length } = decodeVarint(buf, pos);
          pos += length + value;
        } else break;
      }
    }
    return { id, iteration, ciphertext };
  } catch (e) {
    return null;
  }
}

/**
 * Parses a Facebook-style Protobuf SKDM.
 */
export function parseFBProtobufSKDM(buf: Buffer): FBProtobufSKDM | null {
  let pos = 0;
  let chainId = 0;
  let iteration = 0;
  let chainKey = Buffer.alloc(0);
  let signingPublicKey: Buffer | undefined;

  try {
    while (pos < buf.length) {
      const { value: tagValue, length: tagLen } = decodeVarint(buf, pos);
      pos += tagLen;
      const field = tagValue >> 3;

      if (field === 1) {
        const { value, length } = decodeVarint(buf, pos);
        chainId = value;
        pos += length;
      } else if (field === 2) {
        const { value, length } = decodeVarint(buf, pos);
        iteration = value;
        pos += length;
      } else if (field === 3) {
        const { value, length } = decodeVarint(buf, pos);
        pos += length;
        chainKey = buf.slice(pos, pos + value);
        pos += value;
      } else if (field === 4) {
        const { value, length } = decodeVarint(buf, pos);
        pos += length;
        signingPublicKey = buf.slice(pos, pos + value);
        pos += value;
      } else {
        const tag = tagValue & 0x07;
        if (tag === 0) {
          const { length } = decodeVarint(buf, pos);
          pos += length;
        } else if (tag === 2) {
          const { value, length } = decodeVarint(buf, pos);
          pos += length + value;
        } else break;
      }
    }
    return { chainId, iteration, chainKey, signingPublicKey };
  } catch (e) {
    return null;
  }
}

/**
 * Re-encodes a Facebook-style SenderKeyMessage into a standard Signal Protobuf.
 * FB messages often lack a signature and use a different tag structure.
 */
export function wrapAsSignalSKMSG(params: {
  distributionId: string;
  id: number;
  iteration: number;
  ciphertext: Buffer;
  senderJid: string;
}): Buffer {
  const { distributionId, id, iteration, ciphertext, senderJid } = params;
  
  const uuidBuf = uuidParse(distributionId);
  const protoChunks = [
    Buffer.from([0x0a, 0x10]), uuidBuf,            // Tag 1 (distributionId)
    Buffer.from([0x10]), encodeVarint(id),        // Tag 2 (id)
    Buffer.from([0x18]), encodeVarint(iteration), // Tag 3 (iteration)
    Buffer.from([0x22]), encodeVarint(ciphertext.length), ciphertext, // Tag 4 (ct)
  ];
  
  const protobuf = Buffer.concat(protoChunks);
  const header = Buffer.from([0x33]); // Protocol version
  const toSign = Buffer.concat([header, protobuf]);
  
  // Sign using our deterministic Mock Key
  const privKey = getMockPrivateKey(senderJid);
  const signature = privKey.sign(toSign);
  
  return Buffer.concat([toSign, signature]);
}
