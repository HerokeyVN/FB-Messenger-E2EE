import { jest, describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import {
  buildParticipantListHash,
  normalizeDMThreadToJid,
  parseMessengerJid,
  sameMessengerDevice,
  sameMessengerUser,
  toADString,
  toBareMessengerJid,
  uniqueJids,
} from "../../../src/e2ee/application/fanout-planner.ts";
import { OutboundMessageCache, type RecentE2EEOutgoing } from "../../../src/e2ee/application/outbound-message-cache.ts";
import { PreKeyMaintenance } from "../../../src/e2ee/application/prekey-maintenance.ts";
import { E2EERetryManager } from "../../../src/e2ee/application/retry-manager.ts";
import { unmarshal, type Node } from "../../../src/e2ee/transport/binary/wa-binary.ts";

const makeOutgoing = (overrides: Partial<RecentE2EEOutgoing> = {}): RecentE2EEOutgoing => ({
  kind: "dm",
  chatJid: "200.0@msgr",
  messageId: "m1",
  messageType: "text",
  messageApp: Buffer.from("message-app"),
  frankingTag: Buffer.from("franking-tag"),
  createdAtMs: 1_000,
  ...overrides,
});

const findChild = (node: Node, tag: string): Node | undefined => {
  const children = Array.isArray(node.content) ? node.content as Node[] : [];
  return children.find((child) => child.tag === tag);
};

describe("E2EE application helpers", () => {
  let logSpy: jest.SpiedFunction<typeof console.log>;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  describe("fanout-planner", () => {
    it("normalizes Messenger device JIDs to stable bare DM chat JIDs", () => {
      expect(normalizeDMThreadToJid("100042415119261")).toBe("100042415119261.0@msgr");
      expect(normalizeDMThreadToJid("100042415119261.160@msgr")).toBe("100042415119261.0@msgr");
      expect(toBareMessengerJid("100042415119261:160@msgr")).toBe("100042415119261.0@msgr");
    });

    it("parses dot, colon, and AD-style Messenger device identifiers", () => {
      expect(parseMessengerJid("100.160@msgr")).toMatchObject({ user: "100", device: 160, server: "msgr" });
      expect(parseMessengerJid("100:160@msgr")).toMatchObject({ user: "100", device: 160, server: "msgr" });
      expect(parseMessengerJid("100.0:160@msgr")).toMatchObject({ user: "100", device: 160, server: "msgr" });
      expect(toADString("100.160@msgr")).toBe("100.0:160@msgr");
    });

    it("deduplicates devices by Messenger user and device while preserving first occurrence", () => {
      expect(uniqueJids(["100.1@msgr", "100:1@msgr", "100.2@msgr", "200.1@msgr"])).toEqual([
        "100.1@msgr",
        "100.2@msgr",
        "200.1@msgr",
      ]);
      expect(sameMessengerUser("100.1@msgr", "100.2@msgr")).toBe(true);
      expect(sameMessengerDevice("100.1@msgr", "100:1@msgr")).toBe(true);
      expect(sameMessengerDevice("100.1@msgr", "100.2@msgr")).toBe(false);
    });

    it("builds participant hashes independent of input order and JID separator style", () => {
      const hashA = buildParticipantListHash(["200.2@msgr", "100.1@msgr"]);
      const hashB = buildParticipantListHash(["100:1@msgr", "200:2@msgr"]);

      expect(hashA).toBe(hashB);
      expect(hashA).toMatch(/^2:[A-Za-z0-9+/]{8}$/);
    });
  });

  describe("OutboundMessageCache", () => {
    it("returns remembered records and prunes expired entries", () => {
      const nowMs = Date.now();
      const cache = new OutboundMessageCache({ ttlMs: 100, maxEntries: 10 });
      cache.remember(makeOutgoing({ messageId: "fresh", createdAtMs: nowMs }));
      cache.remember(makeOutgoing({ messageId: "old", createdAtMs: nowMs - 200 }));

      cache.prune(nowMs + 1);
      expect(cache.get("fresh")?.messageId).toBe("fresh");
      cache.prune(nowMs + 1);
      expect(cache.get("old")).toBeUndefined();
    });

    it("keeps only the newest records when maxEntries is exceeded", () => {
      const nowMs = Date.now();
      const cache = new OutboundMessageCache({ ttlMs: 10_000, maxEntries: 2 });
      cache.remember(makeOutgoing({ messageId: "m1", createdAtMs: nowMs }));
      cache.remember(makeOutgoing({ messageId: "m2", createdAtMs: nowMs }));
      cache.remember(makeOutgoing({ messageId: "m3", createdAtMs: nowMs }));

      expect(cache.get("m1")).toBeUndefined();
      expect(cache.get("m2")?.messageId).toBe("m2");
      expect(cache.get("m3")?.messageId).toBe("m3");

      cache.clear();
      expect(cache.get("m2")).toBeUndefined();
    });
  });

  describe("PreKeyMaintenance", () => {
    const oldEnv = process.env;

    beforeEach(() => {
      process.env = { ...oldEnv, FB_E2EE_PREKEY_MIN_COUNT: "5", FB_E2EE_PREKEY_UPLOAD_COUNT: "9" };
    });

    afterEach(() => {
      process.env = oldEnv;
      jest.useRealTimers();
    });

    it("uploads fresh prekeys when server count is below threshold", async () => {
      const uploadPreKeys = jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined);
      const maintenance = new PreKeyMaintenance({
        getSocket: () => ({}),
        getStore: () => ({}),
        getServerPreKeyCount: jest.fn<() => Promise<number>>().mockResolvedValue(4),
        uploadPreKeys,
      });

      await maintenance.sync("test");

      expect(uploadPreKeys).toHaveBeenCalledWith(9);
    });

    it("does not upload when disconnected or when server count is healthy", async () => {
      const uploadPreKeys = jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined);
      const disconnected = new PreKeyMaintenance({
        getSocket: () => null,
        getStore: () => ({}),
        getServerPreKeyCount: jest.fn<() => Promise<number>>().mockResolvedValue(0),
        uploadPreKeys,
      });
      await disconnected.sync("disconnected");

      const healthy = new PreKeyMaintenance({
        getSocket: () => ({}),
        getStore: () => ({}),
        getServerPreKeyCount: jest.fn<() => Promise<number>>().mockResolvedValue(5),
        uploadPreKeys,
      });
      await healthy.sync("healthy");

      expect(uploadPreKeys).not.toHaveBeenCalled();
    });


    it("starts periodic sync and stop cancels the interval", async () => {
      jest.useFakeTimers();
      process.env.FB_E2EE_PREKEY_SYNC_INTERVAL_MS = "100";
      const getServerPreKeyCount = jest.fn<() => Promise<number>>().mockResolvedValue(5);
      const maintenance = new PreKeyMaintenance({
        getSocket: () => ({}),
        getStore: () => ({}),
        getServerPreKeyCount,
        uploadPreKeys: jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined),
      });
      try {
        maintenance.start();
        await jest.advanceTimersByTimeAsync(100);
        expect(getServerPreKeyCount).toHaveBeenCalledTimes(1);

        maintenance.stop();
        await jest.advanceTimersByTimeAsync(100);
        expect(getServerPreKeyCount).toHaveBeenCalledTimes(1);
      } finally {
        maintenance.stop();
      }
    });

    it("does not start periodic sync when interval is disabled", async () => {
      jest.useFakeTimers();
      process.env.FB_E2EE_PREKEY_SYNC_INTERVAL_MS = "0";
      const getServerPreKeyCount = jest.fn<() => Promise<number>>().mockResolvedValue(0);
      const maintenance = new PreKeyMaintenance({
        getSocket: () => ({}),
        getStore: () => ({}),
        getServerPreKeyCount,
        uploadPreKeys: jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined),
      });

      maintenance.start();
      await jest.advanceTimersByTimeAsync(1_000);

      expect(getServerPreKeyCount).not.toHaveBeenCalled();
    });

    it("swallows sync errors after logging them", async () => {
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
      const maintenance = new PreKeyMaintenance({
        getSocket: () => ({}),
        getStore: () => ({}),
        getServerPreKeyCount: jest.fn<() => Promise<number>>().mockRejectedValue(new Error("count failed")),
        uploadPreKeys: jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined),
      });

      try {
        await expect(maintenance.sync("manual")).resolves.toBeUndefined();
        expect(errorSpy).toHaveBeenCalledWith(
          "PreKeyMaintenance",
          expect.stringContaining("Prekey sync failed (manual)"),
          expect.any(Error),
        );
      } finally {
        errorSpy.mockRestore();
      }
    });

  });

  describe("E2EERetryManager", () => {
    it("re-encrypts cached DM messages to the requesting device", async () => {
      const cache = new OutboundMessageCache({ ttlMs: 10_000 });
      cache.remember(makeOutgoing({ messageId: "dm-1", chatJid: "200.0@msgr", createdAtMs: Date.now() }));
      const socket = { sendFrame: jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined) };
      const client = {
        hasSession: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        encryptMessageAppForDevice: jest.fn<(recipientJid: string, selfJid: string, messageApp: Buffer, opts?: any) => Promise<{ type: "msg"; ciphertext: Buffer }>>()
          .mockResolvedValue({ type: "msg", ciphertext: Buffer.from("cipher") }),
      };
      const manager = new E2EERetryManager({
        cache,
        getClient: () => client as any,
        getSocket: () => socket as any,
        getSelfJid: () => "100.5@msgr",
        getPreKeyBundle: jest.fn() as any,
      });

      await manager.handleReceipt({
        tag: "receipt",
        attrs: { id: "dm-1", from: "200.9@msgr" },
        content: [{ tag: "retry", attrs: { id: "dm-1", count: "2", t: "123" } }],
      } as any);

      expect(client.encryptMessageAppForDevice).toHaveBeenCalledWith(
        "200.9@msgr",
        "100.5@msgr",
        Buffer.from("message-app"),
        { dsm: undefined },
      );
      expect(socket.sendFrame).toHaveBeenCalledTimes(1);
      const sent = unmarshal((socket.sendFrame as any).mock.calls[0][0]);
      expect(sent.attrs).toMatchObject({ to: "200.0@msgr", id: "dm-1", t: "123", device_fanout: "false" });
      expect(findChild(sent, "enc")?.attrs).toMatchObject({ type: "msg", count: "2" });
    });

    it("resends group messages with a fresh SKDM and backup directive", async () => {
      const cache = new OutboundMessageCache({ ttlMs: 10_000 });
      cache.remember(makeOutgoing({ kind: "group", messageId: "g-1", chatJid: "180@g.us", createdAtMs: Date.now() }));
      const socket = { sendFrame: jest.fn<(count: number) => Promise<void>>().mockResolvedValue(undefined) };
      const skdm = { groupId: "180@g.us", skdmBytes: Buffer.from("skdm"), distributionId: "dist" };
      const client = {
        hasSession: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        createSenderKeyDistributionPayload: jest.fn<(groupJid: string, selfJid: string) => Promise<typeof skdm>>().mockResolvedValue(skdm),
        encryptMessageAppForDevice: jest.fn<(recipientJid: string, selfJid: string, messageApp: Buffer, opts?: any) => Promise<{ type: "pkmsg"; ciphertext: Buffer }>>()
          .mockResolvedValue({ type: "pkmsg", ciphertext: Buffer.from("cipher") }),
      };
      const manager = new E2EERetryManager({
        cache,
        getClient: () => client as any,
        getSocket: () => socket as any,
        getSelfJid: () => "100.5@msgr",
        getPreKeyBundle: jest.fn() as any,
      });

      await manager.handleReceipt({
        tag: "receipt",
        attrs: { id: "g-1", participant: "200.9@msgr" },
        content: [{ tag: "retry", attrs: { id: "g-1", count: "1" } }],
      } as any);

      expect(client.createSenderKeyDistributionPayload).toHaveBeenCalledWith("180@g.us", "100.5@msgr");
      expect(client.encryptMessageAppForDevice).toHaveBeenCalledWith(
        "200.9@msgr",
        "100.5@msgr",
        Buffer.from("message-app"),
        { skdm, backupDirective: { messageId: "g-1", actionType: "UPSERT" } },
      );
      const sent = unmarshal((socket.sendFrame as any).mock.calls[0][0]);
      expect(sent.attrs).toMatchObject({ to: "180@g.us", participant: "200.9@msgr", id: "g-1" });
      expect(findChild(sent, "enc")?.attrs).toMatchObject({ type: "pkmsg", count: "1" });
    });

    it("establishes a session from retry receipt keys before resending", async () => {
      const cache = new OutboundMessageCache({ ttlMs: 10_000 });
      cache.remember(makeOutgoing({ messageId: "dm-keys", chatJid: "200.0@msgr", createdAtMs: Date.now() }));
      const socket = { sendFrame: jest.fn<(frame: Buffer) => Promise<void>>().mockResolvedValue(undefined) };
      const client = {
        establishSession: jest.fn<(jid: string, bundle: any) => Promise<void>>().mockResolvedValue(undefined),
        hasSession: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        encryptMessageAppForDevice: jest.fn<(recipientJid: string, selfJid: string, messageApp: Buffer, opts?: any) => Promise<{ type: "msg"; ciphertext: Buffer }>>()
          .mockResolvedValue({ type: "msg", ciphertext: Buffer.from("cipher") }),
      };
      const getPreKeyBundle = jest.fn<() => Promise<any>>().mockResolvedValue({});
      const manager = new E2EERetryManager({
        cache,
        getClient: () => client as any,
        getSocket: () => socket as any,
        getSelfJid: () => "100.5@msgr",
        getPreKeyBundle,
      });
      const registration = Buffer.alloc(4);
      registration.writeUInt32BE(0x01020304);

      await manager.handleReceipt({
        tag: "receipt",
        attrs: { id: "dm-keys", from: "200.9@msgr" },
        content: [
          { tag: "retry", attrs: { id: "dm-keys", count: "1" } },
          { tag: "registration", attrs: {}, content: registration },
          {
            tag: "keys",
            attrs: {},
            content: [
              { tag: "identity", attrs: {}, content: Buffer.alloc(32, 1) },
              { tag: "key", attrs: {}, content: [
                { tag: "id", attrs: {}, content: Buffer.from([0, 0, 7]) },
                { tag: "value", attrs: {}, content: Buffer.alloc(32, 2) },
              ] },
              { tag: "skey", attrs: {}, content: [
                { tag: "id", attrs: {}, content: Buffer.from([0, 0, 8]) },
                { tag: "value", attrs: {}, content: Buffer.alloc(32, 3) },
                { tag: "signature", attrs: {}, content: Buffer.alloc(64, 4) },
              ] },
            ],
          },
        ],
      } as any);

      expect(client.establishSession).toHaveBeenCalledWith("200.9@msgr", {
        registrationId: 0x01020304,
        deviceId: 9,
        identityKey: Buffer.concat([Buffer.from([5]), Buffer.alloc(32, 1)]),
        signedPreKey: {
          keyId: 8,
          publicKey: Buffer.concat([Buffer.from([5]), Buffer.alloc(32, 3)]),
          signature: Buffer.alloc(64, 4),
        },
        preKey: {
          keyId: 7,
          publicKey: Buffer.concat([Buffer.from([5]), Buffer.alloc(32, 2)]),
        },
      });
      expect(client.hasSession).not.toHaveBeenCalled();
      expect(getPreKeyBundle).not.toHaveBeenCalled();
      expect(socket.sendFrame).toHaveBeenCalledTimes(1);
    });

    it("fetches a prekey bundle when no retry keys and no session exist", async () => {
      const cache = new OutboundMessageCache({ ttlMs: 10_000 });
      cache.remember(makeOutgoing({ messageId: "dm-fetch", chatJid: "200.0@msgr", createdAtMs: Date.now() }));
      const socket = { sendFrame: jest.fn<(frame: Buffer) => Promise<void>>().mockResolvedValue(undefined) };
      const bundle = { registrationId: 1, deviceId: 9, identityKey: Buffer.alloc(33), signedPreKey: { keyId: 1, publicKey: Buffer.alloc(33), signature: Buffer.alloc(64) } };
      const client = {
        establishSession: jest.fn<(jid: string, bundle: any) => Promise<void>>().mockResolvedValue(undefined),
        hasSession: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        encryptMessageAppForDevice: jest.fn<(recipientJid: string, selfJid: string, messageApp: Buffer, opts?: any) => Promise<{ type: "msg"; ciphertext: Buffer }>>()
          .mockResolvedValue({ type: "msg", ciphertext: Buffer.from("cipher") }),
      };
      const getPreKeyBundle = jest.fn<(jid: string) => Promise<any>>().mockResolvedValue(bundle);
      const manager = new E2EERetryManager({
        cache,
        getClient: () => client as any,
        getSocket: () => socket as any,
        getSelfJid: () => "100.5@msgr",
        getPreKeyBundle,
      });

      await manager.handleReceipt({
        tag: "receipt",
        attrs: { id: "dm-fetch", from: "200.9@msgr" },
        content: [{ tag: "retry", attrs: { id: "dm-fetch", count: "1" } }],
      } as any);

      expect(getPreKeyBundle).toHaveBeenCalledWith("200.9@msgr");
      expect(client.establishSession).toHaveBeenCalledWith("200.9@msgr", bundle);
    });

    it("ignores retry receipts at or above the retry cap", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
      const cache = new OutboundMessageCache({ ttlMs: 10_000 });
      cache.remember(makeOutgoing({ messageId: "dm-cap", createdAtMs: Date.now() }));
      const socket = { sendFrame: jest.fn<(frame: Buffer) => Promise<void>>().mockResolvedValue(undefined) };
      const client = {
        hasSession: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        encryptMessageAppForDevice: jest.fn(),
      };
      const manager = new E2EERetryManager({
        cache,
        getClient: () => client as any,
        getSocket: () => socket as any,
        getSelfJid: () => "100.5@msgr",
        getPreKeyBundle: jest.fn() as any,
      });

      try {
        await manager.handleReceipt({
          tag: "receipt",
          attrs: { id: "dm-cap", from: "200.9@msgr" },
          content: [{ tag: "retry", attrs: { id: "dm-cap", count: "10" } }],
        } as any);

        expect(client.encryptMessageAppForDevice).not.toHaveBeenCalled();
        expect(socket.sendFrame).not.toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
      }
    });

  });
});
