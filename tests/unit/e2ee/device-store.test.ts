import { DeviceStore } from "../../../src/e2ee/store/device-store.ts";
import { jest } from "@jest/globals";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("DeviceStore", () => {
  let store: DeviceStore;
  let testPath: string;

  beforeEach(async () => {
    // Use a real temp file to avoid ESM mocking issues
    testPath = path.join(os.tmpdir(), `device-${Math.random().toString(36).slice(2)}.json`);
    store = await DeviceStore.fromFile(testPath);
  });

  afterEach(() => {
    if (fs.existsSync(testPath)) {
      fs.unlinkSync(testPath);
    }
  });

  describe("serialization", () => {
    it("should generate a new device if file missing", () => {
      expect(store.registrationId).toBeGreaterThan(0);
      expect(store.noiseKeyPriv).toBeDefined();
    });

    it("should export to JSON correctly", () => {
      const json = store.toJSON();
      expect(json.registration_id).toBe(store.registrationId);
      expect(json.noise_key_priv).toBe(store.noiseKeyPriv.toString("base64"));
    });
    
    it("should save and reload from file", async () => {
      const regId = store.registrationId;
      // Force a save (fromFile already saves if new, but let's be sure)
      (store as any).saveToFile();
      
      const newStore = await DeviceStore.fromFile(testPath);
      expect(newStore.registrationId).toBe(regId);
    });
  });

  describe("session management", () => {
    it("should store and retrieve sessions", async () => {
      const address = "12345:1";
      const record = Buffer.from("fake-session-record");
      
      (store as any).sessions.set(address, record);
      const retrieved = (store as any).sessions.get(address);
      expect(retrieved).toEqual(record);
    });
  });
});
