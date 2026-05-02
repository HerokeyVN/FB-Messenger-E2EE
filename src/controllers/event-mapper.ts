import { EventEmitter } from "node:events";
import type { MessengerEvent, MessengerMessage, Attachment, E2EEMessage, E2EEMessageKind } from "../models/domain.ts";
import { str, num, now } from "../utils/fca-utils.ts";
import type { MediaService } from "../services/media.service.ts";
import type { E2EEService } from "../services/e2ee.service.ts";

export class EventMapper {
  constructor(
    private readonly eventBus: EventEmitter,
    private readonly mediaService: MediaService,
    private readonly e2eeService: E2EEService
  ) {}

  public emitMappedEvent(rawEvent: Record<string, unknown>): void {
    const type = str(rawEvent.type);

    // Standard LightSpeed messages
    if (type === "message" || type === "message_reply") {
      const msg: MessengerMessage = {
        id: str(rawEvent.messageID),
        threadId: str(rawEvent.threadID),
        senderId: str(rawEvent.senderID),
        text: str(rawEvent.body),
        timestampMs: num(rawEvent.timestamp) || now(),
        attachments: this.mapAttachments(rawEvent.attachments),
        mentions: this.mapMentions(rawEvent),
      };

      const reply = rawEvent.messageReply as Record<string, unknown> | undefined;
      if (reply?.messageID) {
        msg.replyTo = {
          messageId: str(reply.messageID),
          senderId: str(reply.senderID),
          text: str(reply.body),
        };
      }

      this.emit({ type: "message", data: msg });
      return;
    }

    // Message edit
    if (type === "message_edit" || type === "messageEdit") {
      this.emit({
        type: "messageEdit",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          newText: str(rawEvent.newText ?? rawEvent.text ?? rawEvent.body),
          editCount: num(rawEvent.editCount),
          timestampMs: num(rawEvent.timestamp) || now(),
        },
      });
      return;
    }

    // Reactions
    if (type === "message_reaction" || type === "reaction") {
      this.emit({
        type: "reaction",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          actorId: str(rawEvent.userID ?? rawEvent.senderID),
          reaction: str(rawEvent.reaction),
          timestampMs: num(rawEvent.timestamp) || now(),
        },
      });
      return;
    }

    // Typing
    if (type === "typ") {
      this.emit({
        type: "typing",
        data: {
          threadId: str(rawEvent.threadID),
          senderId: str(rawEvent.from ?? rawEvent.senderID),
          isTyping: Boolean(rawEvent.isTyping),
        },
      });
      return;
    }

    // Unsend
    if (type === "message_unsend") {
      this.emit({
        type: "message_unsend",
        data: {
          messageId: str(rawEvent.messageID),
          threadId: str(rawEvent.threadID),
          actorId: str(rawEvent.senderID),
          timestampMs: num(rawEvent.timestamp) || now(),
        },
      });
      return;
    }

    // Read receipt
    if (type === "read_receipt") {
      this.emit({
        type: "read_receipt",
        data: {
          threadId: str(rawEvent.threadID),
          readerId: str(rawEvent.reader ?? rawEvent.readerID),
          readWatermarkTimestampMs: num(rawEvent.readWatermarkTimestampMs),
          timestampMs: num(rawEvent.time ?? rawEvent.timestamp) || now(),
        },
      });
      return;
    }

    // Presence
    if (type === "presence") {
      this.emit({
        type: "presence",
        data: {
          userId: str(rawEvent.userID),
          isOnline: Boolean(rawEvent.userStatus ?? rawEvent.isOnline),
          lastActiveTimestampMs: num(rawEvent.timestamp),
        },
      });
      return;
    }

    // Handshake events
    if (type === "disconnected") {
      this.emit({ type: "disconnected", data: { isE2EE: Boolean(rawEvent.isE2EE) } });
      return;
    }
    if (type === "reconnected") {
      this.emit({ type: "reconnected", data: {} });
      return;
    }
    if (type === "ready") {
      this.emit({ type: "ready", data: { isNewSession: Boolean(rawEvent.isNewSession) } });
      return;
    }

    // E2EE specific
    if (type === "e2ee_connected" || type === "e2eeConnected") {
      this.e2eeService.markConnected();
      this.emit({ type: "e2ee_connected", data: {} });
      return;
    }
    if (type === "e2ee_message" || type === "e2eeMessage") {
      const e2eeData = rawEvent.data as any;
      if (!e2eeData) return;

      const rawChatJid = str(e2eeData.chatJid || e2eeData.threadId);
      const senderInfo = this.parseMessengerJid(str(e2eeData.senderJid));
      const senderId = str(e2eeData.senderId) || senderInfo.user || senderInfo.rawUser || senderInfo.jid;
      const senderJid = this.canonicalMessengerDeviceJid(str(e2eeData.senderJid), senderId, senderInfo.device);
      const chat = this.normalizeE2EEChat(rawChatJid || senderJid);

      if (e2eeData.type === "decryption_failed") {
        this.emit({
          type: "error",
          data: {
            message: `E2EE decrypt failed${chat.chatJid ? ` in ${chat.chatJid}` : ""}${senderJid ? ` from ${senderJid}` : ""}: ${str(e2eeData.error)}`,
          },
        });
        return;
      }

      const kind = this.normalizeE2EEKind(e2eeData.kind || e2eeData.type, e2eeData);
      const data: Record<string, unknown> = {
        id: str(e2eeData.messageId || e2eeData.messageID),
        threadId: chat.threadId,
        chatJid: chat.chatJid,
        senderJid,
        senderId,
        isGroup: chat.isGroup,
        kind,
        text: str(e2eeData.text || e2eeData.body || ""),
        timestampMs: num(e2eeData.timestampMs || e2eeData.timestamp) || now(),
      };

      if (senderInfo.device > 0) data.senderDeviceId = senderInfo.device;
      if (Array.isArray(e2eeData.attachments) && e2eeData.attachments.length > 0) data.attachments = e2eeData.attachments;
      if (Array.isArray(e2eeData.mentions) && e2eeData.mentions.length > 0) data.mentions = e2eeData.mentions;
      if (e2eeData.media) data.media = e2eeData.media;
      if (e2eeData.raw) data.raw = e2eeData.raw;
      if (e2eeData.emoji || e2eeData.reaction) data.reaction = str(e2eeData.emoji || e2eeData.reaction);
      if (e2eeData.targetId) data.targetId = str(e2eeData.targetId);
      if (typeof e2eeData.fromMe === "boolean") data.fromMe = e2eeData.fromMe;

      if (e2eeData.replyToId) {
        const replySender = this.parseMessengerJid(str(e2eeData.replyToSenderJid));
        data.replyTo = {
          messageId: str(e2eeData.replyToId),
          senderId: replySender.user || str(e2eeData.replyToSenderJid),
        };
      }

      this.emit({
        type: "e2ee_message",
        data: data as unknown as E2EEMessage,
      });
      return;
    }
    if (type === "e2ee_reaction" || type === "e2eeReaction") {
      const d = rawEvent.data as Record<string, unknown> | undefined ?? rawEvent;
      this.emit({
        type: "e2ee_reaction",
        data: {
          messageId: str(d.messageId),
          chatJid: str(d.chatJid),
          senderJid: str(d.senderJid),
          senderId: str(d.senderId),
          reaction: str(d.reaction),
        },
      });
      return;
    }
    if (type === "e2ee_receipt" || type === "e2eeReceipt") {
      const d = rawEvent.data as Record<string, unknown> | undefined ?? rawEvent;
      this.emit({
        type: "e2ee_receipt",
        data: {
          type: str(d.type),
          chat: str(d.chat),
          sender: str(d.sender),
          messageIds: Array.isArray(d.messageIds) ? (d.messageIds as unknown[]).map(str) : [],
        },
      });
      return;
    }

    // Raw fallback
    this.emit({ type: "raw", data: rawEvent });
  }

  private normalizeE2EEKind(value: unknown, data: Record<string, unknown>): E2EEMessageKind {
    const kind = str(value);
    if (this.isE2EEMessageKind(kind)) return kind;
    if (data.media && typeof data.media === "object" && data.media !== null) {
      const mediaType = str((data.media as Record<string, unknown>).type);
      if (this.isE2EEMessageKind(mediaType)) return mediaType;
    }
    if (str(data.text || data.body)) return "text";
    return "unknown";
  }

  private isE2EEMessageKind(value: string): value is E2EEMessageKind {
    return ["text", "image", "video", "audio", "document", "sticker", "reaction", "edit", "revoke", "unknown"].includes(value);
  }

  private normalizeE2EEChat(jid: string): { threadId: string; chatJid: string; isGroup: boolean } {
    if (!jid) return { threadId: "", chatJid: "", isGroup: false };
    if (this.isGroupJid(jid)) return { threadId: jid, chatJid: jid, isGroup: true };

    const parsed = this.parseMessengerJid(jid);
    if (parsed.server === "msgr" && parsed.user) {
      return {
        threadId: parsed.user,
        chatJid: `${parsed.user}.0@msgr`,
        isGroup: false,
      };
    }

    if (/^\d+$/.test(jid)) {
      return { threadId: jid, chatJid: `${jid}.0@msgr`, isGroup: false };
    }

    return { threadId: jid, chatJid: jid, isGroup: false };
  }

  private isGroupJid(jid: string): boolean {
    return jid.endsWith("@g.us") || jid.includes(".g.");
  }

  private canonicalMessengerDeviceJid(jid: string, fallbackUser: string, fallbackDevice = 0): string {
    const parsed = this.parseMessengerJid(jid);
    if (parsed.server === "msgr" && parsed.user) return `${parsed.user}.${parsed.device}@msgr`;
    if (!jid && fallbackUser) return `${fallbackUser}.${fallbackDevice}@msgr`;
    return jid;
  }

  private parseMessengerJid(jid: string): { jid: string; rawUser: string; user: string; device: number; server: string } {
    const [userPart = jid, server = ""] = jid.split("@");
    const colonIdx = userPart.indexOf(":");
    const dotIdx = userPart.indexOf(".");
    const userEnd = dotIdx !== -1 ? dotIdx : (colonIdx !== -1 ? colonIdx : userPart.length);
    const user = userPart.slice(0, userEnd) || userPart;
    const rawDevice = colonIdx !== -1
      ? userPart.slice(colonIdx + 1)
      : (dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0");
    return { jid, rawUser: userPart, user, device: Number(rawDevice) || 0, server };
  }

  public emit(event: MessengerEvent): void {
    // Node's EventEmitter treats "error" specially: emitting it without a
    // typed error listener throws ERR_UNHANDLED_ERROR and can kill long-running
    // listeners such as tests/script/echo-e2ee.ts.  We still always emit the
    // catch-all "event" below, so client.onEvent(listener) receives the error.
    if (event.type !== "error" || this.eventBus.listenerCount("error") > 0) {
      this.eventBus.emit(event.type as any, event.data);
    }
    this.eventBus.emit("event", event);
  }

  private mapAttachments(raw: unknown): Attachment[] | undefined {
    if (!Array.isArray(raw) || raw.length === 0) return undefined;
    const mapped = (raw as unknown[])
      .map(item => this.mediaService.normalizeAttachment(item))
      .filter((item): item is Attachment => item !== null);
    return mapped.length > 0 ? mapped : undefined;
  }

  private mapMentions(rawEvent: Record<string, unknown>) {
    const mentions = rawEvent.mentions;
    if (!Array.isArray(mentions) || mentions.length === 0) return undefined;
    return (mentions as unknown[]).flatMap(m => {
      if (typeof m !== "object" || m === null) return [];
      const item = m as Record<string, unknown>;
      return [
        {
          userId: str(item.id ?? item.userId),
          offset: num(item.fromIndex ?? item.offset),
          length: num(item.length),
          type: str(item.type) || "user",
        },
      ];
    });
  }
}
