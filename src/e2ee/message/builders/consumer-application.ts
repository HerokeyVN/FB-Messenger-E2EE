import type { MediaFields } from "../../../models/e2ee.ts";
import { ProtoWriter } from "../proto/proto-writer.ts";

export type { MediaFields };

// ConsumerApplication encoding


// MessageBuilder (Pattern 3: Builder Pattern with Type Safety)

type ContentType =
  | { type: "text"; text: string }
  | { type: "image"; media: MediaFields }
  | { type: "video"; media: MediaFields }
  | { type: "audio"; media: MediaFields }
  | { type: "document"; media: MediaFields }
  | { type: "sticker"; media: MediaFields }
  | { type: "reaction"; emoji: string; targetId: string }
  | { type: "edit"; text: string; targetId: string }
  | { type: "revoke"; targetId: string; fromMe: boolean };

export class MessageBuilder {
  private content?: ContentType;
  private replyTo?: { id: string; senderJid: string };

  setReply(id: string, senderJid: string): this {
    this.replyTo = { id, senderJid };
    return this;
  }

  getReply() {
    return this.replyTo;
  }

  setText(text: string): this {
    this.content = { type: "text", text };
    return this;
  }

  setImage(media: MediaFields): this {
    this.content = { type: "image", media };
    return this;
  }

  setVideo(media: MediaFields): this {
    this.content = { type: "video", media };
    return this;
  }

  setAudio(media: MediaFields): this {
    this.content = { type: "audio", media };
    return this;
  }

  setDocument(media: MediaFields): this {
    this.content = { type: "document", media };
    return this;
  }

  setSticker(media: MediaFields): this {
    this.content = { type: "sticker", media };
    return this;
  }

  setReaction(emoji: string, targetId: string): this {
    this.content = { type: "reaction", emoji, targetId };
    return this;
  }

  setEdit(text: string, targetId: string): this {
    this.content = { type: "edit", text, targetId };
    return this;
  }

  setRevoke(targetId: string, fromMe: boolean): this {
    this.content = { type: "revoke", targetId, fromMe };
    return this;
  }

  build(): Buffer {
    if (!this.content) throw new Error("Message content not set");

    switch (this.content.type) {
      case "text":
        return encodeTextMessage(this.content.text);
      case "image":
        return encodeImageMessage(this.content.media);
      case "video":
        return encodeVideoMessage(this.content.media);
      case "audio":
        return encodeAudioMessage(this.content.media);
      case "document":
        return encodeDocumentMessage(this.content.media);
      case "sticker":
        return encodeStickerMessage(this.content.media);
      case "reaction":
        return encodeReactionMessage(this.content.targetId, this.content.emoji);
      case "edit":
        return encodeEditMessage(this.content.targetId, this.content.text);
      case "revoke":
        return encodeRevokeMessage(this.content.targetId, this.content.fromMe);
      default:
        throw new Error("Unknown content type");
    }
  }
}

/**
 * Encode a ConsumerApplication text message.
 * Field 1 = Payload { field 1 = Content { field 1 = MessageText { field 1 = text } } }
 */
export function encodeTextMessage(text: string): Buffer {
  const msgText = new ProtoWriter().string(1, text).build();
  const content = new ProtoWriter().bytes(1, msgText).build(); // oneof content field 1 = messageText
  const payload = new ProtoWriter().bytes(1, content).build(); // oneof payload field 1 = Content
  return new ProtoWriter().bytes(1, payload).build(); // ConsumerApplication { payload }
}

/** Encode a ConsumerApplication image message. */
export function encodeImageMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter();
  if (m.caption) w = w.string(1, m.caption);
  w = w
    .string(2, m.mimeType)
    .bytes(3, m.fileSHA256)
    .uint64(4, BigInt(m.fileLength))
    .bytes(5, m.mediaKey)
    .bytes(6, m.fileEncSHA256)
    .string(7, m.directPath);
  if (m.width) w = w.varint(18, m.width);
  if (m.height) w = w.varint(19, m.height);
  const imageMsg = w.build();
  const content = new ProtoWriter().bytes(2, imageMsg).build(); // field 2 = imageMessage
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication video message. */
export function encodeVideoMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter();
  if (m.caption) w = w.string(1, m.caption);
  w = w
    .string(2, m.mimeType)
    .bytes(3, m.fileSHA256)
    .uint64(4, BigInt(m.fileLength))
    .bytes(5, m.mediaKey)
    .bytes(6, m.fileEncSHA256)
    .string(7, m.directPath);
  if (m.seconds) w = w.varint(8, m.seconds);
  if (m.width) w = w.varint(18, m.width);
  if (m.height) w = w.varint(19, m.height);
  const videoMsg = w.build();
  const content = new ProtoWriter().bytes(3, videoMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication audio/voice message. */
export function encodeAudioMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter()
    .string(1, m.mimeType)
    .bytes(2, m.fileSHA256)
    .uint64(3, BigInt(m.fileLength))
    .bytes(4, m.mediaKey)
    .bytes(5, m.fileEncSHA256)
    .string(6, m.directPath);
  if (m.seconds) w = w.varint(7, m.seconds);
  if (m.ptt) w = w.bool(8, true);
  const audioMsg = w.build();
  const content = new ProtoWriter().bytes(4, audioMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication document message. */
export function encodeDocumentMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter()
    .string(2, m.mimeType)
    .bytes(4, m.fileSHA256)
    .uint64(5, BigInt(m.fileLength))
    .bytes(6, m.mediaKey)
    .bytes(7, m.fileEncSHA256)
    .string(8, m.directPath);
  if (m.fileName) w = w.string(3, m.fileName);
  const docMsg = w.build();
  const content = new ProtoWriter().bytes(5, docMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication sticker message. */
export function encodeStickerMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter()
    .string(1, m.mimeType)
    .bytes(2, m.fileSHA256)
    .uint64(3, BigInt(m.fileLength))
    .bytes(4, m.mediaKey)
    .bytes(5, m.fileEncSHA256)
    .string(6, m.directPath);
  if (m.width) w = w.varint(7, m.width);
  if (m.height) w = w.varint(8, m.height);
  const stickerMsg = w.build();
  const content = new ProtoWriter().bytes(6, stickerMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a reaction message. */
export function encodeReactionMessage(targetMessageId: string, emoji: string): Buffer {
  const reaction = new ProtoWriter()
    .string(1, emoji)
    .string(2, targetMessageId)
    .uint64(3, BigInt(Date.now()))
    .build();
  const content = new ProtoWriter().bytes(7, reaction).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a message edit. */
export function encodeEditMessage(targetMessageId: string, newText: string): Buffer {
  const msgText = new ProtoWriter().string(1, newText).build();
  const edit = new ProtoWriter().string(1, targetMessageId).bytes(2, msgText).build();
  const content = new ProtoWriter().bytes(8, edit).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a revoke (unsend) message. */
export function encodeRevokeMessage(messageId: string, fromMe: boolean): Buffer {
  const key = new ProtoWriter().bool(1, fromMe).string(2, messageId).build();
  const revoke = new ProtoWriter().bytes(1, key).build();
  const payload = new ProtoWriter().bytes(2, revoke).build(); // field 2 = RevokeMessage
  return new ProtoWriter().bytes(1, payload).build();
}
