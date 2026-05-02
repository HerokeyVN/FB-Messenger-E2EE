import {
  unmarshal,
  marshal,
  encodeIQ,
  encodeNode,
  encodePreKeyUpload,
  type Node
} from "../e2ee/wa-binary.ts";
import {
  decodeMessageTransport,
  decodeMessageApplication,
  decodeConsumerApplication,
  decodeArmadillo,
  ProtoWriter
} from "../e2ee/message-builder.ts";
import {
  generatePreKeys,
  generateSignedPreKey
} from "../e2ee/prekey-manager.ts";
import { str, num, now } from "../utils/fca-utils.ts";
import type { DeviceStore } from "../e2ee/device-store.ts";
import type { FacebookE2EESocket } from "../e2ee/noise-socket.ts";
import type { E2EEClient } from "../e2ee/e2ee-client.ts";
import type { EventMapper } from "./event-mapper.ts";
import type { RawPreKeyBundle } from "../models/e2ee.ts";
import { logger } from "../utils/logger.ts";

type RetryReceiptHandler = (node: Node) => void | Promise<void>;

export class E2EEHandler {
  private readonly pendingIQs = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private readonly retryReceipts = new Map<string, number>();
  private readonly maxRetryReceiptsPerMessage = 2;

  constructor(
    private readonly eventMapper: EventMapper,
    private readonly getSocket: () => FacebookE2EESocket | null,
    private readonly getStore: () => DeviceStore | null,
    private readonly onRetryReceipt?: RetryReceiptHandler,
  ) {}

  public async handleEncryptedMessage(node: Node, selfUserId: string, e2eeClient: E2EEClient) {
    const fromJid = node.attrs.from;
    const participantJid = node.attrs.participant || node.attrs.from;
    const senderJid = participantJid;
    let chatJid = node.attrs.from;
    const selfDevice = this.getStore()?.jidDevice ?? 0;
    const selfJid = `${selfUserId}.${selfDevice}@msgr`;

    // Check participant-specific SKDM in <participants>.
    // Messenger may encode our device JID as user.device@msgr or user:device@msgr,
    // and stale stores may not know jidDevice yet. Try all entries for our user.
    const participantsNode = Array.isArray(node.content) ? node.content.find((c: any) => c.tag === "participants") : null;
    let emittedParticipantApp = false;
    if (participantsNode && Array.isArray(participantsNode.content)) {
      const selfToNodes = participantsNode.content.filter((n: any) =>
        n.tag === "to" && this.sameMessengerUser(n.attrs.jid, selfJid)
      );
      let processedSKDM = false;

      for (const toNode of selfToNodes) {
        if (!Array.isArray(toNode.content)) continue;
        const targetJid = typeof toNode.attrs.jid === "string" ? toNode.attrs.jid : selfJid;
        const myEnc = toNode.content.find((n: any) => n.tag === "enc");
        if (!myEnc || !Buffer.isBuffer(myEnc.content)) continue;

        logger.debug("E2EEHandler", `Trying participant SKDM DM from ${senderJid} to ${targetJid}`);
        try {
          let dmDecrypted: Buffer | null = null;
          if (myEnc.attrs.type === "msg") {
            dmDecrypted = await e2eeClient.decryptDMMessage(senderJid, myEnc.content);
          } else if (myEnc.attrs.type === "pkmsg") {
            dmDecrypted = await e2eeClient.decryptDMPreKeyMessage(senderJid, targetJid, myEnc.content);
          }

          if (!dmDecrypted) continue;
          const transport = decodeMessageTransport(dmDecrypted);
          const participantChatJid = this.chatJidFromTransport(transport, chatJid);
          if (this.emitTransportApplication(transport, senderJid, participantChatJid, node.attrs.id)) {
            emittedParticipantApp = true;
          }

          const skdm = transport?.protocol?.ancillary?.skdm;
          const gid = skdm?.groupID || skdm?.groupId || chatJid;
          const skBytes = skdm?.axolotlSenderKeyDistributionMessage || skdm?.skdmBytes;
          if (skBytes) {
            logger.info("E2EEHandler", `Processing SKDM from participants node for group ${gid} from ${senderJid}`);
            await e2eeClient.processSenderKeyDistribution(senderJid, skBytes, gid);
            processedSKDM = true;
            if (!emittedParticipantApp) break;
          }
        } catch (err) {
          logger.debug("E2EEHandler", `Participant SKDM decrypt failed for ${targetJid}: ${err}`);
        }
      }

      if (selfToNodes.length > 0 && !processedSKDM && !emittedParticipantApp) {
        logger.warn("E2EEHandler", `Found ${selfToNodes.length} participant node(s) for self but no SKDM could be processed from ${senderJid}`);
      }
    }

    //Process main 'enc' node
    const enc = Array.isArray(node.content)
      ? node.content.find((c: any) => c.tag === "enc")
      : (node.content?.tag === "enc" ? node.content : null);

    if (!enc) {
      const unavailable = Array.isArray(node.content)
        ? node.content.find((c: any) => c.tag === "unavailable")
        : (node.content?.tag === "unavailable" ? node.content : null);
      if (emittedParticipantApp) {
        this.sendAck(node);
        return;
      }

      if (unavailable) {
        const err = new Error(`unavailable encrypted message${unavailable.attrs?.type ? `: ${unavailable.attrs.type}` : ""}`);
        await this.maybeSendRetryReceipt(node, senderJid, chatJid, err);
        this.eventMapper.emitMappedEvent({
          type: "e2ee_message",
          data: {
            type: "decryption_failed",
            error: err.message,
            chatJid,
            threadId: chatJid,
            senderJid,
            senderId: this.parseMessengerJid(senderJid).user,
            messageId: node.attrs.id,
            timestampMs: now()
          }
        });
      }
      this.sendAck(node);
      return;
    }

    const type = enc.attrs.type;
    const ciphertext = enc.content;

    if (!Buffer.isBuffer(ciphertext)) {
      this.sendAck(node);
      return;
    }

    try {
      let decrypted: Buffer;
      if (type === "msg") {
        decrypted = await e2eeClient.decryptDMMessage(senderJid, ciphertext);
      } else if (type === "pkmsg") {
        decrypted = await e2eeClient.decryptDMPreKeyMessage(senderJid, selfJid, ciphertext);
      } else if (type === "skmsg") {
        decrypted = await e2eeClient.decryptGroupMessage(senderJid, ciphertext, fromJid);
      } else {
        this.sendAck(node);
        return;
      }

      const transport = decodeMessageTransport(decrypted);
      logger.debug("E2EEHandler", "Decrypted transport:", JSON.stringify(transport, null, 2));
      chatJid = this.chatJidFromTransport(transport, chatJid);
      this.emitTransportApplication(transport, senderJid, chatJid, node.attrs.id);

      if (transport?.protocol?.ancillary?.skdm) {
        const skdm = transport.protocol.ancillary.skdm;
        const gid = skdm.groupID || skdm.groupId || fromJid;
        const skBytes = skdm.axolotlSenderKeyDistributionMessage || skdm.skdmBytes;
        if (skBytes) {
          await e2eeClient.processSenderKeyDistribution(participantJid, skBytes, gid);
        }
      }
      this.sendAck(node);
    } catch (err) {
      logger.error("E2EEHandler", "Decryption failed:", err);
      await this.maybeSendRetryReceipt(node, senderJid, chatJid, err);
      this.sendAck(node);
      this.eventMapper.emitMappedEvent({
        type: "e2ee_message",
        data: {
          type: "decryption_failed",
          error: (err as Error).message,
          chatJid,
          threadId: chatJid,
          senderJid,
          senderId: this.parseMessengerJid(senderJid).user,
          messageId: node.attrs.id,
          timestampMs: now()
        }
      });
    }
  }

  private parseMessengerJid(jid: string | undefined): { user: string; device: number; server: string } {
    const value = jid ?? "";
    const [userPart = value, server = ""] = value.split("@");
    const colonIdx = userPart.indexOf(":");
    const dotIdx = userPart.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : (colonIdx !== -1 ? colonIdx : userPart.length);
    const user = userPart.slice(0, userEnd) || userPart;
    const rawDevice = colonIdx !== -1
      ? userPart.slice(colonIdx + 1)
      : (dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0");
    return { user, device: Number(rawDevice) || 0, server };
  }

  private sameMessengerDevice(a: string | undefined, b: string): boolean {
    const pa = this.parseMessengerJid(a);
    const pb = this.parseMessengerJid(b);
    return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user && pa.device === pb.device;
  }

  private sameMessengerUser(a: string | undefined, b: string): boolean {
    const pa = this.parseMessengerJid(a);
    const pb = this.parseMessengerJid(b);
    return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user;
  }

  private async maybeSendRetryReceipt(node: Node, senderJid: string, chatJid: string, err: unknown): Promise<void> {
    const messageId = node.attrs.id;
    if (!messageId) return;

    const message = err instanceof Error ? err.message : String(err ?? "");
    const retryable = /missing sender key state|No session|decrypt|invalid|unavailable/i.test(message);
    if (!retryable) return;

    const key = `${chatJid}:${senderJid}:${messageId}`;
    const count = (this.retryReceipts.get(key) ?? 0) + 1;
    if (count > this.maxRetryReceiptsPerMessage) {
      logger.warn("E2EEHandler", `Skip retry receipt for ${messageId}; retry limit reached`);
      return;
    }
    this.retryReceipts.set(key, count);

    try {
      await this.sendRetryReceipt(node, senderJid, count);
      logger.info("E2EEHandler", `Sent retry receipt #${count} for ${messageId} to recover missing E2EE keys`);
    } catch (retryErr) {
      logger.warn("E2EEHandler", `Failed to send retry receipt for ${messageId}: ${retryErr}`);
    }
  }

  private async sendRetryReceipt(node: Node, senderJid: string, retryCount: number): Promise<void> {
    const socket = this.getSocket();
    const store = this.getStore();
    if (!socket || !store?.registrationId) return;

    const receiptAttrs: Record<string, string> = {
      id: node.attrs.id,
      to: node.attrs.from,
      type: "retry",
    };

    if (node.attrs.participant || node.attrs.from?.endsWith("@g.us")) {
      receiptAttrs.participant = node.attrs.participant || senderJid;
    }

    const retryAttrs: Record<string, string> = {
      count: String(retryCount),
      id: node.attrs.id,
      t: String(node.attrs.t || Math.floor(now() / 1000)),
      v: "1",
    };

    const regBuf = Buffer.alloc(4);
    regBuf.writeUInt32BE(store.registrationId);

    const children: Buffer[] = [
      encodeNode("retry", retryAttrs),
      encodeNode("registration", {}, regBuf),
    ];

    // Include a fresh one-time prekey and current signed prekey so the sender
    // can rebuild a session before resending SKDM/message. This preserves the
    // same registered device identity; it does not perform ICDC registration.
    const keysNode = await this.buildRetryKeysNode(store).catch((err) => {
      logger.debug("E2EEHandler", `Could not build retry keys node: ${err}`);
      return null;
    });
    if (keysNode) children.push(keysNode);

    const receipt = encodeNode("receipt", receiptAttrs, children);
    await socket.sendFrame(marshal(receipt));
  }

  private async buildRetryKeysNode(store: DeviceStore): Promise<Buffer> {
    const [preKey] = await generatePreKeys(store, 1);
    if (!preKey) throw new Error("failed to generate retry prekey");

    let signedPreKey = await store.getSignedPreKey(store.signedPreKeyId).catch(() => null as any);
    if (!signedPreKey) signedPreKey = await generateSignedPreKey(store);

    return encodeNode("keys", {}, [
      encodeNode("type", {}, Buffer.from([0x05])),
      encodeNode("identity", {}, store.getIdentityPublicKey()),
      this.encodeSignalKeyNode("key", preKey.id, Buffer.from(preKey.record.publicKey().getPublicKeyBytes())),
      this.encodeSignalKeyNode(
        "skey",
        signedPreKey.id(),
        Buffer.from(signedPreKey.publicKey().getPublicKeyBytes()),
        Buffer.from(signedPreKey.signature()),
      ),
      encodeNode("device-identity", {}, this.encodeDummyDeviceIdentity()),
    ]);
  }

  private encodeDummyDeviceIdentity(): Buffer {
    return new ProtoWriter()
      .bytes(1, Buffer.alloc(0))
      .bytes(2, Buffer.alloc(32))
      .bytes(3, Buffer.alloc(64))
      .bytes(4, Buffer.alloc(64))
      .build();
  }

  private encodeSignalKeyNode(tag: "key" | "skey", id: number, publicKey: Buffer, signature?: Buffer): Buffer {
    const idBuf = Buffer.alloc(4);
    idBuf.writeUInt32BE(id);
    const children = [
      encodeNode("id", {}, idBuf.subarray(1)),
      encodeNode("value", {}, publicKey),
    ];
    if (signature) children.push(encodeNode("signature", {}, signature));
    return encodeNode(tag, {}, children);
  }

  public async handleReceipt(node: Node): Promise<void> {
    const d = {
      type: node.attrs.type || "delivery",
      chat: node.attrs.from || "",
      sender: node.attrs.participant || node.attrs.from || "",
      messageIds: node.attrs.id ? [node.attrs.id] : [],
    };
    this.eventMapper.emitMappedEvent({ type: "e2ee_receipt", data: d });

    if (node.attrs.type === "retry") {
      await this.onRetryReceipt?.(node);
    }
  }

  public async handleNotification(node: Node): Promise<void> {
    const notifType = node.attrs.type;
    if (notifType === "encrypt") {
      await this.handleEncryptNotification(node);
    } else {
      logger.debug("E2EEHandler", `Unhandled notification type ${notifType || "<none>"}`);
    }
  }

  private async handleEncryptNotification(node: Node): Promise<void> {
    const children = Array.isArray(node.content) ? node.content : (node.content ? [node.content] : []);
    const countNode = children.find((child: any) => child.tag === "count");
    const value = Number(countNode?.attrs?.value);
    if (Number.isFinite(value)) {
      logger.info("E2EEHandler", `Server encrypt notification reports ${value} prekeys remaining`);
      if (value < 5) await this.uploadPreKeys(50);
      return;
    }

    const identityNode = children.find((child: any) => child.tag === "identity");
    if (identityNode) {
      logger.warn("E2EEHandler", `Received identity-change notification from ${node.attrs.from}; sessions may need refresh`);
      return;
    }

    logger.debug("E2EEHandler", `Unhandled encrypt notification from ${node.attrs.from || "server"}`);
  }

  private chatJidFromTransport(transport: any, fallback: string): string {
    const integral = transport?.protocol?.integral;
    const dsm = integral?.DSM || integral?.dsm;
    return dsm?.destinationJID || dsm?.destinationJid || fallback;
  }

  private emitTransportApplication(transport: any, senderJid: string, chatJid: string, messageId: string): boolean {
    const appPayload = transport?.payload?.applicationPayload?.payload;
    if (!appPayload) return false;

    const messageApp = decodeMessageApplication(appPayload);
    logger.debug("E2EEHandler", "Decrypted messageApp:", JSON.stringify(messageApp, null, 2));
    const subProtocol = messageApp.payload?.subProtocol;
    let appMessage: any = null;
    let isArmadillo = false;

    if (subProtocol?.consumerMessage?.payload) {
      appMessage = decodeConsumerApplication(subProtocol.consumerMessage.payload);
    } else if (subProtocol?.armadillo?.payload) {
      appMessage = decodeArmadillo(subProtocol.armadillo.payload);
      isArmadillo = true;
    }

    if (!appMessage) return false;

    const normalized = this.normalizeE2EEMessage(appMessage, senderJid, chatJid, messageId, messageApp);
    if (!normalized) return false;
    normalized.isArmadillo = isArmadillo;
    this.eventMapper.emitMappedEvent({ type: "e2ee_message", data: normalized });
    return true;
  }

  public handleIQ(node: Node) {
    const id = node.attrs.id;
    const xmlns = node.attrs.xmlns;
    const type = node.attrs.type;

    if (xmlns === "urn:xmpp:ping" && type === "get") {
      const pong = encodeIQ({ id, to: node.attrs.from, type: "result" });
      this.getSocket()?.sendFrame(marshal(pong));
    }

    logger.debug("E2EEHandler", `Handling IQ: id=${id}, type=${type}, xmlns=${node.attrs.xmlns}`);

    if (type === "result") {
      const content = node.content;
      let countNode = null;
      if (Array.isArray(content)) {
        countNode = content.find(n => n && typeof n === "object" && n.tag === "count");
      } else if (content && typeof content === "object" && (content as any).tag === "count") {
        countNode = content;
      }

      if (countNode) {
        const count = parseInt(countNode.attrs.value ?? "0");
        this.pendingIQs.get(id)?.resolve(count);
        this.pendingIQs.delete(id);
        return;
      }

      this.pendingIQs.get(id)?.resolve(node);
      this.pendingIQs.delete(id);
    } else if (type === "error") {
      this.pendingIQs.get(id)?.reject(new Error(`IQ Error: ${JSON.stringify(node.content)}`));
      this.pendingIQs.delete(id);
    }
  }

  public handleIB(node: Node) {
    const children = Array.isArray(node.content) ? node.content : (node.content ? [node.content] : []);
    for (const child of children) {
      if (child.tag === "dirty") {
        const type = child.attrs.type;
        const timestamp = child.attrs.timestamp;
        if (type === "account_sync") {
          this.sendCleanIQ(type, timestamp).catch(() => {});
        }
      }
    }
  }

  public async getServerPreKeyCount(): Promise<number> {
    const id = `pkc-${now()}`;
    const iq = encodeIQ({ id, to: "s.whatsapp.net", type: "get", xmlns: "encrypt" }, [
      encodeNode("count", {}, undefined)
    ]);

    return new Promise((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(reject);
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          this.pendingIQs.delete(id);
          resolve(0);
        }
      }, 5000);
    });
  }

  public async getGroupParticipants(groupJid: string): Promise<string[]> {
    const id = `gp-${now()}`;
    const iq = encodeIQ({ id, to: groupJid, type: "get", xmlns: "w:g2" }, [
      encodeNode("query", { request: "interactive" }, undefined)
    ]);

    logger.debug("E2EEHandler", `Sending getGroupParticipants IQ for ${groupJid}, id: ${id}`);
    const res = await new Promise<Node>((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(err => {
        logger.error("E2EEHandler", `Failed to send getGroupParticipants IQ:`, err);
        reject(err);
      });

      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          logger.error("E2EEHandler", `getGroupParticipants IQ timeout for ${id}`);
          this.pendingIQs.delete(id);
          reject(new Error(`getGroupParticipants timeout for ${groupJid}`));
        }
      }, 10000);
    });

    logger.debug("E2EEHandler", `Received getGroupParticipants response for ${id}`);

    const groupNode = Array.isArray(res.content) ? res.content.find(n => n.tag === "group") : null;
    if (!groupNode || !Array.isArray(groupNode.content)) {
      logger.warn("E2EEHandler", `No group node found in getGroupParticipants response for ${groupJid}`);
      return [];
    }

    const participants = groupNode.content
      .filter((n: any) => n.tag === "participant" && n.attrs.jid)
      .map((n: any) => n.attrs.jid);

    logger.info("E2EEHandler", `Found ${participants.length} participants for ${groupJid}`);
    return participants;
  }

  public async getDeviceList(userJids: string[]): Promise<string[]> {
    if (userJids.length === 0) return [];

    const id = `${now()}`;
    const iq = encodeIQ({
      id,
      to: "s.whatsapp.net",
      type: "get",
      xmlns: "fbid:devices",
    }, [
      encodeNode("users", {}, userJids.map(jid => encodeNode("user", { jid })))
    ]);

    logger.debug("E2EEHandler", `Sending getDeviceList IQ for ${userJids.length} users, id: ${id}`);
    const res = await new Promise<Node>((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(err => {
        logger.error("E2EEHandler", `Failed to send getDeviceList IQ:`, err);
        reject(err);
      });

      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          logger.error("E2EEHandler", `getDeviceList IQ timeout for ${id}`);
          this.pendingIQs.delete(id);
          reject(new Error(`getDeviceList timeout for ${userJids.length} users`));
        }
      }, 10000);
    });

    logger.debug("E2EEHandler", `Received getDeviceList response for ${id}`);

    const usersNode = Array.isArray(res.content) ? res.content.find(n => n.tag === "users") : null;
    if (!usersNode || !Array.isArray(usersNode.content)) return [];

    const deviceJids: string[] = [];
    for (const userNode of usersNode.content) {
      if (userNode.tag !== "user" || !Array.isArray(userNode.content)) continue;

      const devicesNode = userNode.content.find((n: any) => n.tag === "devices");
      if (!devicesNode || !Array.isArray(devicesNode.content)) continue;

      const baseJid = userNode.attrs.jid; // e.g. 12345.0@msgr, 12345:0@msgr or 12345@msgr
      const parsed = this.parseMessengerJid(baseJid);
      const userId = parsed.user;
      const server = parsed.server;

      for (const deviceNode of devicesNode.content) {
        if (deviceNode.tag === "device" && deviceNode.attrs.id) {
          deviceJids.push(`${userId}.${deviceNode.attrs.id}@${server}`);
        }
      }
    }

    logger.info("E2EEHandler", `Discovered ${deviceJids.length} devices for ${userJids.length} users`);
    return deviceJids;
  }

  public async getPreKeyBundle(jid: string): Promise<RawPreKeyBundle> {
    const id = `pkb-${now()}`;
    const iq = encodeIQ({ id, to: "s.whatsapp.net", type: "get", xmlns: "encrypt" }, [
      encodeNode("key", {}, [
        encodeNode("user", { jid }, undefined)
      ])
    ]);

    const res = await new Promise<Node>((resolve, reject) => {
      this.pendingIQs.set(id, { resolve, reject });
      this.getSocket()?.sendFrame(iq).catch(reject);
      setTimeout(() => {
        if (this.pendingIQs.has(id)) {
          this.pendingIQs.delete(id);
          reject(new Error(`getPreKeyBundle timeout for ${jid}`));
        }
      }, 10000);
    });

    // Parse prekey bundle from response
    logger.debug("E2EEHandler", `getPreKeyBundle response for ${jid}: ${JSON.stringify(res, (k, v) => Buffer.isBuffer(v) ? v.toString("hex") : v)}`);

    const findTag = (node: any, tag: string): any => {
      if (node?.tag === tag) return node;
      if (Array.isArray(node?.content)) {
        for (const child of node.content) {
          const found = findTag(child, tag);
          if (found) return found;
        }
      }
      return null;
    };

    const userNode = findTag(res, "user");
    const keyNode = findTag(res, "key");

    if (!userNode) throw new Error(`Missing user node in prekey bundle for ${jid}`);
    if (!keyNode) throw new Error(`Missing key node in prekey bundle for ${jid}`);

    const registration = findTag(userNode, "registration")?.content;
    const identity = findTag(userNode, "identity")?.content;
    const skey = findTag(userNode, "skey");
    const key = findTag(keyNode, "key") || keyNode; // Could be the key node itself or have a nested key

    if (!registration || !identity || !skey) throw new Error(`Missing required prekey components for ${jid}`);

    const requireBuffer = (value: unknown, field: string): Buffer => {
      if (Buffer.isBuffer(value)) return value;
      throw new Error(`Missing or invalid ${field} in prekey bundle for ${jid}`);
    };
    const keyWithPrefix = (value: unknown, field: string): Buffer => {
      const keyBytes = requireBuffer(value, field);
      return keyBytes.length === 32 ? Buffer.concat([Buffer.from([5]), keyBytes]) : keyBytes;
    };
    const readKeyId = (value: unknown): number => {
      if (!Buffer.isBuffer(value) || value.length === 0) return 0;
      return value.readUIntBE(0, Math.min(value.length, 3));
    };
    const parseDeviceId = (deviceJid: string): number => {
      const parsed = this.parseMessengerJid(deviceJid);
      return Number.isFinite(parsed.device) && parsed.device > 0 ? parsed.device : 1;
    };

    const signedPreKeyId = findTag(skey, "id")?.content;
    const signedPreKeyValue = findTag(skey, "value")?.content;
    const signedPreKeySignature = findTag(skey, "signature")?.content;
    const preKeyId = findTag(key, "id")?.content;
    const preKeyValue = findTag(key, "value")?.content;
    const hasPreKey = Boolean(findTag(key, "value"));

    const bundle: RawPreKeyBundle = {
      registrationId: Buffer.isBuffer(registration) && registration.length === 4 ? registration.readUInt32BE(0) : 0,
      deviceId: parseDeviceId(jid),
      identityKey: keyWithPrefix(identity, "identity"),
      signedPreKey: {
        keyId: readKeyId(signedPreKeyId),
        publicKey: keyWithPrefix(signedPreKeyValue, "signed prekey public key"),
        signature: requireBuffer(signedPreKeySignature, "signed prekey signature"),
      },
      preKey: hasPreKey ? {
        keyId: readKeyId(preKeyId),
        publicKey: keyWithPrefix(preKeyValue, "prekey public key"),
      } : undefined,
    };

    return bundle;
  }

  public async uploadPreKeys(count: number): Promise<void> {
    const ds = this.getStore();
    if (!ds) throw new Error("DeviceStore not loaded");

    const preKeys = await generatePreKeys(ds, count);
    const spk = await generateSignedPreKey(ds);
    const idPair = await ds.getIdentityKeyPair();

    const payload = encodePreKeyUpload(
      ds.registrationId,
      Buffer.from(idPair.publicKey.getPublicKeyBytes()),
      {
        id: spk.id(),
        pubKey: Buffer.from(spk.publicKey().getPublicKeyBytes()),
        signature: Buffer.from(spk.signature()),
      },
      preKeys.map(pk => ({
        id: pk.id,
        pubKey: Buffer.from(pk.record.publicKey().getPublicKeyBytes()),
      }))
    );

    await this.getSocket()?.sendFrame(payload);
  }

  public sendAck(node: Node) {
    const socket = this.getSocket();
    if (!socket) return;

    const attrs: Record<string, any> = {
      class: node.tag,
      id: node.attrs.id,
      to: node.attrs.from,
    };

    if (node.attrs.participant) attrs.participant = node.attrs.participant;
    if (node.attrs.recipient) attrs.recipient = node.attrs.recipient;
    if (node.tag !== "message" && node.attrs.type) attrs.type = node.attrs.type;

    const ackNode = encodeNode("ack", attrs, undefined);
    socket.sendFrame(marshal(ackNode)).catch(() => {});
  }

  private async sendCleanIQ(type: string, timestamp: string): Promise<void> {
    const socket = this.getSocket();
    if (!socket) return;
    const id = `clean-${now()}`;
    const cleanIQ = encodeIQ({ id, to: "s.whatsapp.net", type: "set", xmlns: "urn:xmpp:whatsapp:dirty" }, [
      encodeNode("clean", { type, timestamp }, undefined)
    ]);
    await socket.sendFrame(marshal(cleanIQ));
  }

  private normalizeE2EEMessage(appMessage: any, senderJid: string, chatJid: string, messageId: string, messageApp?: any): any {
    const payload = appMessage?.payload;
    if (!payload) return null;
    const senderId = senderJid.split(".")[0];
    const common = {
      chatJid: chatJid,
      senderJid: senderJid,
      senderId: senderId,
      threadId: chatJid,
      messageId: messageId,
      timestampMs: now(),
      replyToId: messageApp?.metadata?.quotedMessage?.stanzaID,
      replyToSenderJid: messageApp?.metadata?.quotedMessage?.remoteJID || messageApp?.metadata?.quotedMessage?.participant,
    };

    const content = payload.content;
    if (!content) return null;

    if (content.messageText) return { ...common, type: "text", text: content.messageText.text };
    if (content.extendedTextMessage) return { ...common, type: "text", text: content.extendedTextMessage.text?.text, extended: content.extendedTextMessage };
    if (content.imageMessage) return { ...common, type: "image", media: content.imageMessage };
    if (content.videoMessage) return { ...common, type: "video", media: content.videoMessage };
    if (content.audioMessage) return { ...common, type: "audio", media: content.audioMessage };
    if (content.documentMessage) return { ...common, type: "document", media: content.documentMessage };
    if (content.stickerMessage) return { ...common, type: "sticker", media: content.stickerMessage };

    if (content.reactionMessage) {
      return {
        ...common,
        type: "reaction",
        emoji: content.reactionMessage.text,
        targetId: content.reactionMessage.key?.ID || content.reactionMessage.targetMessageID
      };
    }

    if (content.editMessage) {
      return {
        ...common,
        type: "edit",
        text: content.editMessage.message?.text || content.editMessage.messageText?.text,
        targetId: content.editMessage.key?.ID || content.editMessage.targetMessageID
      };
    }

    if (content.revokeMessage) {
      return {
        ...common,
        type: "revoke",
        targetId: content.revokeMessage.key?.ID || content.revokeMessage.targetMessageID,
        fromMe: content.revokeMessage.key?.fromMe
      };
    }

    return { ...common, type: "unknown", raw: content };
  }
}
