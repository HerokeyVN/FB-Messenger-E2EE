/**
 * E2EE Message Builder - Layer 3 (Protobuf)
 *
 * Builds the MessageTransport / ConsumerApplication protobuf structures
 * that wrap plaintext message content before Signal encryption.
 *
 * Uses protobufjs for inline encoding - no code generation required.
 */

import type { MediaFields, MessageTransportOptions } from "../models/e2ee.ts";
export type { MediaFields, MessageTransportOptions };
import { createHmac, randomBytes } from "node:crypto";
import * as protobuf from "protobufjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const FB_MESSAGE_VERSION = 3;
export const FB_MESSAGE_APPLICATION_VERSION = 2;
export const FB_CONSUMER_MESSAGE_VERSION = 1;
export const FB_ARMADILLO_MESSAGE_VERSION = 1;

export interface ClientPayloadOptions {
  username: bigint;
  deviceId: number;
  fbCat?: Buffer;
  fbUserAgent?: Buffer;
  fbAppID?: bigint;
  fbDeviceID?: Buffer;
  fbCatBase64?: string;
}

// Protobuf encoding helpers (manual, avoids codegen requirement)

/** Minimal protobuf writer - only what we need */
export class ProtoWriter {
  private chunks: Buffer[] = [];

  private encodeVarint(value: number): Buffer {
    const bytes: number[] = [];
    let v = value >>> 0;
    while (v > 127) {
      bytes.push((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    bytes.push(v);
    return Buffer.from(bytes);
  }

  private fieldHeader(fieldNum: number, wireType: number): Buffer {
    return this.encodeVarint((fieldNum << 3) | wireType);
  }

  /** Wire type 0 (varint) but supports bigint */
  private encodeVarintBigInt(value: bigint): Buffer {
    const bytes: number[] = [];
    let v = value;
    while (v > 127n) {
      bytes.push(Number((v & 0x7fn) | 0x80n));
      v >>= 7n;
    }
    bytes.push(Number(v));
    return Buffer.from(bytes);
  }

  /** Wire type 0 (varint) for uint64 fields */
  uint64_varint(fieldNum: number, value: bigint): this {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarintBigInt(value));
    return this;
  }

  /** Wire type 2 (length-delimited) - bytes, string, embedded message */
  bytes(fieldNum: number, data: Uint8Array): this {
    const d = Buffer.from(data);
    this.chunks.push(this.fieldHeader(fieldNum, 2));
    this.chunks.push(this.encodeVarint(d.length));
    this.chunks.push(d);
    return this;
  }

  string(fieldNum: number, value: string): this {
    return this.bytes(fieldNum, Buffer.from(value, "utf8"));
  }

  /** Wire type 0 (varint) */
  varint(fieldNum: number, value: number): this {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarint(value));
    return this;
  }

  /** Wire type 0, bool */
  bool(fieldNum: number, value: boolean): this {
    return this.varint(fieldNum, value ? 1 : 0);
  }

  /** Wire type 1 (64-bit fixed) - uint64 */
  uint64(fieldNum: number, value: bigint): this {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    this.chunks.push(this.fieldHeader(fieldNum, 1));
    this.chunks.push(buf);
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }
}

// ClientPayload encoding (Handshake Step 3)

export function encodeClientPayload(opts: ClientPayloadOptions): Buffer {
  // AppVersion: 301.0.2
  const appVersion = new ProtoWriter()
    .varint(1, 301)
    .varint(2, 0)
    .varint(3, 2)
    .build();

  // UserAgent
  const userAgent = new ProtoWriter()
    .varint(1, 32) // Platform = BLUE_WEB (32)
    .bytes(2, appVersion)
    .string(3, "000") // mcc
    .string(4, "000") // mnc
    .string(5, "") // osVersion
    .string(6, "Linux") // manufacturer (OSName)
    .string(7, "Chrome") // device (BrowserName)
    .string(8, "") // osBuildNumber
    .varint(10, 3)    // releaseChannel = DEBUG
    .string(11, "en") // localeLanguage
    .string(12, "en") // localeCountry
    .build();

  const UserAgentStr = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

  // ClientPayload
  let w = new ProtoWriter()
    .uint64_varint(1, opts.username) // field 1
    .bool(3, false) // field 3: passive
    .bytes(5, userAgent) // field 5
    .varint(12, 1) // field 12: connectType (WIFI_UNKNOWN)
    .varint(13, 1) // field 13: connectReason (USER_ACTIVATED)
    .varint(18, opts.deviceId) // field 18: device
    .varint(20, 1) // field 20: product (MESSENGER)
    .bytes(21, opts.fbCatBase64 ? Buffer.from(opts.fbCatBase64) : Buffer.alloc(0)) // field 21: fbCat (as base64 string bytes)
    .bytes(22, opts.fbUserAgent ?? Buffer.from(UserAgentStr)) // field 22: fbUserAgent
    .bool(33, true); // field 33: pull

  return w.build();
}

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

// MessageApplication encoding

/**
 * Wrap a ConsumerApplication payload into a MessageApplication.
 * Returns (messageApp bytes, frankingKey, frankingTag).
 * Reference: sendfb.go SendFBMessage()
 */
export function encodeMessageApplication(consumerAppBytes: Buffer): {
  messageApp: Buffer;
  frankingKey: Buffer;
  frankingTag: Buffer;
} {
  const frankingKey = randomBytes(32);

  // SubProtocol { payload=consumerAppBytes, version=FB_CONSUMER_MESSAGE_VERSION }
  const subProtocol = new ProtoWriter()
    .bytes(1, consumerAppBytes)
    .varint(2, FB_CONSUMER_MESSAGE_VERSION)
    .varint(3, 0) // FutureProof = PLACEHOLDER
    .build();

  // MessageApplication_Payload_SubProtocol { consumerMessage = subProtocol }
  const payloadSubProto = new ProtoWriter().bytes(1, subProtocol).build();

  // MessageApplication_Payload { subProtocol = payloadSubProto }
  const appPayload = new ProtoWriter().bytes(1, payloadSubProto).build();

  // MessageApplication_Metadata { frankingKey, frankingVersion=0 }
  const metadata = new ProtoWriter()
    .varint(1, 0)          // frankingVersion
    .bytes(2, frankingKey) // frankingKey
    .build();

  // MessageApplication { payload, metadata }
  const messageApp = new ProtoWriter()
    .bytes(1, appPayload)
    .bytes(2, metadata)
    .build();

  // frankingTag = HMAC-SHA256(frankingKey, messageApp)
  const frankingTag = createHmac("sha256", frankingKey).update(messageApp).digest();

  return { messageApp, frankingKey, frankingTag };
}

// MessageTransport encoding (plaintext before Signal encryption)


/**
 * Encode the MessageTransport protobuf that will be fed into Signal cipher.
 * Reference: sendfb.go encryptMessageForDeviceV3()
 */
export function encodeMessageTransport(opts: MessageTransportOptions): Buffer {
  const padding = opts.padding ?? generatePadding();

  // Payload.ApplicationPayload (SubProtocol)
  const appPayload = new ProtoWriter()
    .bytes(1, opts.messageApp)
    .varint(2, FB_MESSAGE_APPLICATION_VERSION)
    .varint(3, 0) // FutureProof PLACEHOLDER
    .build();

  // Payload
  const payload = new ProtoWriter()
    .bytes(1, appPayload)
    .varint(2, 0) // futureProof
    .build();

  // Protocol.Integral
  let integral = new ProtoWriter().bytes(1, padding);
  if (opts.dsm) {
    const dsmMsg = new ProtoWriter()
      .string(1, opts.dsm.destinationJid)
      .string(2, opts.dsm.phash)
      .build();
    integral = integral.bytes(2, dsmMsg);
  }

  // Protocol.Ancillary
  let ancillary = new ProtoWriter();
  if (opts.skdm) {
    const skdmMsg = new ProtoWriter()
      .string(1, opts.skdm.groupId)
      .bytes(2, opts.skdm.skdmBytes)
      .build();
    ancillary = ancillary.bytes(2, skdmMsg);
  }
  // BackupDirective - UPSERT by default (field 4)
  // Omitted for now; can be added later

  // Protocol
  const protocol = new ProtoWriter()
    .bytes(1, integral.build())
    .bytes(2, ancillary.build())
    .build();

  // MessageTransport
  return new ProtoWriter()
    .bytes(1, payload)
    .bytes(2, protocol)
    .build();
}

// Helpers

/**
 * Generate a random padding buffer.
 * Mirrors padMessage() in whatsmeow/send.go - uses random length 1–255.
 */
function generatePadding(): Buffer {
  const len = (randomBytes(1)[0]! & 0xff) || 1;
  const pad = randomBytes(len);
  pad[len - 1] = len; // last byte = length (PKCS7-style)
  return pad;
}

// Protobuf Decoders (using protobufjs for simplicity)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = new ((protobuf as any).default?.Root || protobuf.Root)();
root.resolvePath = (origin: string, target: string) => {
  return join(__dirname, "proto", target);
};
root.loadSync([
  "WACommon.proto",
  "MessageTransport.proto",
  "MessageApplication.proto",
  "ConsumerApplication.proto",
  "ArmadilloApplication.proto",
  "ArmadilloICDC.proto"
]);

const MsgTransportType = root.lookupType("waMsgTransport.MessageTransport");
const MsgApplicationType = root.lookupType("WAMsgApplication.MessageApplication");
const ConsumerAppType = root.lookupType("waConsumerApplication.ConsumerApplication");
const ArmadilloAppType = root.lookupType("waArmadilloApplication.Armadillo");
const ICDCIdentityListType = root.lookupType("waArmadilloICDC.ICDCIdentityList");
const SignedICDCIdentityListType = root.lookupType("waArmadilloICDC.SignedICDCIdentityList");

export function decodeMessageTransport(buffer: Buffer): any {
  const msg = MsgTransportType.decode(buffer);
  return MsgTransportType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}

export function decodeMessageApplication(buffer: Buffer): any {
  const msg = MsgApplicationType.decode(buffer);
  return MsgApplicationType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}

export function decodeConsumerApplication(buffer: Buffer): any {
  const msg = ConsumerAppType.decode(buffer);
  return ConsumerAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}

export function decodeArmadillo(buffer: Buffer): any {
  const msg = ArmadilloAppType.decode(buffer);
  return ArmadilloAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}

export function encodeICDCIdentityList(data: {
  seq: number;
  timestamp: number;
  devices: Buffer[];
  signingDeviceIndex: number;
}): Buffer {
  const msg = ICDCIdentityListType.create(data);
  return Buffer.from(ICDCIdentityListType.encode(msg).finish());
}

export function encodeSignedICDCIdentityList(data: {
  details: Buffer;
  signature: Buffer;
}): Buffer {
  const msg = SignedICDCIdentityListType.create(data);
  return Buffer.from(SignedICDCIdentityListType.encode(msg).finish());
}

export function decodeICDCFetchResponse(buffer: Buffer): any {
  // Not a proto, but we might need it
}

