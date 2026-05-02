import { DeviceStore } from "../../../src/e2ee/store/device-store.ts";
import { Direction, PrivateKey, ProtocolAddress } from "@signalapp/libsignal-client";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("DeviceStore", () => {
  let store: DeviceStore;
  let testPath: string;

  beforeEach(async () => {
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
      expect(store.toJSON().schema_version).toBe(1);
    });

    it("should export to JSON correctly", () => {
      const json = store.toJSON();
      expect(json.registration_id).toBe(store.registrationId);
      expect(json.noise_key_priv).toBe(store.noiseKeyPriv.toString("base64"));
      expect(json.identities).toEqual({});
      expect(json.sessions).toEqual({});
      expect(json.sender_keys).toEqual({});
    });

    it("should save and reload from file without rotating identity", async () => {
      const regId = store.registrationId;
      const identity = store.getIdentityPrivateKey().toString("base64");
      (store as any).saveToFile();

      const newStore = await DeviceStore.fromFile(testPath);
      expect(newStore.registrationId).toBe(regId);
      expect(newStore.getIdentityPrivateKey().toString("base64")).toBe(identity);
    });

    it("should load old JSON through migration defaults", async () => {
      const oldJson: any = store.toJSON();
      delete oldJson.schema_version;
      delete oldJson.identities;
      delete oldJson.sessions;
      delete oldJson.pre_keys;
      delete oldJson.sender_keys;
      delete oldJson.signed_pre_keys;
      delete oldJson.next_pre_key_id;

      const loaded = await DeviceStore.fromData(JSON.stringify(oldJson));
      expect(loaded.toJSON()).toMatchObject({
        schema_version: 1,
        next_pre_key_id: 1,
        identities: {},
        sessions: {},
        pre_keys: {},
        sender_keys: {},
        signed_pre_keys: {},
      });
    });
  });

  describe("Messenger JID persistence", () => {
    it("should parse dot and colon device JIDs and trigger onDataChanged only on changes", async () => {
      const changes: string[] = [];
      const memoryStore = await DeviceStore.fromData(store.getData(), json => changes.push(json));

      memoryStore.setJIDs("100042415119261.160@msgr", "");
      memoryStore.setJIDs("100042415119261.160@msgr", "");
      expect(memoryStore.jidUser).toBe("100042415119261");
      expect(memoryStore.jidDevice).toBe(160);
      expect(changes).toHaveLength(1);

      memoryStore.setJIDs("100042415119261:161@msgr", "");
      expect(memoryStore.jidDevice).toBe(161);
      expect(changes).toHaveLength(2);
      expect(JSON.parse(changes.at(-1)!).jid_device).toBe(161);
    });

    it("should ignore invalid non-Messenger JIDs", () => {
      store.setJIDs("100@s.whatsapp.net", "");
      expect(store.jidUser).toBeUndefined();
      expect(store.jidDevice).toBeUndefined();
    });
  });

  describe("identity and in-memory protocol maps", () => {
    it("should save identities, detect changes, and enforce trust-on-first-use", async () => {
      const address = ProtocolAddress.new("1001", 2);
      const keyA = PrivateKey.generate().getPublicKey();
      const keyB = PrivateKey.generate().getPublicKey();

      await expect(store.isTrustedIdentity(address, keyA, Direction.Sending)).resolves.toBe(true);
      await expect(store.saveIdentity(address, keyA)).resolves.toBe(true);
      await expect(store.saveIdentity(address, keyA)).resolves.toBe(false);
      await expect(store.isTrustedIdentity(address, keyA, Direction.Sending)).resolves.toBe(true);
      await expect(store.isTrustedIdentity(address, keyB, Direction.Sending)).resolves.toBe(false);
      store.autoTrust = true;
      await expect(store.isTrustedIdentity(address, keyB, Direction.Sending)).resolves.toBe(true);
    });

    it("should report existing sessions without deserializing unrelated addresses", () => {
      (store as any).sessions.set("1001.2", Buffer.from("fake-session-record"));

      expect(store.hasSession("1001.2")).toBe(true);
      expect(store.hasSession("1001.3")).toBe(false);
    });

    it("should list sender-key distribution IDs for one sender only", () => {
      const sender = ProtocolAddress.new("1001", 2);
      (store as any).senderKeys.set("1001.2::dist-a", Buffer.from("a"));
      (store as any).senderKeys.set("1001.2::dist-b", Buffer.from("b"));
      (store as any).senderKeys.set("1001.3::dist-c", Buffer.from("c"));

      expect(store.listSenderKeyDistributionIds(sender).sort()).toEqual(["dist-a", "dist-b"]);
    });
  });
});
