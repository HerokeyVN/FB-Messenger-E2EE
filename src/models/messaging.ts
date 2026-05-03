export interface SendMessageInput {
  threadId: string;
  text: string;
  replyToMessageId?: string;
}

export interface SendMediaInput {
  threadId: string;
  data: Buffer;
  fileName: string;
  /** Optional; inferred from fileName extension when omitted. */
  mimeType?: string;
  caption?: string;
  replyToMessageId?: string;
  /** Optional media width in pixels for E2EE image/video/sticker payloads. */
  width?: number;
  /** Optional media height in pixels for E2EE image/video/sticker payloads. */
  height?: number;
  /** Optional media duration in whole seconds for E2EE video/audio payloads. */
  seconds?: number;
  /** Alias for seconds, kept for callers that use media-style naming. */
  duration?: number;
  /** Whether E2EE audio should be sent as push-to-talk/voice. Defaults to true for sendAudio. */
  ptt?: boolean;
}

export interface SendStickerInput {
  threadId: string;
  stickerId: number;
  replyToMessageId?: string;
}

export interface TypingInput {
  threadId: string;
  isTyping: boolean;
}

export interface MarkReadInput {
  threadId: string;
}

export interface SendReactionInput {
  messageId: string;
  reaction: string;
  threadId: string;
}

export interface MuteThreadInput {
  threadId: string;
  /** Seconds to mute; -1 = forever, 0 = unmute */
  muteSeconds: number;
}

export interface RenameThreadInput {
  threadId: string;
  newName: string;
}

export interface SetGroupPhotoInput {
  threadId: string;
  data: Buffer;
  mimeType: string;
}

export interface DeleteThreadInput {
  threadId: string;
}

export interface CreateThreadInput {
  userId: string;
}

export interface SearchUsersInput {
  query: string;
}

export interface GetUserInfoInput {
  userId: string;
}

export interface DownloadMediaInput {
  url: string;
}
