import { DeviceStore } from "../../../src/e2ee/store/device-store.ts";
import { generatePreKeys, generateSignedPreKey, buildPreKeyUploadPayload } from "../../../src/e2ee/signal/prekey-manager.ts";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs";

describe("prekey-manager", () => {
  let store: DeviceStore;
  let testPath: string;

  beforeEach(async () => {
    testPath = path.join(os.tmpdir(), `prekey-${Math.random().toString(36).slice(2)}.json`);
    store = await DeviceStore.fromFile(testPath);
  });

  afterEach(() => {
    if (fs.existsSync(testPath)) {
      fs.unlinkSync(testPath);
    }
  });

  it("should generate a batch of prekeys", async () => {
    const count = 5;
    const keys = await generatePreKeys(store, count);
    expect(keys.length).toBe(count);
    expect(keys[0]).toBeDefined();
    expect(keys[0]!.id).toBeDefined();
    expect(keys[0]!.record).toBeDefined();
    
    // Check if saved in store
    const record = await store.getPreKey(keys[0]!.id);
    expect(record).toBeDefined();
  });

  it("should generate a signed prekey", async () => {
    const record = await generateSignedPreKey(store);
    expect(record.id()).toBeDefined();
    expect(record.signature()).toBeDefined();
    
    // Check if saved in store
    const saved = await store.getSignedPreKey(record.id());
    expect(saved).toBeDefined();
  });

  it("should build an upload payload", async () => {
    await generateSignedPreKey(store);
    const preKeys = await generatePreKeys(store, 2);
    const payload = await buildPreKeyUploadPayload(store, preKeys);
    
    expect(payload.registrationId).toBe(store.registrationId);
    expect(payload.identityKey.length).toBe(33);
    expect(payload.signedPreKey.keyId).toBeDefined();
    expect(payload.preKeys.length).toBe(2);
  });
});
