export interface SendMessageInput {
  threadId: string;
  text: string;
  replyToMessageId?: string;
}

export interface SendMediaInput {
  threadId: string;
  data: Buffer;
  fileName: string;
  mimeType: string;
  caption?: string;
  replyToMessageId?: string;
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
