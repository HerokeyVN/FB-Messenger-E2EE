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

import type { DeviceStore } from "./device-store.ts";
import type { RawPreKeyBundle } from "./prekey-manager.ts";
import { buildPreKeyBundle } from "./prekey-manager.ts";
import {
  stableDistributionId,
  getMockPrivateKey,
  wrapAsSignalSKMSG,
  parseFBProtobufSKMSG,
  uuidStringify,
  parseFBProtobufSKDM
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
 * Build a ProtocolAddress from a JID string.
 * Format: "userId:deviceId@server" or "userId@server" (deviceId defaults to 1)
 */
export function jidToAddress(jid: string): ProtocolAddress {
  const [userPart] = jid.split("@");
  const parts = (userPart ?? jid).split(".");
  const user = parts[0] ?? jid;
  const device = parts[1] ? Number(parts[1]) : 1;
  return ProtocolAddress.new(user, device);
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
  const distributionId = stableDistributionId(groupJid, senderJid);
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

  // Facebook-style signature-less SKDM (version 0x33)
  if (buf[0] === 0x33) {
    let distributionId: string;
    let chainId: number = 0;
    let iteration: number = 0;
    let chainKey: Buffer = Buffer.alloc(0);

    if (buf.length === 53) {
      // Legacy Binary FB SKDM
      logger.debug("signal-manager", `Processing Legacy FB SKDM: len=${buf.length}`);
      distributionId = uuidStringify(buf.slice(1, 17));
      chainId = buf.readUInt32BE(17);
      chainKey = buf.slice(21, 53);
    } else {
      // Protobuf FB SKDM
      const parsed = parseFBProtobufSKDM(buf.slice(1));
      if (!parsed) throw new Error("Failed to parse Facebook Protobuf SKDM");
      chainId = parsed.chainId;
      iteration = parsed.iteration;
      chainKey = parsed.chainKey;
      distributionId = stableDistributionId(groupJid || "unknown", senderJid);
    }

    logger.debug("signal-manager", `Processing FB SKDM: distId=${distributionId}, chainId=${chainId}, iter=${iteration}`);

    // We MUST use the Mock Public Key to verify spoofed SKMSG signatures later
    const signalPk = getMockPrivateKey(senderJid).getPublicKey();

    const skdm = (SenderKeyDistributionMessage as any)._new(
      3, // version
      distributionId,
      chainId,
      iteration,
      chainKey,
      signalPk
    );
    await processSenderKeyDistributionMessage(senderAddr, skdm, store as any);
  } else {
    // Normal Signal SKDM
    const skdm = SenderKeyDistributionMessage.deserialize(buf);
    await processSenderKeyDistributionMessage(senderAddr, skdm, store as any);
  }
}

/** Encrypt plaintext for a group using sender key. */
export async function encryptGroup(
  store: DeviceStore,
  groupJid: string,
  senderJid: string,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const distributionId = stableDistributionId(groupJid, senderJid);
  const senderAddr = jidToAddress(senderJid);
  const cipherMsg = await groupEncrypt(senderAddr, distributionId, store as any, u8(plaintext));
  return cipherMsg.serialize();
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
  if (buf[0] === 0x33 && buf.length < 512) {
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
