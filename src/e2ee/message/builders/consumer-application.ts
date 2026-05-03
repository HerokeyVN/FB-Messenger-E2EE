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
  const msgText = encodeMessageText(text);
  const content = new ProtoWriter().bytes(1, msgText).build(); // oneof content field 1 = messageText
  const payload = new ProtoWriter().bytes(1, content).build(); // oneof payload field 1 = Content
  return new ProtoWriter().bytes(1, payload).build(); // ConsumerApplication { payload }
}

function encodeMessageText(text: string): Buffer {
  return new ProtoWriter().string(1, text).build();
}

const MEDIA_TRANSPORT_VERSION = 1;

function encodeMediaSubProtocol(payload: Buffer): Buffer {
  return new ProtoWriter()
    .bytes(1, payload)
    .varint(2, MEDIA_TRANSPORT_VERSION)
    .build();
}

function mediaKeyTimestampSeconds(m: MediaFields): bigint {
  const seconds = m.mediaKeyTimestamp ?? Math.floor(Date.now() / 1000);
  return BigInt(Math.max(0, Math.trunc(seconds)));
}

function optionalDimension(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.max(0, Math.trunc(value));
}

function encodeDownloadableThumbnailMetadata(m: MediaFields): Buffer | undefined {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  if (width === undefined && height === undefined) return undefined;

  let thumbnail = new ProtoWriter();
  if (width !== undefined) thumbnail = thumbnail.varint(3, width);
  if (height !== undefined) thumbnail = thumbnail.varint(4, height);
  return thumbnail.build();
}

/**
 * Encode WAMediaTransport.WAMediaTransport.
 *
 * Modern Messenger media messages no longer carry a flat media payload directly in
 * ImageMessage/VideoMessage/etc. They carry a WACommon.SubProtocol whose payload
 * is a concrete media transport (ImageTransport, VideoTransport, ...). Each media
 * transport then nests this common WAMediaTransport with the encrypted-file
 * checksums, key, direct path, mimetype, file length and upload object ID.
 */
function encodeCommonMediaTransport(m: MediaFields, includeThumbnailMetadata: boolean): Buffer {
  const integral = new ProtoWriter()
    .bytes(1, m.fileSHA256)
    .bytes(2, m.mediaKey)
    .bytes(3, m.fileEncSHA256)
    .string(4, m.directPath)
    .uint64_varint(5, mediaKeyTimestampSeconds(m))
    .build();

  let ancillary = new ProtoWriter()
    .uint64_varint(1, BigInt(Math.max(0, Math.trunc(m.fileLength))))
    .string(2, m.mimeType);

  const thumbnail = includeThumbnailMetadata ? encodeDownloadableThumbnailMetadata(m) : undefined;
  if (thumbnail) ancillary = ancillary.bytes(3, thumbnail);
  if (m.objectId) ancillary = ancillary.string(4, m.objectId);

  return new ProtoWriter()
    .bytes(1, integral)
    .bytes(2, ancillary.build())
    .build();
}

function encodeMediaTransportIntegral(commonTransport: Buffer): Buffer {
  return new ProtoWriter().bytes(1, commonTransport).build();
}

function encodeImageTransportPayload(m: MediaFields): Buffer {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const transport = encodeCommonMediaTransport(m, true);

  let ancillary = new ProtoWriter();
  if (height !== undefined) ancillary = ancillary.varint(1, height);
  if (width !== undefined) ancillary = ancillary.varint(2, width);

  return new ProtoWriter()
    .bytes(1, encodeMediaTransportIntegral(transport))
    .bytes(2, ancillary.build())
    .build();
}

function encodeVideoTransportPayload(m: MediaFields): Buffer {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const seconds = optionalDimension(m.seconds);
  const transport = encodeCommonMediaTransport(m, true);

  let ancillary = new ProtoWriter();
  if (seconds !== undefined) ancillary = ancillary.varint(1, seconds);
  // Native Messenger sends gifPlayback explicitly as false for normal videos.
  ancillary = ancillary.bool(3, false);
  if (height !== undefined) ancillary = ancillary.varint(4, height);
  if (width !== undefined) ancillary = ancillary.varint(5, width);

  return new ProtoWriter()
    .bytes(1, encodeMediaTransportIntegral(transport))
    .bytes(2, ancillary.build())
    .build();
}

function encodeAudioTransportPayload(m: MediaFields): Buffer {
  const seconds = optionalDimension(m.seconds);
  const transport = encodeCommonMediaTransport(m, false);

  let ancillary = new ProtoWriter();
  if (seconds !== undefined) ancillary = ancillary.varint(1, seconds);

  return new ProtoWriter()
    .bytes(1, encodeMediaTransportIntegral(transport))
    .bytes(2, ancillary.build())
    .build();
}

function encodeDocumentTransportPayload(m: MediaFields): Buffer {
  const transport = encodeCommonMediaTransport(m, false);
  return new ProtoWriter()
    .bytes(1, encodeMediaTransportIntegral(transport))
    .bytes(2, Buffer.alloc(0))
    .build();
}

function encodeStickerTransportPayload(m: MediaFields): Buffer {
  const width = optionalDimension(m.width);
  const height = optionalDimension(m.height);
  const transport = encodeCommonMediaTransport(m, true);

  const integral = new ProtoWriter()
    .bytes(1, transport)
    .build();

  let ancillary = new ProtoWriter();
  if (height !== undefined) ancillary = ancillary.varint(2, height);
  if (width !== undefined) ancillary = ancillary.varint(3, width);

  return new ProtoWriter()
    .bytes(1, integral)
    .bytes(2, ancillary.build())
    .build();
}

/** Encode a ConsumerApplication image message. */
export function encodeImageMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeImageTransportPayload(m)));
  if (m.caption) w = w.bytes(2, encodeMessageText(m.caption));
  const content = new ProtoWriter().bytes(2, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication video message. */
export function encodeVideoMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeVideoTransportPayload(m)));
  if (m.caption) w = w.bytes(2, encodeMessageText(m.caption));
  const content = new ProtoWriter().bytes(9, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication audio/voice message. */
export function encodeAudioMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeAudioTransportPayload(m)));
  if (m.ptt) w = w.bool(2, true);
  const content = new ProtoWriter().bytes(8, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication document message. */
export function encodeDocumentMessage(m: MediaFields): Buffer {
  let w = new ProtoWriter().bytes(1, encodeMediaSubProtocol(encodeDocumentTransportPayload(m)));
  if (m.fileName) w = w.string(2, m.fileName);
  const content = new ProtoWriter().bytes(7, w.build()).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a ConsumerApplication sticker message. */
export function encodeStickerMessage(m: MediaFields): Buffer {
  const stickerMsg = new ProtoWriter()
    .bytes(1, encodeMediaSubProtocol(encodeStickerTransportPayload(m)))
    .build();
  const content = new ProtoWriter().bytes(12, stickerMsg).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

export interface MessageKeyOptions {
  remoteJid?: string;
  fromMe?: boolean;
  participant?: string;
}

export interface ReactionMessageKeyOptions extends MessageKeyOptions {
  senderTimestampMs?: number;
}

function encodeMessageKey(messageId: string, keyOpts: MessageKeyOptions = {}): Buffer {
  let key = new ProtoWriter();
  if (keyOpts.remoteJid) key = key.string(1, keyOpts.remoteJid);
  if (typeof keyOpts.fromMe === "boolean") key = key.bool(2, keyOpts.fromMe);
  key = key.string(3, messageId);
  if (keyOpts.participant) key = key.string(4, keyOpts.participant);
  return key.build();
}

/** Encode a reaction message. */
export function encodeReactionMessage(targetMessageId: string, emoji: string, keyOpts: ReactionMessageKeyOptions = {}): Buffer {
  const reaction = new ProtoWriter()
    .bytes(1, encodeMessageKey(targetMessageId, keyOpts))
    .string(2, emoji)
    .uint64_varint(4, BigInt(keyOpts.senderTimestampMs ?? Date.now()))
    .build();
  const content = new ProtoWriter().bytes(16, reaction).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a message edit. */
export function encodeEditMessage(targetMessageId: string, newText: string): Buffer {
  const key = new ProtoWriter().string(3, targetMessageId).build();
  const msgText = new ProtoWriter().string(1, newText).build();
  const edit = new ProtoWriter()
    .bytes(1, key)
    .bytes(2, msgText)
    .uint64_varint(3, BigInt(Date.now()))
    .build();
  const content = new ProtoWriter().bytes(19, edit).build();
  const payload = new ProtoWriter().bytes(1, content).build();
  return new ProtoWriter().bytes(1, payload).build();
}

/** Encode a revoke (unsend) message. */
export function encodeRevokeMessage(messageId: string, keyOptsOrFromMe: MessageKeyOptions | boolean = true): Buffer {
  const keyOpts = typeof keyOptsOrFromMe === "boolean"
    ? { fromMe: keyOptsOrFromMe }
    : keyOptsOrFromMe;
  const revoke = new ProtoWriter().bytes(1, encodeMessageKey(messageId, keyOpts)).build();
  const applicationData = new ProtoWriter().bytes(1, revoke).build();
  const payload = new ProtoWriter().bytes(2, applicationData).build();
  return new ProtoWriter().bytes(1, payload).build();
}
