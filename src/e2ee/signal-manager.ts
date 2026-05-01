/**
 * E2EE Signal Manager - Layer 2 (Signal Protocol)
 *
 * Handles all Signal Protocol encrypt/decrypt operations for:
 *   - DM (1-to-1): X3DH session establishment + Double Ratchet
 *   - Group: Sender Key distribution + group cipher
 */

import {
  ProtocolAddress,
  SenderKeyDistributionMessage,
  CiphertextMessageType,
  SignalMessage,
  PreKeySignalMessage,
  signalEncrypt,
  signalDecrypt,
  signalDecryptPreKey,
  processPreKeyBundle,
  groupEncrypt,
  groupDecrypt,
  processSenderKeyDistributionMessage,
  SenderKeyMessage,
} from "@signalapp/libsignal-client";
import { randomUUID } from "node:crypto";

import type { DeviceStore } from "./device-store.ts";
import type { RawPreKeyBundle } from "./prekey-manager.ts";
import { buildPreKeyBundle } from "./prekey-manager.ts";
import {
  wrapAsSignalSKMSG,
  parseFBProtobufSKMSG,
  stableDistributionId,
  uuidStringify,
} from "./facebook-protocol-utils.ts";
import { logger } from "../utils/logger.ts";

/**
 * Cast for strict libsignal params.
 * Converts Uint8Array to Buffer if needed.
 */
const u8 = (b: Uint8Array | undefined | null): Buffer => {
  if (!b) return Buffer.alloc(0);
  return Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);
};

// Address helpers

/**
 * Build a ProtocolAddress from a Messenger/WhatsApp JID string.
 * Format: "user.agent:device@server" or "user.agent@server".
 * The agent suffix is part of the Signal user ID; the device suffix is the Signal device ID.
 */
export function jidToAddress(jid: string): ProtocolAddress {
  const [userPart] = jid.split("@");
  const [userAndAgent = jid, rawDevicePart = ""] = (userPart ?? jid).split(":");
  const [user = jid, rawAgentPart = ""] = userAndAgent.split(".");
  const signalUser = rawAgentPart ? `${user}_${rawAgentPart}` : user;
  const device = rawDevicePart ? Number(rawDevicePart) : 0;
  return ProtocolAddress.new(signalUser, device);
}

export function addressToJidKey(addr: ProtocolAddress): string {
  return `${addr.name()}:${addr.deviceId()}`;
}

// DM - X3DH session establish + Double Ratchet encrypt/decrypt

/** Establish an outgoing session with a new contact using their prekey bundle (X3DH). */
export async function establishSession(
  store: DeviceStore,
  recipient: ProtocolAddress,
  rawBundle: RawPreKeyBundle,
): Promise<void> {
  const bundle = buildPreKeyBundle(rawBundle);
  await processPreKeyBundle(bundle, recipient, store as any, store as any);
}

/** Encrypt plaintext for a DM recipient. */
export async function encryptDM(
  store: DeviceStore,
  recipient: ProtocolAddress,
  selfAddress: ProtocolAddress,
  plaintext: Uint8Array,
): Promise<{ type: "msg" | "pkmsg"; ciphertext: Uint8Array }> {
  const cipherMsg = await signalEncrypt(u8(plaintext), recipient, store as any, store as any);
  const type = cipherMsg.type() === CiphertextMessageType.Whisper ? "msg" : "pkmsg";
  return { type, ciphertext: cipherMsg.serialize() };
}

/** Decrypt a normal Signal message (not first-message). */
export async function decryptDM(
  store: DeviceStore,
  sender: ProtocolAddress,
  ciphertext: Uint8Array,
): Promise<Buffer> {
  const msg = SignalMessage.deserialize(u8(ciphertext));
  return Buffer.from(await signalDecrypt(msg, sender, store as any, store as any));
}

/** Decrypt a PreKeySignalMessage (first message from sender). */
export async function decryptDMPreKey(
  store: DeviceStore,
  sender: ProtocolAddress,
  selfAddress: ProtocolAddress,
  ciphertext: Uint8Array,
): Promise<Buffer> {
  const msg = PreKeySignalMessage.deserialize(u8(ciphertext));
  return Buffer.from(
    await signalDecryptPreKey(msg, sender, store as any, store as any, store as any, store as any, store as any)
  );
}

// Group - Sender Key

/** Create or retrieve a SenderKeyDistributionMessage for the given group/sender. */
export async function createSenderKeyDistributionMessage(
  store: DeviceStore,
  groupJid: string,
  senderJid: string,
): Promise<{ skdm: SenderKeyDistributionMessage; distributionId: string }> {
  const distributionId = randomUUID();
  const senderAddr = jidToAddress(senderJid);
  const skdm = await SenderKeyDistributionMessage.create(senderAddr, distributionId, store as any);
  return { skdm, distributionId };
}

/** 
 * Process a received SenderKeyDistributionMessage from a group member.
 * Handles both standard Signal and Facebook's signature-less variants.
 */
export async function processSKDM(
  store: DeviceStore,
  senderJid: string,
  skdmBytes: Uint8Array,
  groupJid?: string,
): Promise<void> {
  const senderAddr = jidToAddress(senderJid);
  const buf = u8(skdmBytes as Buffer);

  // Try the standard libsignal format first. Facebook captures we have so far
  // use the same 0x33-prefixed serialized message, so we should not invent our
  // own distribution ID or signing key when the library can parse it directly.
  try {
    const skdm = SenderKeyDistributionMessage.deserialize(buf);
    await processSenderKeyDistributionMessage(senderAddr, skdm, store as any);
    return;
  } catch (primaryErr) {
    if (buf[0] === 0x33 && buf.length > 1) {
      const skdm = SenderKeyDistributionMessage.deserialize(buf.slice(1));
      await processSenderKeyDistributionMessage(senderAddr, skdm, store as any);
      return;
    }
    throw primaryErr;
  }
}

/** Encrypt plaintext for a group using sender key. */
export async function encryptGroup(
  store: DeviceStore,
  groupJid: string,
  senderJid: string,
  plaintext: Uint8Array,
  distributionId?: string,
): Promise<Uint8Array> {
  const activeDistributionId = distributionId ?? randomUUID();
  const senderAddr = jidToAddress(senderJid);
  const cipherMsg = await groupEncrypt(senderAddr, activeDistributionId, store as any, u8(plaintext));
  const buf = u8(cipherMsg.serialize());
  // If this is a Facebook-style SKMSG (0x33 prefix, signature-less), re-wrap into
  // a Signed Signal SKMSG so it matches whatsmeow's SignedSerialize() output.
  if (buf && buf.length > 0 && buf[0] === 0x33) {
    try {
      // Try protobuf-style FB SKMSG first
      const parsed = parseFBProtobufSKMSG(buf.slice(1));
      if (parsed) {
        const wrapped = wrapAsSignalSKMSG({ distributionId: activeDistributionId, id: parsed.id, iteration: parsed.iteration, ciphertext: parsed.ciphertext, senderJid });
        return wrapped;
      }
      // Fallback: legacy binary FB SKMSG (distributionId(16) | id(4) | ct...)
      if (buf.length >= 21 && buf[1] !== 0x08) {
        const distId = uuidStringify(buf.slice(1, 17));
        const id = buf.readUInt32BE(17);
        const iteration = 0;
        const ct = buf.slice(21);
        const wrapped = wrapAsSignalSKMSG({ distributionId: distId, id, iteration, ciphertext: ct, senderJid });
        return wrapped;
      }
    } catch (e) {
      // fallback to raw buf
    }
  }
  return buf;
}

/** Decrypt a group SenderKeyMessage. */
export async function decryptGroup(
  store: DeviceStore,
  senderJid: string,
  ciphertext: Uint8Array,
  groupJid?: string,
): Promise<Buffer> {
  const senderAddr = jidToAddress(senderJid);
  let buf = u8(ciphertext);

  // If it's a Facebook-style message (version 0x33, usually lacking 64-byte signature)
  if (buf[0] === 0x33) {
    try {
      SenderKeyMessage.deserialize(buf);
      // Already a valid Signal message
    } catch (e) {
      // Likely a Facebook signature-less message, needs re-encoding
      logger.debug("signal-manager", `Re-encoding Facebook-style SKMSG from ${senderJid}`);

      let id: number, iteration: number, ct: Buffer, distId: string;

      if (buf.length >= 21 && buf[1] !== 0x08) {
        // Legacy Binary
        distId = uuidStringify(buf.slice(1, 17));
        id = buf.readUInt32BE(17);
        iteration = 0;
        ct = buf.slice(21);
      } else {
        // Protobuf Style
        const parsed = parseFBProtobufSKMSG(buf.slice(1));
        if (!parsed) throw new Error("Failed to parse Facebook Protobuf SKMSG");
        id = parsed.id;
        iteration = parsed.iteration;
        ct = parsed.ciphertext;
        distId = stableDistributionId(groupJid || "unknown", senderJid);
      }

      buf = wrapAsSignalSKMSG({ distributionId: distId, id, iteration, ciphertext: ct, senderJid });
    }
  }

  try {
    const result = await groupDecrypt(senderAddr, store as any, buf);
    return Buffer.from(result);
  } catch (e: any) {
    logger.error("signal-manager", `groupDecrypt failed: ${e.message} (op: ${e.operation})`);
    throw e;
  }
}

/** Check if a session exists for a given address. */
export async function hasSession(store: DeviceStore, address: ProtocolAddress): Promise<boolean> {
  const record = await store.getSession(address);
  return record != null;
}
