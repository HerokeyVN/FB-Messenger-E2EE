import { randomBytes } from "node:crypto";
import type { MessageTransportOptions } from "../../../models/e2ee.ts";
import { FB_MESSAGE_APPLICATION_VERSION } from "../constants.ts";
import { ProtoWriter } from "../proto/proto-writer.ts";

export type { MessageTransportOptions };

// MessageTransport encoding (plaintext before Signal encryption)


/**
 * Encode the MessageTransport protobuf that will be fed into Signal cipher.
 */
export function encodeMessageTransport(opts: MessageTransportOptions): Buffer {
  const padding = opts.padding ?? generatePadding();

  let payload: Buffer | undefined;
  if (opts.messageApp) {
    // Payload.ApplicationPayload (SubProtocol)
    const appPayload = new ProtoWriter()
      .bytes(1, opts.messageApp)
      .varint(2, FB_MESSAGE_APPLICATION_VERSION)
      .varint(3, 0) // FutureProof PLACEHOLDER
      .build();

    // Payload
    payload = new ProtoWriter()
      .bytes(1, appPayload)
      .varint(2, 0) // futureProof
      .build();
  }

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
  if (opts.backupDirective) {
    const actionType = opts.backupDirective.actionType === "REMOVE" ? 1 : 0;
    const backupDirectiveMsg = new ProtoWriter()
      .string(1, opts.backupDirective.messageId)
      .varint(2, actionType)
      .build();
    ancillary = ancillary.bytes(4, backupDirectiveMsg);
  }
  // BackupDirective - UPSERT by default (field 4)
  // Omitted for now; can be added later

  // Protocol
  const protocol = new ProtoWriter()
    .bytes(1, integral.build())
    .bytes(2, ancillary.build())
    .build();

  // MessageTransport
  const transport = new ProtoWriter();
  if (payload) transport.bytes(1, payload);
  return transport
    .bytes(2, protocol)
    .build();
}

// Helpers

/**
 * Generate a random padding buffer.
 * Uses random length 1–255 and stores the padding length in the final byte.
 */
function generatePadding(): Buffer {
  const len = (randomBytes(1)[0]! & 0xff) || 1;
  const pad = randomBytes(len);
  pad[len - 1] = len; // last byte = length (PKCS7-style)
  return pad;
}
