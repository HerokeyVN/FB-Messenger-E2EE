import { now } from "../../utils/fca-utils.ts";

export interface RecentE2EEOutgoing {
  kind: "dm" | "group";
  chatJid: string;
  messageId: string;
  messageType: string;
  messageApp: Buffer;
  frankingTag: Buffer;
  createdAtMs: number;
}

export interface OutboundMessageCacheOptions {
  ttlMs?: number;
  maxEntries?: number;
}

/**
 * Short-lived cache of encrypted outbound message material used to answer
 * Messenger retry receipts without re-registering the device.
 */
export class OutboundMessageCache {
  private readonly records = new Map<string, RecentE2EEOutgoing>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(opts: OutboundMessageCacheOptions = {}) {
    this.ttlMs = opts.ttlMs ?? 15 * 60 * 1000;
    this.maxEntries = opts.maxEntries ?? 200;
  }

  remember(record: RecentE2EEOutgoing): void {
    this.prune();
    this.records.set(record.messageId, record);

    while (this.records.size > this.maxEntries) {
      const oldest = this.records.keys().next().value;
      if (!oldest) break;
      this.records.delete(oldest);
    }
  }

  get(messageId: string): RecentE2EEOutgoing | undefined {
    this.prune();
    return this.records.get(messageId);
  }

  prune(nowMs: number = now()): void {
    const cutoff = nowMs - this.ttlMs;
    for (const [messageId, record] of this.records) {
      if (record.createdAtMs < cutoff) this.records.delete(messageId);
    }
  }

  clear(): void {
    this.records.clear();
  }
}
