export type Platform = "facebook" | "messenger";

// Auth / Session


// Attachment (mirrors bridge-go Attachment struct)

export type AttachmentType = "image" | "video" | "audio" | "voice" | "file" | "sticker" | "gif" | "location" | "link" | "photo";

export interface BaseAttachment {
  url?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  /** For E2EE media download - base64-encoded */
  mediaKey?: string;
  mediaSha256?: string;
  mediaEncSha256?: string;
  directPath?: string;
}

export interface ImageAttachment extends BaseAttachment {
  type: "image" | "gif" | "photo";
  width?: number;
  height?: number;
  previewUrl?: string;
}

export interface VideoAttachment extends BaseAttachment {
  type: "video";
  width?: number;
  height?: number;
  duration?: number;
  previewUrl?: string;
}

export interface AudioAttachment extends BaseAttachment {
  type: "audio" | "voice";
  duration?: number;
}

export interface FileAttachment extends BaseAttachment {
  type: "file";
}

export interface StickerAttachment extends BaseAttachment {
  type: "sticker";
  stickerID: number;
}

export interface LocationAttachment extends BaseAttachment {
  type: "location";
  latitude: number;
  longitude: number;
}

export interface LinkAttachment extends BaseAttachment {
  type: "link";
  description?: string;
  sourceText?: string;
  previewUrl?: string;
}

export type Attachment =
  | ImageAttachment
  | VideoAttachment
  | AudioAttachment
  | FileAttachment
  | StickerAttachment
  | LocationAttachment
  | LinkAttachment;

// Mention / ReplyTo

export interface Mention {
  userId: string;
  /** UTF-16 code unit offset in the message text */
  offset: number;
  /** UTF-16 code unit length */
  length: number;
  /** "user" | "thread" | "group" */
  type?: string;
}

export interface ReplyTo {
  messageId: string;
  senderId?: string;
  text?: string;
}

// Thread / UserInfo

export interface Thread {
  id: string;
  /** 1 = DM, 2 = group */
  type: number;
  name: string;
  lastActivityTimestampMs: number;
  snippet?: string;
}

export interface UserInfo {
  id: string;
  name: string;
  firstName?: string;
  username?: string;
  profilePictureUrl?: string;
  isMessengerUser?: boolean;
  isVerified?: boolean;
  gender?: number;
  canViewerMessage?: boolean;
}

// Messages

export interface MessengerMessage {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  timestampMs: number;
  replyTo?: ReplyTo;
  attachments?: Attachment[];
  mentions?: Mention[];
  isAdminMsg?: boolean;
}

export type E2EEMessageKind =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "sticker"
  | "reaction"
  | "edit"
  | "revoke"
  | "unknown";

export interface BaseE2EEMessage {
  id: string;
  /** Stable conversation ID. For DMs this is the bare Facebook user ID; for groups it is the group JID. */
  threadId: string;
  /** Canonical E2EE chat JID. For DMs this uses the bare .0 Messenger device; senderJid keeps the actual sender device. */
  chatJid: string;
  /** Device-specific sender JID, e.g. user.device@msgr. */
  senderJid: string;
  /** Bare Facebook sender/user ID. */
  senderId: string;
  senderDeviceId?: number;
  isGroup: boolean;
  kind: E2EEMessageKind;
  /** Text body when present; empty string for non-text E2EE events. */
  text: string;
  timestampMs: number;
  attachments?: Attachment[];
  replyTo?: ReplyTo;
  mentions?: Mention[];
}

export interface E2EETextMessage extends BaseE2EEMessage {
  kind: "text";
  text: string;
}

export interface E2EEMediaMessage extends BaseE2EEMessage {
  kind: "image" | "video" | "audio" | "document" | "sticker";
  media?: unknown;
}

export interface E2EEReactionMessage extends BaseE2EEMessage {
  kind: "reaction";
  reaction: string;
  targetId?: string;
}

export interface E2EEEditMessage extends BaseE2EEMessage {
  kind: "edit";
  targetId?: string;
}

export interface E2EERevokeMessage extends BaseE2EEMessage {
  kind: "revoke";
  targetId?: string;
  fromMe?: boolean;
}

export interface E2EEUnknownMessage extends BaseE2EEMessage {
  kind: "unknown";
  raw?: unknown;
}

export type E2EEMessage =
  | E2EETextMessage
  | E2EEMediaMessage
  | E2EEReactionMessage
  | E2EEEditMessage
  | E2EERevokeMessage
  | E2EEUnknownMessage;

// Input types - messaging



// Input types - thread management (mirrors media.go)


// Input types - media download


// Events

export type MessengerEvent =
  | { type: "message"; data: MessengerMessage }
  | {
    type: "messageEdit";
    data: {
      messageId: string;
      threadId: string;
      newText: string;
      editCount: number;
      timestampMs: number;
    };
  }
  | {
    type: "reaction";
    data: {
      messageId: string;
      threadId: string;
      actorId: string;
      /** Empty string = reaction removed */
      reaction: string;
      timestampMs: number;
    };
  }
  | {
    type: "typing";
    data: {
      threadId: string;
      senderId: string;
      isTyping: boolean;
    };
  }
  | {
    type: "message_unsend";
    data: {
      messageId: string;
      threadId: string;
      actorId: string;
      timestampMs: number;
    };
  }
  | {
    type: "read_receipt";
    data: {
      threadId: string;
      readerId: string;
      readWatermarkTimestampMs?: number;
      timestampMs: number;
    };
  }
  | {
    type: "presence";
    data: {
      userId: string;
      isOnline: boolean;
      lastActiveTimestampMs?: number;
    };
  }
  | { type: "e2ee_connected"; data: Record<string, never> }
  | { type: "e2ee_message"; data: E2EEMessage }
  | {
    type: "e2ee_reaction";
    data: {
      messageId: string;
      chatJid: string;
      senderJid: string;
      senderId: string;
      /** Empty string = unreaction */
      reaction: string;
    };
  }
  | {
    type: "e2ee_receipt";
    data: {
      type: string;
      chat: string;
      sender: string;
      messageIds: string[];
    };
  }
  | {
    type: "disconnected";
    data: { isE2EE?: boolean };
  }
  | { type: "reconnected"; data: Record<string, never> }
  | { type: "ready"; data: { isNewSession: boolean } }
  | { type: "raw"; data: Record<string, unknown> }
  | { type: "error"; data: { message: string; code?: number } };
