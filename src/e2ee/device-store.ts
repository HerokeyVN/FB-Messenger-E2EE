/**
 * E2EE DeviceStore - Layer 5
 *
 * Persists all Signal Protocol key material to a JSON file.
 * JSON schema is compatible with bridge-go DeviceJSON so existing device
 * files can be imported without re-registration.
 *
 * Implements the @signalapp/libsignal-client store interfaces:
 *   IdentityKeyStore, SessionStore, PreKeyStore, SignedPreKeyStore, SenderKeyStore
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { randomUUID } from "node:crypto";
import {
  Direction,
  IdentityKeyPair,
  IdentityKeyStore,
  KyberPreKeyRecord,
  KyberPreKeyStore,
  PreKeyRecord,
  PreKeyStore,
  PrivateKey,
  ProtocolAddress,
  PublicKey,
  SenderKeyRecord,
  SenderKeyStore,
  SessionRecord,
  SessionStore,
  SignedPreKeyRecord,
  SignedPreKeyStore,
} from "@signalapp/libsignal-client";
import { logger } from "../utils/logger.ts";

/** Cast for strict libsignal params */
const u8 = (b: Buffer | Uint8Array): Buffer => Buffer.isBuffer(b) ? b : Buffer.from(b.buffer, b.byteOffset, b.byteLength);

import type { DeviceJSON, NoiseKeyPair, ProtocolAddressStr, SenderKeyId } from "../models/e2ee.ts";
export type { DeviceJSON, NoiseKeyPair, ProtocolAddressStr, SenderKeyId };

// DeviceStore

export class DeviceStore
  implements
  IdentityKeyStore,
  SessionStore,
  PreKeyStore,
  SignedPreKeyStore,
  SenderKeyStore,
  KyberPreKeyStore {
  private identities: Map<ProtocolAddressStr, Uint8Array> = new Map();
  private sessions: Map<ProtocolAddressStr, Uint8Array> = new Map();
  private preKeys: Map<number, Uint8Array> = new Map();
  private signedPreKeys: Map<number, Uint8Array> = new Map();
  private senderKeys: Map<SenderKeyId, Uint8Array> = new Map();
  private kyberKeys: Map<number, Uint8Array> = new Map();

  // Noise transport key (not Signal - used in Noise XX handshake)
  public noiseKeyPriv: Buffer;

  // Signal identity
  private identityKeyPriv: Buffer;
  public signedPreKeyPriv: Buffer;
  public signedPreKeyId: number;
  public signedPreKeySig: Buffer;
  public registrationId: number;

  // Messenger-specific
  public advSecretKey: Buffer;
  public facebookUUID: string;
  public jidUser?: string;
  public jidDevice?: number;

  public nextPreKeyId: number;

  private readonly path: string;
  private onDataChanged?: (json: string) => void;

  private constructor(path: string) {
    this.path = path;
    // Will be populated by factory methods
    this.noiseKeyPriv = Buffer.alloc(32);
    this.identityKeyPriv = Buffer.alloc(32);
    this.signedPreKeyPriv = Buffer.alloc(32);
    this.signedPreKeyId = 1;
    this.signedPreKeySig = Buffer.alloc(64);
    this.registrationId = 0;
    this.advSecretKey = Buffer.alloc(32);
    this.facebookUUID = "";
    this.nextPreKeyId = 1;
  }

  // Factory methods

  /** Create or load from a JSON file path. */
  /** Mock for bridge compatibility */
  setJIDs(id1: string, id2: string): void {
    // No-op for now, just to satisfy controller
  }

  static async fromFile(path: string): Promise<DeviceStore> {
    const ds = new DeviceStore(path);
    if (existsSync(path)) {
      const raw = readFileSync(path, "utf8");
      await ds.loadJSON(JSON.parse(raw) as DeviceJSON);
    } else {
      await ds.initNew();
      ds.saveToFile();
    }
    return ds;
  }

  /** Load from a JSON string (no file I/O). */
  static async fromData(
    json: string,
    onDataChanged?: (json: string) => void,
  ): Promise<DeviceStore> {
    const ds = new DeviceStore("");
    ds.onDataChanged = onDataChanged;
    await ds.loadJSON(JSON.parse(json) as DeviceJSON);
    return ds;
  }

  /** Create a fresh in-memory device (nothing persisted). */
  static async memoryOnly(): Promise<DeviceStore> {
    const ds = new DeviceStore("");
    await ds.initNew();
    return ds;
  }

  // Init / load

  private async initNew(): Promise<void> {
    const { PrivateKey: PK, IdentityKeyPair: IKP } = await import("@signalapp/libsignal-client");

    this.noiseKeyPriv = randomBytes(32);

    // Generate X25519 identity key
    const identityPriv = PK.generate();
    this.identityKeyPriv = Buffer.from(identityPriv.serialize());

    // Generate signed prekey (also X25519, signed by identity key)
    const signedPreKeyPriv = PK.generate();
    this.signedPreKeyPriv = Buffer.from(signedPreKeyPriv.serialize());
    this.signedPreKeyId = 1;
    // Sign the signed prekey public key using identity key
    this.signedPreKeySig = Buffer.from(
      identityPriv.sign(signedPreKeyPriv.getPublicKey().serialize()),
    );

    // Registration ID: random 14-bit uint (range 1–16380)
    const buf = randomBytes(2);
    this.registrationId = ((buf.readUInt16BE(0) & 0x3fff) || 1);

    this.advSecretKey = randomBytes(32);
    this.facebookUUID = randomUUID();
    logger.debug("DeviceStore", "Generated new Facebook UUID:", this.facebookUUID);
    this.nextPreKeyId = 1;
  }

  private async loadJSON(d: DeviceJSON): Promise<void> {
    const b64 = (s: string) => Buffer.from(s, "base64");

    this.noiseKeyPriv = b64(d.noise_key_priv);
    this.identityKeyPriv = b64(d.identity_key_priv);
    this.signedPreKeyPriv = b64(d.signed_pre_key_priv);
    this.signedPreKeyId = d.signed_pre_key_id;
    this.signedPreKeySig = b64(d.signed_pre_key_sig);
    this.registrationId = d.registration_id;
    this.advSecretKey = b64(d.adv_secret_key);
    this.facebookUUID = d.facebook_uuid;
    this.jidUser = d.jid_user;
    this.jidDevice = d.jid_device;
    this.nextPreKeyId = d.next_pre_key_id ?? 1;

    for (const [k, v] of Object.entries(d.identities ?? {})) {
      this.identities.set(k as ProtocolAddressStr, Buffer.from(v, "base64"));
    }
    for (const [k, v] of Object.entries(d.sessions ?? {})) {
      this.sessions.set(k as ProtocolAddressStr, Buffer.from(v, "base64"));
    }
    for (const [k, v] of Object.entries(d.pre_keys ?? {})) {
      this.preKeys.set(Number(k), Buffer.from(v, "base64"));
    }
    for (const [k, v] of Object.entries(d.sender_keys ?? {})) {
      this.senderKeys.set(k as SenderKeyId, Buffer.from(v, "base64"));
    }
    for (const [k, v] of Object.entries((d as any).signed_pre_keys ?? {})) {
      this.signedPreKeys.set(Number(k), Buffer.from(v as string, "base64"));
    }
  }

  // Serialization

  toJSON(): DeviceJSON {
    const b64 = (b: Buffer) => b.toString("base64");
    const d: DeviceJSON = {
      noise_key_priv: b64(this.noiseKeyPriv),
      identity_key_priv: b64(this.identityKeyPriv),
      signed_pre_key_priv: b64(this.signedPreKeyPriv),
      signed_pre_key_id: this.signedPreKeyId,
      signed_pre_key_sig: b64(this.signedPreKeySig),
      registration_id: this.registrationId,
      adv_secret_key: b64(this.advSecretKey),
      facebook_uuid: this.facebookUUID,
      next_pre_key_id: this.nextPreKeyId,
      identities: {},
      sessions: {},
      pre_keys: {},
      sender_keys: {},
    };
    if (this.jidUser) d.jid_user = this.jidUser;
    if (this.jidDevice) d.jid_device = this.jidDevice;

    for (const [k, v] of this.identities) d.identities![k] = Buffer.from(v).toString("base64");
    for (const [k, v] of this.sessions) d.sessions![k] = Buffer.from(v).toString("base64");
    for (const [k, v] of this.preKeys) d.pre_keys![String(k)] = Buffer.from(v).toString("base64");
    (d as any).signed_pre_keys = {};
    for (const [k, v] of this.signedPreKeys) (d as any).signed_pre_keys[String(k)] = Buffer.from(v).toString("base64");
    for (const [k, v] of this.senderKeys) d.sender_keys![k] = Buffer.from(v).toString("base64");

    return d;
  }

  getData(): string {
    return JSON.stringify(this.toJSON(), null, 2);
  }

  saveToFile(): void {
    if (this.path) {
      writeFileSync(this.path, this.getData(), { mode: 0o600 });
    } else if (this.onDataChanged) {
      this.onDataChanged(this.getData());
    }
  }

  public getIdentityPublicKey(): Buffer {
    return Buffer.from(PrivateKey.deserialize(u8(this.identityKeyPriv)).getPublicKey().serialize()).subarray(1);
  }

  public getIdentityPrivateKey(): Buffer {
    return this.identityKeyPriv;
  }

  public getSignedPreKeyPublicKey(): Buffer {
    return Buffer.from(PrivateKey.deserialize(u8(this.signedPreKeyPriv)).getPublicKey().serialize()).subarray(1);
  }

  // libsignal IdentityKeyStore

  async getIdentityKey(): Promise<PrivateKey> {
    return PrivateKey.deserialize(u8(this.identityKeyPriv));
  }

  async _getIdentityKey(): Promise<any> {
    const key = PrivateKey.deserialize(u8(this.identityKeyPriv));
    return (key as any)._nativeHandle;
  }

  async getLocalRegistrationId(): Promise<number> {
    return this.registrationId;
  }

  async _getLocalRegistrationId(): Promise<number> {
    return this.registrationId;
  }

  async _saveIdentity(name: any, key: any): Promise<boolean> {
    return this.saveIdentity(
      ProtocolAddress._fromNativeHandle(name),
      PublicKey._fromNativeHandle(key),
    );
  }

  async saveIdentity(name: ProtocolAddress, key: PublicKey): Promise<boolean> {
    const addr = name.toString() as ProtocolAddressStr;
    const existing = this.identities.get(addr);
    const keyBytes = key.serialize();
    const changed = existing == null || !Buffer.from(existing).equals(Buffer.from(keyBytes));
    this.identities.set(addr, new Uint8Array(keyBytes));
    this.saveToFile();
    return changed;
  }

  async isTrustedIdentity(
    name: ProtocolAddress,
    key: PublicKey,
    _direction: Direction,
  ): Promise<boolean> {
    const addr = name.toString();
    const existing = this.identities.get(addr as ProtocolAddressStr);
    if (existing == null) return true; // First use -> trust on first use (TOFU)
    return Buffer.from(existing).equals(Buffer.from(key.serialize()));
  }

  async _isTrustedIdentity(name: any, key: any, sending: boolean): Promise<boolean> {
    // Synchronous version for Rust bridge
    const addr = ProtocolAddress._fromNativeHandle(name).toString();
    const existing = this.identities.get(addr as ProtocolAddressStr);
    if (existing == null) return true;
    const pub = PublicKey._fromNativeHandle(key);
    return Buffer.from(existing).equals(Buffer.from(pub.serialize()));
  }

  async getIdentity(name: ProtocolAddress): Promise<PublicKey | null> {
    const bytes = this.identities.get(name.toString() as ProtocolAddressStr);
    if (!bytes) return null;
    return PublicKey.deserialize(Buffer.from(bytes));
  }

  async _getIdentity(name: any): Promise<any> {
    const key = await this.getIdentity(ProtocolAddress._fromNativeHandle(name));
    return key ? (key as any)._nativeHandle : null;
  }

  // libsignal SessionStore

  async saveSession(name: ProtocolAddress, record: SessionRecord): Promise<void> {
    this.sessions.set(name.toString() as ProtocolAddressStr, record.serialize());
    this.saveToFile();
  }

  async _saveSession(name: any, record: any): Promise<void> {
    return this.saveSession(
      ProtocolAddress._fromNativeHandle(name),
      SessionRecord._fromNativeHandle(record),
    );
  }

  async getSession(name: ProtocolAddress): Promise<SessionRecord | null> {
    const bytes = this.sessions.get(name.toString() as ProtocolAddressStr);
    if (!bytes) return null;
    return SessionRecord.deserialize(Buffer.from(bytes));
  }

  async _getSession(name: any): Promise<any> {
    const r = await this.getSession(ProtocolAddress._fromNativeHandle(name));
    return r ? (r as any)._nativeHandle : null;
  }

  async getExistingSessions(addresses: ProtocolAddress[]): Promise<SessionRecord[]> {
    const records: SessionRecord[] = [];
    for (const addr of addresses) {
      const r = await this.getSession(addr);
      if (r) records.push(r);
    }
    return records;
  }

  // libsignal PreKeyStore

  async savePreKey(id: number, record: PreKeyRecord): Promise<void> {
    logger.debug("DeviceStore", `savePreKey: ID=${id}`);
    this.preKeys.set(id, record.serialize());
    this.saveToFile();
  }

  async _savePreKey(id: number, record: any): Promise<void> {
    return this.savePreKey(id, PreKeyRecord._fromNativeHandle(record));
  }

  async getPreKey(id: number): Promise<PreKeyRecord> {
    const bytes = this.preKeys.get(id);
    if (!bytes) throw new Error(`PreKey ${id} not found`);
    return PreKeyRecord.deserialize(Buffer.from(bytes));
  }

  async _getPreKey(id: number): Promise<any> {
    const r = await this.getPreKey(id);
    return (r as any)._nativeHandle;
  }

  async removePreKey(id: number): Promise<void> {
    this.preKeys.delete(id);
    this.saveToFile();
  }

  async _removePreKey(id: number): Promise<void> {
    return this.removePreKey(id);
  }

  // libsignal SignedPreKeyStore

  async saveSignedPreKey(id: number, record: SignedPreKeyRecord): Promise<void> {
    this.signedPreKeys.set(id, Buffer.from(record.serialize()));
    this.signedPreKeyId = id; // Keep track of latest
    this.saveToFile();
  }

  async _saveSignedPreKey(id: number, record: any): Promise<void> {
    return this.saveSignedPreKey(id, SignedPreKeyRecord._fromNativeHandle(record));
  }

  async getSignedPreKey(id: number): Promise<SignedPreKeyRecord> {
    logger.debug("DeviceStore", `getSignedPreKey called for ID: ${id} (type: ${typeof id})`);
    logger.debug("DeviceStore", `Current signedPreKeys IDs:`, Array.from(this.signedPreKeys.keys()));
    const bytes = this.signedPreKeys.get(id);
    if (!bytes) {
      logger.debug("DeviceStore", `Key ${id} not found in map.`);
      // Fallback for transition if we only have the old fields
      if (id === this.signedPreKeyId && this.signedPreKeyPriv && this.signedPreKeySig) {
        logger.debug("DeviceStore", `Using fallback for key ${id}`);
        const priv = PrivateKey.deserialize(u8(this.signedPreKeyPriv));
        return SignedPreKeyRecord.new(
          this.signedPreKeyId,
          0,
          priv.getPublicKey(),
          priv,
          u8(this.signedPreKeySig),
        );
      }
      throw new Error(`SignedPreKey ${id} not found`);
    }
    return SignedPreKeyRecord.deserialize(u8(bytes));
  }

  async _getSignedPreKey(id: number): Promise<any> {
    const r = await this.getSignedPreKey(id);
    return (r as any)._nativeHandle;
  }

  // libsignal SenderKeyStore


  async saveSenderKey(senderAddress: ProtocolAddress, distributionId: string, record: SenderKeyRecord): Promise<void> {
    const key = `${senderAddress.toString()}::${distributionId}`;
    logger.debug("DeviceStore", `saveSenderKey: ${key}`);
    this.senderKeys.set(key as SenderKeyId, record.serialize());
    this.saveToFile();
  }

  async _saveSenderKey(sender: any, distributionId: any, record: any): Promise<void> {
    return this.saveSenderKey(
      ProtocolAddress._fromNativeHandle(sender),
      distributionId.toString(),
      SenderKeyRecord._fromNativeHandle(record),
    );
  }

  async getSenderKey(senderAddress: ProtocolAddress, distributionId: string): Promise<SenderKeyRecord> {
    const key = `${senderAddress.toString()}::${distributionId}`;
    const bytes = this.senderKeys.get(key as SenderKeyId);
    logger.debug("DeviceStore", `getSenderKey: ${key}, found=${!!bytes}`);
    if (!bytes) return null as any;
    return SenderKeyRecord.deserialize(Buffer.from(bytes));
  }

  async _getSenderKey(sender: any, distributionId: any): Promise<any> {
    const r = await this.getSenderKey(
      ProtocolAddress._fromNativeHandle(sender),
      distributionId.toString(),
    );
    return r ? (r as any)._nativeHandle : null;
  }

  // libsignal KyberPreKeyStore (Memory only - Messenger doesn't use Kyber)

  async saveKyberPreKey(id: number, record: KyberPreKeyRecord): Promise<void> {
    this.kyberKeys.set(id, Buffer.from(record.serialize()));
  }

  async _saveKyberPreKey(id: number, record: any): Promise<void> {
    return this.saveKyberPreKey(id, KyberPreKeyRecord._fromNativeHandle(record));
  }

  async getKyberPreKey(id: number): Promise<KyberPreKeyRecord> {
    const data = this.kyberKeys.get(id);
    if (!data) throw new Error(`Kyber pre-key ${id} not found`);
    return KyberPreKeyRecord.deserialize(u8(data));
  }

  async _getKyberPreKey(id: number): Promise<any> {
    const r = await this.getKyberPreKey(id);
    return (r as any)._nativeHandle;
  }

  async markKyberPreKeyUsed(id: number): Promise<void> {
    this.kyberKeys.delete(id);
  }

  async _markKyberPreKeyUsed(id: number): Promise<void> {
    return this.markKyberPreKeyUsed(id);
  }

  // Convenience: build IdentityKeyPair for libsignal operations

  async getIdentityKeyPair(): Promise<IdentityKeyPair> {
    // getIdentityKeyPair() is a concrete method in IdentityKeyStore base class
    // that calls getIdentityKey() - replicate it here since we use implements
    const priv = await this.getIdentityKey();
    return new IdentityKeyPair(priv.getPublicKey(), priv);
  }

  /** Get a fresh unused prekey ID and bump the counter */
  allocPreKeyId(): number {
    return this.nextPreKeyId++;
  }

  /** True if store has an established session for this address */
  hasSession(address: string): boolean {
    return this.sessions.has(address as ProtocolAddressStr);
  }

  getPreKeyCount(): number {
    return this.preKeys.size;
  }
}
