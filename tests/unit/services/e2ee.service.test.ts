import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import { E2EEService } from "../../../src/services/e2ee.service.ts";
import { decryptMedia, encryptMedia } from "../../../src/e2ee/media/media-crypto.ts";
import type { MediaUploadConfig } from "../../../src/models/media.ts";

const uploadConfig: MediaUploadConfig = { host: "upload.example", auth: "auth-token" };

const createProvider = () => ({
  encryptAndUploadMedia: jest.fn<(config: MediaUploadConfig, data: Buffer, type: string, mimeType: string) => Promise<unknown>>()
    .mockResolvedValue({ directPath: "/m" }),
  decryptMedia: jest.fn((opts: Parameters<typeof decryptMedia>[0]) => decryptMedia(opts)),
});

describe("E2EEService", () => {
  const originalFetch = globalThis.fetch;
  let service: E2EEService;
  let provider: ReturnType<typeof createProvider>;

  beforeEach(() => {
    service = new E2EEService();
    provider = createProvider();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("guards access until a provider is connected", () => {
    expect(service.isConnected).toBe(false);
    expect(() => service.ensureEnabled()).toThrow("E2EE provider not connected");

    service.markConnected();
    expect(() => service.getClient()).toThrow("E2EE provider not connected");
  });

  it("stores the provider and exposes connection state", () => {
    service.setProvider(provider as any, uploadConfig);

    expect(service.isConnected).toBe(true);
    expect(service.getClient()).toBe(provider);

    service.markDisconnected();
    expect(service.isConnected).toBe(false);
    expect(() => service.ensureEnabled()).toThrow("E2EE provider not connected");
  });

  it.each([
    ["sendImage", "image", "image/jpeg", { data: Buffer.from("image") }],
    ["sendVideo", "video", "video/mp4", { data: Buffer.from("video") }],
    ["sendAudio", "audio", "audio/ogg; codecs=opus", { data: Buffer.from("audio") }],
    ["sendDocument", "document", "application/octet-stream", { data: Buffer.from("doc") }],
    ["sendSticker", "image", "image/webp", { data: Buffer.from("sticker") }],
  ] as const)("%s encrypts and uploads media with the expected defaults", async (method, type, mimeType, opts) => {
    service.setProvider(provider as any, uploadConfig);

    const result = await (service[method] as any)(opts);

    expect(provider.encryptAndUploadMedia).toHaveBeenCalledWith(uploadConfig, opts.data, type, mimeType);
    expect(result.messageId).toBe("mock-id");
    expect(typeof result.timestampMs).toBe("number");
  });

  it("downloads and decrypts media using the selected media type", async () => {
    const plaintext = Buffer.from("voice payload");
    const encrypted = encryptMedia(plaintext, "audio");
    globalThis.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(encrypted.dataToUpload.buffer.slice(
        encrypted.dataToUpload.byteOffset,
        encrypted.dataToUpload.byteOffset + encrypted.dataToUpload.byteLength,
      )),
    })) as any;
    service.setProvider(provider as any, uploadConfig);

    const result = await service.downloadMedia({
      directPath: "https://cdn.example/media",
      mediaKey: encrypted.mediaKey.toString("base64"),
      mediaSha256: encrypted.fileSHA256.toString("base64"),
      mediaEncSha256: encrypted.fileEncSHA256.toString("base64"),
      mediaType: "voice",
      mimeType: "audio/ogg",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("https://cdn.example/media");
    expect(provider.decryptMedia).toHaveBeenCalledWith(expect.objectContaining({ type: "audio" }));
    expect(result).toEqual({ data: plaintext, mimeType: "audio/ogg", fileSize: plaintext.length });
  });

  it("throws when media download fails", async () => {
    globalThis.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 403 })) as any;
    service.setProvider(provider as any, uploadConfig);

    await expect(service.downloadMedia({
      directPath: "https://cdn.example/forbidden",
      mediaKey: Buffer.alloc(32).toString("base64"),
      mediaSha256: Buffer.alloc(32).toString("base64"),
      mediaType: "document",
    })).rejects.toThrow("Failed to fetch media from CDN: 403");
  });
});
