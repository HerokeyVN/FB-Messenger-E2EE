export { FBClient } from "./core/client.ts";
export { E2EEService } from "./services/e2ee.service.ts";

export type { ClientOptions, SessionData, MessengerEventMap } from "./models/client.ts";
export type { AuthConfig, AppEnv } from "./models/config.ts";
export type {
  Attachment,
  Mention,
  ReplyTo,
  Platform,
  MessengerEvent,
  E2EEMessage,
  E2EEMessageKind,
} from "./models/domain.ts";
export type {
  SendMessageInput,
  SendMediaInput,
  SendReactionInput,
  TypingInput,
} from "./models/messaging.ts";
export type {
  E2EESendTextOptions,
  E2EESendTextResult,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EEDecryptMediaOptions,
  E2EEDownloadOptions,
  E2EEDownloadResult,
} from "./models/e2ee.ts";
export type {
  MediaUploadConfig,
  MediaUploadResult,
  MmsTypeStr,
} from "./models/media.ts";
