import type { E2EEClient } from "./e2ee-client.ts";
import type { OutboundMessageCache, RecentE2EEOutgoing } from "./outbound-message-cache.ts";
import { parseMessengerJid, sameMessengerUser } from "./fanout-planner.ts";
import type { FacebookE2EESocket } from "../transport/noise/noise-socket.ts";
import { encodeNode, marshal, type Node } from "../transport/binary/wa-binary.ts";
import type { RawPreKeyBundle } from "../../models/e2ee.ts";
import { now, str } from "../../utils/fca-utils.ts";
import { logger } from "../../utils/logger.ts";

export interface E2EERetryManagerOptions {
  cache: OutboundMessageCache;
  getClient: () => E2EEClient;
  getSocket: () => FacebookE2EESocket | null;
  getSelfJid: () => string;
  getPreKeyBundle: (jid: string) => Promise<RawPreKeyBundle>;
}

/** Handles Messenger E2EE retry receipts using recent outbound encrypted payloads. */
export class E2EERetryManager {
  constructor(private readonly opts: E2EERetryManagerOptions) {}

  async handleReceipt(node: Node): Promise<void> {
    const retryNode = this.findChild(node, "retry");
    const messageId = str(retryNode?.attrs?.id || node.attrs.id);
    if (!messageId) return;

    const cached = this.opts.cache.get(messageId);
    if (!cached) {
      logger.warn("E2EERetryManager", `Received retry receipt for unknown/out-of-cache E2EE message ${messageId}`);
      return;
    }

    const requesterJid = this.resolveRetryRequesterJid(node, cached);
    if (!requesterJid) {
      logger.warn("E2EERetryManager", `Cannot resolve retry requester for E2EE message ${messageId}`);
      return;
    }

    const retryCount = Number(retryNode?.attrs?.count ?? "1") || 1;
    if (retryCount >= 10) {
      logger.warn("E2EERetryManager", `Ignoring retry receipt #${retryCount} for ${messageId}`);
      return;
    }

    const e2eeClient = this.opts.getClient();
    const selfJid = this.opts.getSelfJid();

    const retryBundle = this.preKeyBundleFromRetryReceipt(node, requesterJid);
    if (retryBundle) {
      await e2eeClient.establishSession(requesterJid, retryBundle);
    } else if (!(await e2eeClient.hasSession(requesterJid))) {
      const bundle = await this.opts.getPreKeyBundle(requesterJid);
      await e2eeClient.establishSession(requesterJid, bundle);
    }

    const t = String(retryNode?.attrs?.t || node.attrs.t || Math.floor(now() / 1000));
    let encrypted: { type: "msg" | "pkmsg"; ciphertext: Buffer };
    const attrs: Record<string, string> = {
      to: cached.chatJid,
      type: cached.messageType,
      id: messageId,
      t,
    };

    if (cached.kind === "group") {
      attrs.participant = requesterJid;
      const skdm = await e2eeClient.createSenderKeyDistributionPayload(cached.chatJid, selfJid);
      encrypted = await e2eeClient.encryptMessageAppForDevice(requesterJid, selfJid, cached.messageApp, {
        skdm,
        backupDirective: { messageId, actionType: "UPSERT" },
      });
    } else {
      attrs.device_fanout = "false";
      if (node.attrs.participant) attrs.participant = node.attrs.participant;
      encrypted = await e2eeClient.encryptMessageAppForDevice(requesterJid, selfJid, cached.messageApp, {
        dsm: sameMessengerUser(requesterJid, selfJid) ? { destinationJid: cached.chatJid, phash: "" } : undefined,
      });
    }

    const msgNode = encodeNode("message", attrs, [
      encodeNode("enc", { v: "3", type: encrypted.type, count: String(retryCount) }, encrypted.ciphertext),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, cached.frankingTag),
      ]),
    ]);

    await this.opts.getSocket()?.sendFrame(marshal(msgNode));
    logger.info("E2EERetryManager", `Resent E2EE message ${messageId} for retry #${retryCount} to ${requesterJid}`);
  }

  private resolveRetryRequesterJid(node: Node, cached: RecentE2EEOutgoing): string {
    if (cached.kind === "group") {
      return str(node.attrs.participant || node.attrs.recipient);
    }
    return str(node.attrs.participant || node.attrs.from || node.attrs.recipient || cached.chatJid);
  }

  private preKeyBundleFromRetryReceipt(node: Node, jid: string): RawPreKeyBundle | null {
    const keysNode = this.findChild(node, "keys");
    if (!keysNode) return null;

    const registration = this.findChild(node, "registration")?.content;
    const identity = this.findChild(keysNode, "identity")?.content;
    const keyNode = this.findChild(keysNode, "key");
    const skeyNode = this.findChild(keysNode, "skey");
    const signedPreKeyId = this.findChild(skeyNode, "id")?.content;
    const signedPreKeyValue = this.findChild(skeyNode, "value")?.content;
    const signedPreKeySignature = this.findChild(skeyNode, "signature")?.content;
    const preKeyId = this.findChild(keyNode, "id")?.content;
    const preKeyValue = this.findChild(keyNode, "value")?.content;

    if (!Buffer.isBuffer(registration) || !Buffer.isBuffer(identity) || !Buffer.isBuffer(signedPreKeyValue) || !Buffer.isBuffer(signedPreKeySignature)) {
      return null;
    }

    const bundle: RawPreKeyBundle = {
      registrationId: registration.length === 4 ? registration.readUInt32BE(0) : 0,
      deviceId: parseMessengerJid(jid).device,
      identityKey: this.keyWithSignalPrefix(identity),
      signedPreKey: {
        keyId: this.readSignalKeyId(signedPreKeyId),
        publicKey: this.keyWithSignalPrefix(signedPreKeyValue),
        signature: signedPreKeySignature,
      },
    };

    if (Buffer.isBuffer(preKeyValue)) {
      bundle.preKey = {
        keyId: this.readSignalKeyId(preKeyId),
        publicKey: this.keyWithSignalPrefix(preKeyValue),
      };
    }

    return bundle;
  }

  private findChild(node: any, tag: string): any | null {
    if (!node) return null;
    if (node.tag === tag) return node;
    const children = Array.isArray(node.content) ? node.content : [];
    for (const child of children) {
      const found = this.findChild(child, tag);
      if (found) return found;
    }
    return null;
  }

  private keyWithSignalPrefix(value: Buffer): Buffer {
    return value.length === 32 ? Buffer.concat([Buffer.from([5]), value]) : value;
  }

  private readSignalKeyId(value: unknown): number {
    if (!Buffer.isBuffer(value) || value.length === 0) return 0;
    return value.readUIntBE(0, Math.min(value.length, 3));
  }
}
