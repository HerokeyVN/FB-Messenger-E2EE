export { FBClient } from "./core/client.ts";
export { E2EEService } from "./services/e2ee.service.ts";

export type { ClientOptions, SessionData, MessengerEventMap } from "./models/client.ts";
export type { AuthConfig, AppEnv } from "./models/config.ts";
export type {
  Attachment,
  Thread,
  MessengerMessage,
  UserInfo,
  Mention,
  ReplyTo,
  Platform,
  MessengerEvent,
} from "./models/domain.ts";
export type {
  SendMessageInput,
  SendMediaInput,
  SendReactionInput,
  SendStickerInput,
  MarkReadInput,
  TypingInput,
  CreateThreadInput,
  DeleteThreadInput,
  RenameThreadInput,
  MuteThreadInput,
  SearchUsersInput,
  GetUserInfoInput,
  DownloadMediaInput,
  SetGroupPhotoInput,
} from "./models/messaging.ts";
export type {
  ThreadDetails,
  GetThreadListInput,
  GetThreadHistoryInput,
  AddGroupMemberInput,
  RemoveGroupMemberInput,
  ChangeAdminStatusInput,
  CreatePollInput,
  EditMessageInput,
  EditMessageResult,
  ForwardAttachmentInput,
} from "./models/thread.ts";
export type {
  E2EESendTextOptions,
  E2EESendTextResult,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EEDecryptMediaOptions,
} from "./models/e2ee.ts";
export type {
  MediaUploadConfig,
  MediaUploadResult,
  MmsTypeStr,
} from "./models/media.ts";
