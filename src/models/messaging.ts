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
  /** Thread ID or canonical E2EE chat JID containing the target message. */
  threadId: string;
  /** Sender JID of the target E2EE message; required for reacting to someone else's group message. */
  senderJid?: string;
  /** Alias for senderJid for callers that prefer explicit target naming. */
  targetSenderJid?: string;
}

export interface UnsendMessageInput {
  /** The message ID to revoke/unsend. */
  messageId: string;
  /**
   * The thread ID (or E2EE chat JID) that contains the message.
   * Required to route the revoke through the correct channel:
   * - E2EE threads → encrypted revoke via Noise socket.
   * - Non-E2EE threads → HTTP unsend via fca-unofficial.
   */
  threadId: string;
  /**
   * Whether the message was sent by the current user.
   * Defaults to true. Set to false for admin revoke of others' messages.
   */
  fromMe?: boolean;
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
