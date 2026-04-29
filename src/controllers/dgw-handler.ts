import { str, num, now } from "../utils/fca-utils.ts";
import type { EventMapper } from "./event-mapper.ts";

export class DGWHandler {
  private readonly seenDGWMessageIds = new Set<string>();

  constructor(private readonly eventMapper: EventMapper) {}

  public handleDGWFrame(frame: Record<string, unknown>): void {
    const payloadJson = frame.payloadJson;
    const root = this.unwrapDGWPayloadRoot(payloadJson);
    if (!root) return;

    const operations: Array<{ name: string; args: unknown[] }> = [];
    this.collectDGWStoredProcedures(root, operations);

    for (const op of operations) {
      const normalized = this.normalizeDGWStoredProcedureMessage(op.name, op.args);
      if (!normalized) continue;

      if (normalized.messageId && this.seenDGWMessageIds.has(normalized.messageId)) {
        continue;
      }

      if (normalized.messageId) {
        if (this.seenDGWMessageIds.size > 5000) {
          this.seenDGWMessageIds.clear();
        }
        this.seenDGWMessageIds.add(normalized.messageId);
      }

      this.eventMapper.emitMappedEvent({ type: "e2ee_message", data: normalized });
    }
  }

  public buildDGWBootstrapDataPayload(userId: string, deviceId: string): Buffer | undefined {
    const explicitHex = process.env.FB_DGW_BOOTSTRAP_DATA_PAYLOAD_HEX;
    if (explicitHex && explicitHex.trim().length > 0) {
      const clean = explicitHex.trim().replace(/^0x/i, "").replace(/\s+/g, "");
      try {
        return Buffer.from(clean, "hex");
      } catch {
        return undefined;
      }
    }

    const jsonStr = process.env.FB_DGW_BOOTSTRAP_DATA_JSON;
    const autoEnabled = process.env.FB_DGW_BOOTSTRAP_DATA_AUTO !== "0";

    const defaultJson = JSON.stringify({
      input_data: {
        user_id: userId,
        device_id: deviceId || process.env.FB_DGW_DEVICE_ID || "31c42901-eb7a-417b-9969-ef3bcc71b1fc",
        entity_fbid: userId,
        sync_params: JSON.stringify({
          filter: ["lightspeed"],
          force_full_sync: true,
        }),
        database: 1,
        client_capabilities: 7,
      },
      batch_id: 1,
      terminate_at_indices: [],
      request_id: 1,
      "%options": {
        useOSSResponseFormat: true,
        client_has_ods_usecase_counters: true,
      }
    });

    const effectiveJson = (jsonStr && jsonStr.trim().length > 0)
      ? jsonStr
      : (autoEnabled ? defaultJson : "");

    if (!effectiveJson) return undefined;

    const prefixHex = process.env.FB_DGW_BOOTSTRAP_DATA_PREFIX_HEX ?? "2c1878";
    const suffixHex = process.env.FB_DGW_BOOTSTRAP_DATA_SUFFIX_HEX ?? "0000";

    try {
      const normalizedJson = JSON.stringify(JSON.parse(effectiveJson));
      return Buffer.concat([
        Buffer.from(prefixHex, "hex"),
        Buffer.from(normalizedJson, "utf8"),
        Buffer.from(suffixHex, "hex"),
      ]);
    } catch {
      return undefined;
    }
  }

  public unwrapDGWPayloadRoot(payloadJson: unknown): any | null {
    if (payloadJson && typeof payloadJson === "object") {
      const obj = payloadJson as Record<string, unknown>;
      if (typeof obj.payload === "string") {
        try {
          const parsed = JSON.parse(obj.payload);
          if (parsed && typeof parsed === "object") {
            return this.unwrapDGWPayloadRoot(parsed);
          }
        } catch { }
      }
      return obj;
    }

    if (typeof payloadJson === "string") {
      try {
        const parsed = JSON.parse(payloadJson);
        if (parsed && typeof parsed === "object") {
          return this.unwrapDGWPayloadRoot(parsed);
        }
      } catch { }
    }

    return null;
  }

  private collectDGWStoredProcedures(node: unknown, out: Array<{ name: string; args: unknown[] }>): void {
    if (Array.isArray(node)) {
      if (node[0] === 5 && typeof node[1] === "string") {
        const decodedArgs = node.slice(2).map(value => this.decodeDGWStepValue(value));
        out.push({ name: node[1], args: decodedArgs });
      }
      for (const child of node) {
        this.collectDGWStoredProcedures(child, out);
      }
      return;
    }

    if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        this.collectDGWStoredProcedures(value, out);
      }
    }
  }

  private decodeDGWStepValue(value: unknown): unknown {
    if (!Array.isArray(value)) return value;
    if (value.length === 0) return value;
    const op = value[0];
    if (op === 9) return undefined;
    if (op === 19) return value[1];
    return value.map(item => this.decodeDGWStepValue(item));
  }

  private normalizeDGWStoredProcedureMessage(name: string, args: unknown[]): {
    text: string;
    chatJid: string;
    senderJid: string;
    messageId: string;
    timestampMs: number;
  } | null {
    if (name !== "insertMessage" && name !== "upsertMessage") return null;

    const messageId = str(args[8]);
    const chatJid = str(args[3]);
    const senderJid = str(args[10]);
    const isUnsent = Boolean(args[17]);
    
    if (!messageId || !chatJid || isUnsent) {
      return null;
    }

    const timestampMs = num(args[5]) || now();
    const rawText = str(args[0]);
    const translatedText = str(args[74]);
    const text = rawText || translatedText || "[non-text message]";

    return { text, chatJid, senderJid, messageId, timestampMs };
  }
}
