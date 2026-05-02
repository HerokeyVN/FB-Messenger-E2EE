/**
 * Public API for the E2EE module.
 * Import from here - don't import internal files directly.
 */

// Client orchestrator
export { E2EEClient } from "./application/e2ee-client.ts";
export type {
  E2EESendTextOptions,
  E2EESendTextResult,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EEDecryptMediaOptions,
} from "./application/e2ee-client.ts";

// Device store
export { DeviceStore } from "./store/device-store.ts";
export type { DeviceJSON, NoiseKeyPair } from "./store/device-store.ts";

// Media crypto (can be used standalone)
export { encryptMedia, decryptMedia, expandMediaKey, sha256, MediaType, MmsType } from "./media/media-crypto.ts";
export type { MediaTypeKey, MediaKeys, EncryptMediaResult, DecryptMediaOptions } from "./media/media-crypto.ts";

// Media upload
export { uploadMedia } from "./media/media-upload.ts";
export type { MediaUploadConfig, MediaUploadResult, MmsTypeStr } from "./media/media-upload.ts";

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
} from "./signal/signal-manager.ts";

// PreKey manager
export {
  generatePreKeys,
  generateSignedPreKey,
  buildPreKeyUploadPayload,
  buildPreKeyBundle,
  INITIAL_PREKEY_COUNT,
  WANTED_PREKEY_COUNT,
  MIN_PREKEY_COUNT,
} from "./signal/prekey-manager.ts";
export type { GeneratedPreKey, PreKeyUploadPayload, RawPreKeyBundle } from "./signal/prekey-manager.ts";

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
} from "./message/message-builder.ts";
export type { MediaFields, MessageTransportOptions } from "./message/message-builder.ts";

// Noise handshake
export { doHandshake, WA_CERT_PUB_KEY, WA_HEADER } from "./transport/noise/noise-handshake.ts";
export type { NoiseSocket, RawWebSocket, HandshakeResult } from "./transport/noise/noise-handshake.ts";
