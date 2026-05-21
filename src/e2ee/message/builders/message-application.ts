import { createHmac, randomBytes } from "node:crypto";
import { FB_CONSUMER_MESSAGE_VERSION } from "../constants.ts";
import { ProtoWriter } from "../proto/proto-writer.ts";

// MessageApplication encoding

/**
 * Reply-to (quoted message) metadata for MessageApplication.Metadata.QuotedMessage.
 *
 * Proto schema (WAMsgApplication.proto):
 *   message QuotedMessage {
 *     optional string stanzaID   = 1;  // message ID of the quoted message
 *     optional string remoteJID  = 2;  // chat JID (thread) that contains the quoted message
 *     optional string participant = 3; // sender JID of the quoted message (required for groups)
 *   }
 */
export interface ReplyToMeta {
  /** Message ID (stanzaID) of the quoted message. */
  messageId: string;
  /** Chat JID (remoteJID) — the thread where the quoted message lives. */
  chatJid: string;
  /**
   * Sender JID (participant) of the quoted message.
   * - For DM: same as chatJid (the peer's bare JID).
   * - For group: the specific member JID who sent the original message.
   */
  senderJid: string;
}

/**
 * Wrap a ConsumerApplication payload into a MessageApplication.
 * Returns (messageApp bytes, frankingKey, frankingTag).
 */
export function encodeMessageApplication(
  consumerAppBytes: Buffer,
  replyTo?: ReplyToMeta
): {
  messageApp: Buffer;
  frankingKey: Buffer;
  frankingTag: Buffer;
} {
  const frankingKey = randomBytes(32);

  // SubProtocol { payload=consumerAppBytes, version=FB_CONSUMER_MESSAGE_VERSION }
  const subProtocol = new ProtoWriter()
    .bytes(1, consumerAppBytes)
    .varint(2, FB_CONSUMER_MESSAGE_VERSION)
    .build();

  // MessageApplication.SubProtocolPayload {
  //   futureProof = PLACEHOLDER (field 1)
  //   consumerMessage = WACommon.SubProtocol (field 2)
  // }
  const payloadSubProto = new ProtoWriter()
    .varint(1, 0)
    .bytes(2, subProtocol)
    .build();

  // MessageApplication.Payload { subProtocol = payloadSubProto } (field 4)
  const appPayload = new ProtoWriter().bytes(4, payloadSubProto).build();

  // MessageApplication_Metadata { frankingKey=8, frankingVersion=9, quotedMessage=10 }
  let metadataWriter = new ProtoWriter()
    .bytes(8, frankingKey)
    .varint(9, 0); // frankingVersion

  if (replyTo) {
    // QuotedMessage {
    //   stanzaID   = field 1 (message ID of the quoted message)
    //   remoteJID  = field 2 (JID of the chat/thread, NOT the sender)
    //   participant = field 3 (JID of the original sender; same as remoteJID for DM)
    // }
    const quoted = new ProtoWriter()
      .string(1, replyTo.messageId)
      .string(2, replyTo.chatJid)
      .string(3, replyTo.senderJid)
      .build();
    metadataWriter = metadataWriter.bytes(10, quoted);
  }

  const metadata = metadataWriter.build();

  // MessageApplication { payload, metadata }
  const messageApp = new ProtoWriter()
    .bytes(1, appPayload)
    .bytes(2, metadata)
    .build();

  // frankingTag = HMAC-SHA256(frankingKey, messageApp)
  const frankingTag = createHmac("sha256", frankingKey).update(messageApp).digest();

  return { messageApp, frankingKey, frankingTag };
}
