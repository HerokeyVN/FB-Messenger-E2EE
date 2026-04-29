import { EventEmitter } from "node:events";
import type { MessengerEvent, MessengerMessage, Attachment } from "../models/domain.ts";
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
      this.emit({ type: "e2ee_message", data: rawEvent.data as any });
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

  public emit(event: MessengerEvent): void {
    this.eventBus.emit(event.type as any, event.data);
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
