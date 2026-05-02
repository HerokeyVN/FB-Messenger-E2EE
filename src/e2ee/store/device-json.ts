import type { DeviceJSON } from "../../models/e2ee.ts";

export const DEVICE_STORE_SCHEMA_VERSION = 1;

export function parseDeviceJSON(json: string): DeviceJSON {
  return migrateDeviceJSON(JSON.parse(json) as DeviceJSON);
}

export function migrateDeviceJSON(data: DeviceJSON): DeviceJSON {
  return {
    ...data,
    schema_version: data.schema_version ?? DEVICE_STORE_SCHEMA_VERSION,
    next_pre_key_id: data.next_pre_key_id ?? 1,
    identities: data.identities ?? {},
    sessions: data.sessions ?? {},
    pre_keys: data.pre_keys ?? {},
    sender_keys: data.sender_keys ?? {},
    signed_pre_keys: data.signed_pre_keys ?? {},
  };
}

export function decodeBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

export function encodeBase64(value: Buffer | Uint8Array): string {
  return Buffer.from(value).toString("base64");
}

export function mapFromBase64Record<K extends string | number>(
  record: Record<string, string> | undefined,
  keyFromString: (key: string) => K,
): Map<K, Uint8Array> {
  const out = new Map<K, Uint8Array>();
  for (const [key, value] of Object.entries(record ?? {})) {
    out.set(keyFromString(key), Buffer.from(value, "base64"));
  }
  return out;
}

export function base64RecordFromMap<K extends string | number>(map: Map<K, Uint8Array>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of map) {
    out[String(key)] = encodeBase64(value);
  }
  return out;
}
