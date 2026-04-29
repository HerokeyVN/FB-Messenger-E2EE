/**
 * E2EE Media Crypto - Layer 4
 *
 * Implements the exact same AES-256-CBC + HMAC-SHA256 + HKDF scheme
 * used by whatsmeow (upload.go / download.go) for Messenger E2EE attachments.
 *
 * No Signal Protocol needed here - this is pure symmetric crypto.
 */

import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes, createHash } from "node:crypto";
import type { DecryptMediaOptions, EncryptMediaResult, MediaKeys } from "../models/media.ts";
export type { DecryptMediaOptions, EncryptMediaResult, MediaKeys };

// Media type -> HKDF info string (from whatsmeow/download.go)

export const MediaType = {
  image: "WhatsApp Image Keys",
  video: "WhatsApp Video Keys",
  audio: "WhatsApp Audio Keys",
  document: "WhatsApp Document Keys",
  sticker: "WhatsApp Image Keys",       // same as image
  history: "WhatsApp History Keys",
  appstate: "WhatsApp App State Keys",
} as const;

export type MediaTypeKey = keyof typeof MediaType;

// MMS type strings used in upload/download URLs (from whatsmeow/download.go)
export const MmsType: Record<MediaTypeKey, string> = {
  image: "image",
  video: "video",
  audio: "ptt",      // Messenger only allows PTT (push-to-talk), not generic audio
  document: "document",
  sticker: "image",
  history: "md-msg-hist",
  appstate: "md-app-state",
};

// Key derivation


/**
 * HKDF-SHA256 expand of mediaKey into iv + cipherKey + macKey + refKey (112 bytes total).
 * Mirrors whatsmeow getMediaKeys() in download.go:319.
 */
export function expandMediaKey(mediaKey: Buffer, type: MediaTypeKey): MediaKeys {
  const info = MediaType[type];
  const expanded = Buffer.from(
    hkdfSync("sha256", mediaKey, Buffer.alloc(0), info, 112),
  );
  return {
    iv: expanded.subarray(0, 16),
    cipherKey: expanded.subarray(16, 48),
    macKey: expanded.subarray(48, 80),
    refKey: expanded.subarray(80, 112),
  };
}

// Encrypt


/**
 * Encrypt media for upload.
 * Mirrors whatsmeow Upload() in upload.go:69.
 */
export function encryptMedia(plaintext: Buffer, type: MediaTypeKey): EncryptMediaResult {
  const mediaKey = randomBytes(32);
  const { iv, cipherKey, macKey } = expandMediaKey(mediaKey, type);

  // AES-256-CBC
  const cipher = createCipheriv("aes-256-cbc", cipherKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

  // HMAC-SHA256(macKey, iv ‖ ciphertext), take first 10 bytes
  const mac = createHmac("sha256", macKey)
    .update(iv)
    .update(ciphertext)
    .digest()
    .subarray(0, 10);

  const dataToUpload = Buffer.concat([ciphertext, mac]);

  return {
    mediaKey,
    fileSHA256: Buffer.from(createHash("sha256").update(plaintext).digest()),
    fileEncSHA256: Buffer.from(createHash("sha256").update(dataToUpload).digest()),
    fileLength: plaintext.length,
    dataToUpload,
  };
}

// Decrypt

const MEDIA_MAC_LENGTH = 10;

/**
 * Decrypt downloaded E2EE media.
 * Mirrors whatsmeow downloadAndDecrypt() in download.go:289.
 */
export function decryptMedia(opts: DecryptMediaOptions): Buffer {
  const { data, mediaKey, type, fileSHA256: expectedFileSHA256, fileEncSHA256: expectedFileEncSHA256 } = opts;

  if (data.length <= MEDIA_MAC_LENGTH) {
    throw new Error(`Media data too short (${data.length} bytes)`);
  }

  // Optional: verify encrypted SHA256 (checksum of entire downloaded blob)
  if (expectedFileEncSHA256) {
    const actual = createHash("sha256").update(data).digest();
    if (!actual.equals(expectedFileEncSHA256)) {
      throw new Error("Invalid media enc SHA256 - data corrupted or tampered");
    }
  }

  const ciphertext = data.subarray(0, -MEDIA_MAC_LENGTH);
  const mac = data.subarray(-MEDIA_MAC_LENGTH);

  const { iv, cipherKey, macKey } = expandMediaKey(mediaKey, type);

  // Verify HMAC
  const expectedMac = createHmac("sha256", macKey)
    .update(iv)
    .update(ciphertext)
    .digest()
    .subarray(0, MEDIA_MAC_LENGTH);

  if (!expectedMac.equals(mac)) {
    throw new Error("Invalid media HMAC - data corrupted or wrong key");
  }

  // AES-256-CBC decrypt
  const decipher = createDecipheriv("aes-256-cbc", cipherKey, iv);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  // Optional: verify plaintext SHA256
  if (expectedFileSHA256) {
    const actual = createHash("sha256").update(plaintext).digest();
    if (!actual.equals(expectedFileSHA256)) {
      throw new Error("Invalid media SHA256 - file corrupted after decryption");
    }
  }

  return plaintext;
}

// Helpers

/** SHA256 helper */
export function sha256(data: Buffer): Buffer {
  return Buffer.from(createHash("sha256").update(data).digest());
}
