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
  decodeArmadillo 
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

export class E2EEHandler {
  private readonly pendingIQs = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();

  constructor(
    private readonly eventMapper: EventMapper,
    private readonly getSocket: () => FacebookE2EESocket | null,
    private readonly getStore: () => DeviceStore | null
  ) {}

  public async handleEncryptedMessage(node: Node, selfUserId: string, e2eeClient: E2EEClient) {
    this.sendAck(node);

    const enc = Array.isArray(node.content)
      ? node.content.find((c: any) => c.tag === "enc")
      : (node.content?.tag === "enc" ? node.content : null);

    if (!enc) return;

    const type = enc.attrs.type;
    const ciphertext = enc.content;
    const fromJid = node.attrs.from;
    const participantJid = node.attrs.participant || node.attrs.from;
    const senderJid = participantJid;

    if (!Buffer.isBuffer(ciphertext)) return;

    try {
      let decrypted: Buffer;
      if (type === "msg") {
        decrypted = await e2eeClient.decryptDMMessage(senderJid, ciphertext);
      } else if (type === "pkmsg") {
        decrypted = await e2eeClient.decryptDMPreKeyMessage(senderJid, selfUserId, ciphertext);
      } else if (type === "skmsg") {
        decrypted = await e2eeClient.decryptGroupMessage(senderJid, ciphertext, fromJid);
      } else {
        return;
      }

      const transport = decodeMessageTransport(decrypted);
      const appPayload = transport?.payload?.applicationPayload?.payload;

      if (appPayload) {
        const messageApp = decodeMessageApplication(appPayload);
        const subProtocol = messageApp.payload?.subProtocol;
        let appMessage: any = null;
        let isArmadillo = false;

        if (subProtocol?.consumerMessage?.payload) {
          appMessage = decodeConsumerApplication(subProtocol.consumerMessage.payload);
        } else if (subProtocol?.armadillo?.payload) {
          appMessage = decodeArmadillo(subProtocol.armadillo.payload);
          isArmadillo = true;
        }

        if (appMessage) {
          const normalized = this.normalizeE2EEMessage(appMessage, senderJid, node.attrs.id);
          if (normalized) {
            normalized.isArmadillo = isArmadillo;
            this.eventMapper.emitMappedEvent({ type: "e2ee_message", data: normalized });
          }
        }
      }

      if (transport?.protocol?.ancillary?.skdm) {
        const skdm = transport.protocol.ancillary.skdm;
        const gid = skdm.groupID || skdm.groupId || fromJid;
        const skBytes = skdm.axolotlSenderKeyDistributionMessage || skdm.skdmBytes;
        if (skBytes) {
          await e2eeClient.processSenderKeyDistribution(participantJid, skBytes, gid);
        }
      }
    } catch (err) {
      console.error("[E2EEHandler] Decryption failed:", err);
      this.eventMapper.emitMappedEvent({
        type: "e2ee_message",
        data: {
          type: "decryption_failed",
          error: (err as Error).message,
          senderJid,
          messageId: node.attrs.id,
          timestampMs: now()
        }
      });
    }
  }

  public handleIQ(node: Node) {
    const id = node.attrs.id;
    const xmlns = node.attrs.xmlns;
    const type = node.attrs.type;

    if (xmlns === "urn:xmpp:ping" && type === "get") {
      const pong = encodeIQ({ id, to: node.attrs.from, type: "result" });
      this.getSocket()?.sendFrame(marshal(pong));
    }

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

  private normalizeE2EEMessage(appMessage: any, senderJid: string, messageId: string): any {
    const payload = appMessage?.payload;
    if (!payload) return null;
    const senderId = senderJid.split(".")[0];
    const common = {
      chatJid: senderJid,
      senderJid: senderJid,
      senderId: senderId,
      threadId: senderId,
      messageId: messageId,
      timestampMs: now(),
    };

    const content = payload.content;
    if (!content) return null;

    if (content.messageText) return { ...common, type: "text", text: content.messageText.text };
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

    return { ...common, type: "unknown", raw: content };
  }
}
