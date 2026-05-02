import { describe, it, expect } from "@jest/globals";
import { decryptMedia, encryptMedia, expandMediaKey, MmsType, sha256 } from "../../../src/e2ee/media/media-crypto.ts";

describe("media-crypto", () => {
  it("encrypts and decrypts media with verifiable hashes", () => {
    const plaintext = Buffer.from("hello encrypted media");
    const encrypted = encryptMedia(plaintext, "image");

    expect(encrypted.mediaKey.length).toBe(32);
    expect(encrypted.fileLength).toBe(plaintext.length);
    expect(encrypted.fileSHA256).toEqual(sha256(plaintext));
    expect(encrypted.fileEncSHA256).toEqual(sha256(encrypted.dataToUpload));

    const decrypted = decryptMedia({
      data: encrypted.dataToUpload,
      mediaKey: encrypted.mediaKey,
      type: "image",
      fileSHA256: encrypted.fileSHA256,
      fileEncSHA256: encrypted.fileEncSHA256,
    });
    expect(decrypted).toEqual(plaintext);
  });

  it("rejects tampered encrypted hashes before decryption", () => {
    const encrypted = encryptMedia(Buffer.from("payload"), "video");
    const badHash = Buffer.alloc(32, 1);

    expect(() => decryptMedia({
      data: encrypted.dataToUpload,
      mediaKey: encrypted.mediaKey,
      type: "video",
      fileEncSHA256: badHash,
    })).toThrow("Invalid media enc SHA256");
  });

  it("rejects invalid HMAC and too-short media payloads", () => {
    const encrypted = encryptMedia(Buffer.from("payload"), "audio");
    const tampered = Buffer.from(encrypted.dataToUpload);
    tampered[tampered.length - 1] = tampered[tampered.length - 1]! ^ 0xff;

    expect(() => decryptMedia({ data: tampered, mediaKey: encrypted.mediaKey, type: "audio" })).toThrow("Invalid media HMAC");
    expect(() => decryptMedia({ data: Buffer.alloc(10), mediaKey: encrypted.mediaKey, type: "audio" })).toThrow("Media data too short");
  });

  it("derives stable key sizes and maps MMS types", () => {
    const keys = expandMediaKey(Buffer.alloc(32, 7), "document");

    expect(keys.iv.length).toBe(16);
    expect(keys.cipherKey.length).toBe(32);
    expect(keys.macKey.length).toBe(32);
    expect(keys.refKey.length).toBe(32);
    expect(MmsType.audio).toBe("ptt");
    expect(MmsType.sticker).toBe("image");
  });
});
