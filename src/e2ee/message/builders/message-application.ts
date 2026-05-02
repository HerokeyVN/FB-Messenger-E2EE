import { createHmac, randomBytes } from "node:crypto";
import { FB_CONSUMER_MESSAGE_VERSION } from "../constants.ts";
import { ProtoWriter } from "../proto/proto-writer.ts";

// MessageApplication encoding

/**
 * Wrap a ConsumerApplication payload into a MessageApplication.
 * Returns (messageApp bytes, frankingKey, frankingTag).
 */
export function encodeMessageApplication(
  consumerAppBytes: Buffer,
  replyTo?: { id: string; senderJid: string }
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
    const quoted = new ProtoWriter()
      .string(1, replyTo.id)
      .string(2, replyTo.senderJid)
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
