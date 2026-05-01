import type {
  PreKeyRecord,
  SignedPreKeyRecord,
  KyberPreKeyRecord,
} from "@signalapp/libsignal-client";
import type { MediaTypeKey } from "../e2ee/media-crypto.ts";
import type { MmsTypeStr } from "./media.ts";

// Storage & Keys

export type ProtocolAddressStr = `${string}:${number}`;
export type SenderKeyId = `${ProtocolAddressStr}:${string}`;

export interface DeviceJSON {
  /** base64, 32 bytes - Noise handshake key */
  noise_key_priv: string;
  /** base64, 32 bytes - Signal identity key */
  identity_key_priv: string;
  /** base64, 32 bytes - Signal signed prekey */
  signed_pre_key_priv: string;
  signed_pre_key_id: number;
  /** base64, 64 bytes - Ed25519 sig of signed prekey by identity key */
  signed_pre_key_sig: string;
  registration_id: number;
  /** base64, 32 bytes */
  adv_secret_key: string;
  /** uuid v4 */
  facebook_uuid: string;
  jid_user?: string;
  jid_device?: number;
  /** address -> base64(32B identity pub key) */
  identities?: Record<string, string>;
  /** address -> base64(serialized SessionRecord) */
  sessions?: Record<string, string>;
  /** id(number) -> base64(32B priv key) */
  pre_keys?: Record<string, string>;
  /** "groupJID:senderAddress" -> base64(serialized SenderKeyRecord) */
  sender_keys?: Record<string, string>;
  /** id(number) -> base64(serialized SignedPreKeyRecord) */
  signed_pre_keys?: Record<string, string>;
  /** next prekey ID to generate */
  next_pre_key_id: number;
}

export interface NoiseKeyPair {
  priv: Buffer;
  pub: Buffer;
}

// PreKeys

export interface GeneratedPreKey {
  id: number;
  record: PreKeyRecord;
}

export interface PreKeyUploadPayload {
  registrationId: number;
  identityKey: Uint8Array; // 32 bytes, X25519 pub
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array; // 32 bytes
    signature: Uint8Array; // 64 bytes
  };
  preKeys: Array<{
    keyId: number;
    publicKey: Uint8Array; // 32 bytes
  }>;
}

export interface RawPreKeyBundle {
  registrationId: number;
  deviceId: number;
  identityKey: Uint8Array; // 33 bytes (serialize() DER compressed)
  signedPreKey: {
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  };
  /** Optional: one-time prekey (may be absent if server ran out) */
  preKey?: {
    keyId: number;
    publicKey: Uint8Array;
  };
  /**
   * Optional: Kyber (PQ) prekey.
   */
  kyberPreKey?: {
    keyId: number;
    publicKey: Uint8Array;
    signature: Uint8Array;
  };
}

// Handshake & Socket

export interface NoiseSocket {
  sendFrame(data: Buffer): Promise<void>;
  readFrame(): Promise<Buffer>;
  close(): void;
}

export interface RawWebSocket {
  send(data: Buffer): void;
  readRaw(len?: number): Promise<Buffer>;
  close(): void;
}

export interface HandshakeResult {
  socket: NoiseSocket;
}

// Client Options & Results

export interface E2EESendTextOptions {
  /** Recipient JID (DM) or group JID */
  toJid: string;
  text: string;
  isGroup: boolean;
  /** Own JID - required for all sends (self address in Signal protocol) */
  selfJid: string;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EESendTextResult {
  /** Encrypted MessageTransport bytes - feed into Signal cipher */
  plaintext: Buffer;
  /** frankingTag for the message node */
  frankingTag: Buffer;
}

export interface E2EEEncryptMediaOptions {
  type: MediaTypeKey;
  data: Buffer;
  mmsType: MmsTypeStr; // From media-upload.ts
}

export interface E2EEEncryptMediaResult {
  mediaKey: Buffer;
  fileSHA256: Buffer;
  fileEncSHA256: Buffer;
  fileLength: number;
  directPath: string;
  /** Pre-built MediaFields for encodeImageMessage / encodeVideoMessage / etc. */
  mediaFields: Omit<MediaFields, "caption" | "ptt" | "fileName" | "width" | "height" | "seconds">;
}

export interface E2EEDecryptMediaOptions {
  data: Buffer;
  mediaKey: Buffer;
  type: MediaTypeKey;
  fileSHA256?: Buffer;
  fileEncSHA256?: Buffer;
}

export type EncryptionResult =
  | { type: "dm"; encrypted: { type: "msg" | "pkmsg"; ciphertext: Buffer }; frankingTag: Buffer }
  | {
    type: "group";
    groupCiphertext: Buffer;
    devicePayload: Buffer;
    selfDevicePayload: Buffer;
    skdmPayload: Buffer;
    skdm: { groupId: string; skdmBytes: Buffer; distributionId: string };
    frankingTag: Buffer;
  };

// Message Builder

export interface MediaFields {
  caption?: string;
  mimeType: string;
  fileSHA256: Buffer;
  fileLength: number;
  mediaKey: Buffer;
  fileEncSHA256: Buffer;
  directPath: string;
  width?: number;
  height?: number;
  seconds?: number;
  ptt?: boolean;
  fileName?: string;
}

export interface MessageTransportOptions {
  messageApp: Buffer;
  /** Included only when sending a copy to own other devices */
  dsm?: {
    destinationJid: string;
    phash: string;
  };
  /** Included only for group messages */
  skdm?: {
    groupId: string;
    skdmBytes: Buffer;
  };
  /** Included for group sends to match whatsmeow's backup directive */
  backupDirective?: {
    messageId: string;
    actionType?: "UPSERT" | "REMOVE";
  };
  padding?: Buffer;
}

// E2EEService types

export interface E2EEUploadResult {
  messageId: string;
  timestampMs: number;
}

export interface E2EEDownloadResult {
  data: Buffer;
  mimeType: string;
  fileSize: number;
}

export interface E2EESendImageOptions {
  chatJid: string;
  data: Buffer;
  mimeType?: string;
  caption?: string;
  width?: number;
  height?: number;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EESendVideoOptions {
  chatJid: string;
  data: Buffer;
  mimeType?: string;
  caption?: string;
  width?: number;
  height?: number;
  duration?: number;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EESendAudioOptions {
  chatJid: string;
  data: Buffer;
  mimeType?: string;
  duration?: number;
  ptt?: boolean;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EESendDocumentOptions {
  chatJid: string;
  data: Buffer;
  fileName: string;
  mimeType?: string;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EESendStickerOptions {
  chatJid: string;
  data: Buffer;
  mimeType?: string;
  width?: number;
  height?: number;
  replyToId?: string;
  replyToSenderJid?: string;
}

export interface E2EEDownloadOptions {
  directPath: string;
  /** Base64-encoded */
  mediaKey: string;
  /** Base64-encoded */
  mediaSha256: string;
  /** Base64-encoded */
  mediaEncSha256?: string;
  /** "image" | "video" | "audio" | "voice" | "document" | "sticker" */
  mediaType: string;
  mimeType?: string;
  fileSize?: number;
}
