/**
 * Public API for the E2EE module.
 * Import from here - don't import internal files directly.
 */

// Client orchestrator
export { E2EEClient } from "./e2ee-client.ts";
export type {
  E2EESendTextOptions,
  E2EESendTextResult,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EEDecryptMediaOptions,
} from "./e2ee-client.ts";

// Device store
export { DeviceStore } from "./device-store.ts";
export type { DeviceJSON, NoiseKeyPair } from "./device-store.ts";

// Media crypto (can be used standalone)
export { encryptMedia, decryptMedia, expandMediaKey, sha256, MediaType, MmsType } from "./media-crypto.ts";
export type { MediaTypeKey, MediaKeys, EncryptMediaResult, DecryptMediaOptions } from "./media-crypto.ts";

// Media upload
export { uploadMedia } from "./media-upload.ts";
export type { MediaUploadConfig, MediaUploadResult, MmsTypeStr } from "./media-upload.ts";

// Signal manager (lower level)
export {
  jidToAddress,
  addressToJidKey,
  establishSession,
  encryptDM,
  decryptDM,
  decryptDMPreKey,
  encryptGroup,
  decryptGroup,
  createSenderKeyDistributionMessage,
  processSKDM,
  hasSession,
} from "./signal-manager.ts";

// PreKey manager
export {
  generatePreKeys,
  generateSignedPreKey,
  buildPreKeyUploadPayload,
  buildPreKeyBundle,
  INITIAL_PREKEY_COUNT,
  WANTED_PREKEY_COUNT,
  MIN_PREKEY_COUNT,
} from "./prekey-manager.ts";
export type { GeneratedPreKey, PreKeyUploadPayload, RawPreKeyBundle } from "./prekey-manager.ts";

// Message builder
export {
  encodeTextMessage,
  encodeImageMessage,
  encodeVideoMessage,
  encodeAudioMessage,
  encodeDocumentMessage,
  encodeStickerMessage,
  encodeReactionMessage,
  encodeEditMessage,
  encodeRevokeMessage,
  encodeMessageApplication,
  encodeMessageTransport,
  FB_MESSAGE_VERSION,
  FB_MESSAGE_APPLICATION_VERSION,
  FB_CONSUMER_MESSAGE_VERSION,
} from "./message-builder.ts";
export type { MediaFields, MessageTransportOptions } from "./message-builder.ts";

// Noise handshake
export { doHandshake, WA_CERT_PUB_KEY, WA_HEADER } from "./noise-handshake.ts";
export type { NoiseSocket, RawWebSocket, HandshakeResult } from "./noise-handshake.ts";
