/**
 * E2EE PreKey Manager - Layer 2 (Signal Protocol)
 *
 * Manages prekey generation and the IQ stanzas needed to:
 *   - Upload prekeys to the WhatsApp/Messenger server on registration
 *   - Fetch prekey bundles for recipients before establishing sessions
 *
 * Reference: whatsmeow/prekeys.go
 */

import {
  PrivateKey,
  PreKeyRecord,
  SignedPreKeyRecord,
  PreKeyBundle,
  KEMKeyPair,
  KEMPublicKey,
  PublicKey,
} from "@signalapp/libsignal-client";
import type { DeviceStore } from "./device-store.ts";
import { type GeneratedPreKey, type PreKeyUploadPayload, type RawPreKeyBundle } from "../models/e2ee.ts";
export type { GeneratedPreKey, PreKeyUploadPayload, RawPreKeyBundle };

export const INITIAL_PREKEY_COUNT = 812;  // First registration batch
export const WANTED_PREKEY_COUNT = 50;   // Normal replenishment batch
export const MIN_PREKEY_COUNT = 5;    // Trigger replenishment below this

// Cast Uint8Array -> Buffer for strict libsignal params
const u8 = (b: Uint8Array | Buffer): Buffer => Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);


/** Generate `count` fresh one-time prekeys and store them in the DeviceStore. */
export async function generatePreKeys(
  store: DeviceStore,
  count: number = WANTED_PREKEY_COUNT,
): Promise<GeneratedPreKey[]> {
  const result: GeneratedPreKey[] = [];
  for (let i = 0; i < count; i++) {
    const id = store.allocPreKeyId();
    const priv = PrivateKey.generate();
    const record = PreKeyRecord.new(id, priv.getPublicKey(), priv);
    await store.savePreKey(id, record);
    result.push({ id, record });
  }
  return result;
}

/** Generate or refresh the signed prekey and store it. */
export async function generateSignedPreKey(store: DeviceStore): Promise<SignedPreKeyRecord> {
  const identityPriv = await store.getIdentityKey();
  const priv = PrivateKey.generate();
  const pub = priv.getPublicKey();
  const sig = identityPriv.sign(pub.serialize());
  const id = store.signedPreKeyId + 1;
  const record = SignedPreKeyRecord.new(id, Date.now(), pub, priv, u8(sig));
  await store.saveSignedPreKey(id, record);
  return record;
}


export async function buildPreKeyUploadPayload(
  store: DeviceStore,
  preKeys: GeneratedPreKey[],
): Promise<PreKeyUploadPayload> {
  const idPair = await store.getIdentityKeyPair();
  const sPreKey = await store.getSignedPreKey(store.signedPreKeyId);

  return {
    registrationId: store.registrationId,
    // Use serialize() (33-byte DER) for consistency - server accepts both formats
    // getPublicKeyBytes() returns 32-byte raw; serialize() returns 33-byte compressed DER
    identityKey: idPair.publicKey.serialize(),
    signedPreKey: {
      keyId: sPreKey.id(),
      publicKey: sPreKey.publicKey().serialize(),
      signature: sPreKey.signature(),
    },
    preKeys: preKeys.map(pk => ({
      keyId: pk.id,
      publicKey: pk.record.publicKey().serialize(),
    })),
  };
}


export function buildPreKeyBundle(raw: RawPreKeyBundle): PreKeyBundle {
  const identityKey = PublicKey_deserialize(raw.identityKey);
  const spkPub = PublicKey_deserialize(raw.signedPreKey.publicKey);

  // Messenger doesn't use Kyber PQ prekeys, but PreKeyBundle.new() requires
  // real Kyber objects with a valid signature.
  // If the raw bundle includes a pre-computed Kyber field, use it directly.
  // Otherwise generate a dummy Kyber key and sign it with a new ephemeral identity
  // key just to satisfy the API. This is safe for Messenger since the server
  // never sends Kyber material and the recipient won't verify it.
  let kyberPub: import("@signalapp/libsignal-client").KEMPublicKey;
  let kyberSig: Uint8Array;
  let kyberKeyId: number;

  if (raw.kyberPreKey) {
    kyberPub = KEMPublicKey.deserialize(u8(raw.kyberPreKey.publicKey));
    kyberSig = u8(raw.kyberPreKey.signature);
    kyberKeyId = raw.kyberPreKey.keyId;
  } else {
    // No Kyber data from server (Messenger) - generate dummy and self-sign.
    // We use a freshly generated ephemeral identity to sign since we don’t
    // have the recipient’s private identity key.
    const dummyKyber = KEMKeyPair.generate();
    const ephemeralPriv = PrivateKey.generate();
    kyberPub = dummyKyber.getPublicKey();
    kyberSig = u8(ephemeralPriv.sign(kyberPub.serialize()));
    kyberKeyId = 1;
    // Note: processPreKeyBundle verifies kyber sig against identityKey, so this
    // will fail validation. We need a different approach for no-Kyber bundles.
    // See comment below - we use the recipient’s identity key bytes to sign.
    //
    // WORKAROUND: We can’t sign with recipient’s private key. Instead, provide
    // a dedicated dummy Kyber identity priv for signing, and override identityKey
    // in the bundle with our dummy pub. But that breaks identity verification.
    //
    // ACTUAL FIX: Callers must provide kyberPreKey when they have access to the
    // recipient’s private key (e.g., in tests). For production Messenger, the
    // server response will include kyber_prekey fields even if they’re dummy.
    // For now, throw an error to force callers to provide kyber data.
    throw new Error(
      "buildPreKeyBundle: kyberPreKey field required in libsignal 0.92. " +
      "For Messenger (no Kyber), callers must generate a dummy KEMKeyPair, " +
      "sign it with the recipient’s identity private key, and include it in RawPreKeyBundle."
    );
  }

  if (raw.preKey) {
    const pkPub = PublicKey_deserialize(raw.preKey.publicKey);
    return PreKeyBundle.new(
      raw.registrationId,
      raw.deviceId,
      raw.preKey.keyId,
      pkPub,
      raw.signedPreKey.keyId,
      spkPub,
      u8(raw.signedPreKey.signature),
      identityKey,
      kyberKeyId,
      kyberPub,
      u8(kyberSig),
    );
  }

  return PreKeyBundle.new(
    raw.registrationId,
    raw.deviceId,
    null,
    null,
    raw.signedPreKey.keyId,
    spkPub,
    u8(raw.signedPreKey.signature),
    identityKey,
    kyberKeyId,
    kyberPub,
    u8(kyberSig),
  );
}

// Sync PublicKey deserialize helper (libsignal 0.92 is sync)
function PublicKey_deserialize(bytes: Uint8Array): PublicKey {
  return PublicKey.deserialize(u8(bytes));
}
