/**
 * E2EEService - extension point for end-to-end encrypted media operations.
 *
 * The JS/TS side of this bridge does NOT have a direct equivalent of the Go
 * whatsmeow library for E2EE upload/download.  fca-unofficial speaks to the
 * standard Messenger LightSpeed API (non-E2EE) only.
 *
 * This service therefore acts as a typed facade that:
 *  1. Documents the contract (what operations are expected, their inputs/outputs).
 *  2. Provides an extension point where a future native-addon or WASM layer
 *     can be plugged in (analogous to how bridge-go media_e2ee.go wraps whatsmeow).
 *  3. Exposes a guard so callers know E2EE is not yet connected.
 *
 * Concrete implementations can extend or replace this class.
 */

import type {
  E2EEDownloadOptions,
  E2EEDownloadResult,
  E2EESendAudioOptions,
  E2EESendDocumentOptions,
  E2EESendImageOptions,
  E2EESendStickerOptions,
  E2EESendVideoOptions,
  E2EEUploadResult,
} from "../models/e2ee.ts";
import type { E2EEClient } from "../e2ee/e2ee-client.ts";
import type { MediaUploadConfig } from "../models/media.ts";
import { MediaType, type MediaTypeKey } from "../e2ee/media-crypto.ts";

export class E2EEService {
  private _connected = false;
  private e2eeClient?: E2EEClient;
  private uploadConfig?: MediaUploadConfig;

  public setProvider(client: E2EEClient, uploadConfig: MediaUploadConfig): void {
    this.e2eeClient = client;
    this.uploadConfig = uploadConfig;
    this._connected = true;
  }

  public get isConnected(): boolean {
    return this._connected;
  }

  /** Called by an external E2EE provider when it establishes a connection. */
  public markConnected(): void {
    this._connected = true;
  }

  /** Called when the E2EE connection drops. */
  public markDisconnected(): void {
    this._connected = false;
  }

  public ensureEnabled(): void {
    if (!this._connected || !this.e2eeClient) {
      throw new Error("E2EE provider not connected");
    }
  }

  public getClient(): E2EEClient {
    this.ensureEnabled();
    return this.e2eeClient!;
  }

  // Typed implementations wrapping E2EEClient

  /**
   * Send an E2EE image. Requires a concrete provider implementation.
   * Mirrors bridge-go Client.SendE2EEImage.
   */
  public async sendImage(opts: E2EESendImageOptions): Promise<E2EEUploadResult> {
    this.ensureEnabled();
    await this.e2eeClient!.encryptAndUploadMedia(
      this.uploadConfig!,
      opts.data,
      "image",
      opts.mimeType || "image/jpeg"
    );
    // TODO: Send ConsumerApplication protobuf via Transport
    return {
      messageId: "mock-id",
      timestampMs: Date.now()
    };
  }

  /**
   * Send an E2EE video. Mirrors bridge-go Client.SendE2EEVideo.
   */
  public async sendVideo(opts: E2EESendVideoOptions): Promise<E2EEUploadResult> {
    this.ensureEnabled();
    await this.e2eeClient!.encryptAndUploadMedia(
      this.uploadConfig!,
      opts.data,
      "video",
      opts.mimeType || "video/mp4"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }

  /**
   * Send an E2EE audio/voice message. Mirrors bridge-go Client.SendE2EEAudio.
   */
  public async sendAudio(opts: E2EESendAudioOptions): Promise<E2EEUploadResult> {
    this.ensureEnabled();
    await this.e2eeClient!.encryptAndUploadMedia(
      this.uploadConfig!,
      opts.data,
      "audio",
      opts.mimeType || "audio/mp4"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }

  /**
   * Send an E2EE document/file. Mirrors bridge-go Client.SendE2EEDocument.
   */
  public async sendDocument(opts: E2EESendDocumentOptions): Promise<E2EEUploadResult> {
    this.ensureEnabled();
    await this.e2eeClient!.encryptAndUploadMedia(
      this.uploadConfig!,
      opts.data,
      "document",
      opts.mimeType || "application/octet-stream"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }

  /**
   * Send an E2EE sticker. Mirrors bridge-go Client.SendE2EESticker.
   */
  public async sendSticker(opts: E2EESendStickerOptions): Promise<E2EEUploadResult> {
    this.ensureEnabled();
    await this.e2eeClient!.encryptAndUploadMedia(
      this.uploadConfig!,
      opts.data,
      "image",
      opts.mimeType || "image/webp"
    );
    return { messageId: "mock-id", timestampMs: Date.now() };
  }

  /**
   * Download E2EE media by decrypting it with the provided keys.
   * Mirrors bridge-go Client.DownloadE2EEMedia.
   */
  public async downloadMedia(opts: E2EEDownloadOptions): Promise<E2EEDownloadResult> {
    this.ensureEnabled();
    // 1. Fetch encrypted payload from CDN
    const resp = await fetch(opts.directPath);
    if (!resp.ok) {
      throw new Error(`Failed to fetch media from CDN: ${resp.status}`);
    }
    const encryptedData = Buffer.from(await resp.arrayBuffer());

    // 2. Determine MediaTypeKey
    let type: MediaTypeKey;
    switch (opts.mediaType) {
      case "image": type = "image"; break;
      case "video": type = "video"; break;
      case "audio": type = "audio"; break;
      case "voice": type = "audio"; break;
      case "document": type = "document"; break;
      case "sticker": type = "image"; break; // stickers use IMAGE crypto
      default: type = "document"; break;
    }

    // 3. Decrypt
    const mediaKey = Buffer.from(opts.mediaKey, "base64");
    const fileSHA256 = Buffer.from(opts.mediaSha256, "base64");
    const fileEncSHA256 = opts.mediaEncSha256 ? Buffer.from(opts.mediaEncSha256, "base64") : undefined;

    const decrypted = this.e2eeClient!.decryptMedia({
      data: encryptedData,
      mediaKey,
      type: type,
      fileSHA256,
      fileEncSHA256
    });

    return {
      data: decrypted,
      mimeType: opts.mimeType || "application/octet-stream",
      fileSize: decrypted.length
    };
  }
}
