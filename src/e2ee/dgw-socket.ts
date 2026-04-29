import { EventEmitter } from "node:events";
import WebSocket from "ws";

export type DGWEndpointKind = "lightspeed" | "streamcontroller" | "realtime";

export type DGWEndpoints = Partial<Record<DGWEndpointKind, string>>;

export interface DGWConnectOptions {
  endpoints: DGWEndpoints;
  cookieHeader: string;
  userAgent: string;
  origin: string;
  referer?: string;
  acceptLanguage?: string;
  pingIntervalMs?: number;
  // Optional bootstrap params for realtime OPEN frame.
  bootstrap?: {
    targets?: DGWEndpointKind[];
    streamId?: number;
    method?: string;
    docId?: string;
    routingHint?: string;
    body?: string;
    acceptAck?: string;
    referer?: string;

    dataTargets?: DGWEndpointKind[];
    dataPayload?: Buffer;
    dataRequiresAck?: boolean;
    dataAckId?: number;
  };
}

interface ParsedDGWFrame {
  frameType: number;
  streamId?: number;
  payloadLength?: number;
  requiresAck?: boolean;
  ackId?: number;
  payload?: Buffer;
}

const FRAME_PING = 0x09;
const FRAME_PONG = 0x0a;
const FRAME_ACK = 0x0c;
const FRAME_DATA = 0x0d;
const FRAME_OPEN = 0x0f;

export class FacebookDGWSocket extends EventEmitter {
  private sockets: Partial<Record<DGWEndpointKind, WebSocket>> = {};
  private pingTimer: ReturnType<typeof setInterval> | null = null;

  public async connect(opts: DGWConnectOptions): Promise<void> {
    const entries = Object.entries(opts.endpoints).filter(([, u]) => Boolean(u)) as Array<[DGWEndpointKind, string]>;
    if (entries.length === 0) {
      throw new Error("No DGW endpoint provided");
    }

    await Promise.all(entries.map(([kind, url]) => this.connectOne(kind, url, opts)));

    if (opts.bootstrap) {
      const targets = opts.bootstrap.targets ?? ["realtime", "streamcontroller"];
      for (const target of targets) {
        const ws = this.sockets[target];
        if (!ws || ws.readyState !== WebSocket.OPEN) continue;

        try {
          const open = this.buildOpenFrame({
            streamId: opts.bootstrap.streamId ?? 1,
            method: opts.bootstrap.method ?? "FBGQLS:FRLightSpeedLiveQuery",
            docId: opts.bootstrap.docId ?? "8364718423641772",
            routingHint: opts.bootstrap.routingHint ?? "FRLightSpeedLiveQuery",
            body: opts.bootstrap.body ?? JSON.stringify({
              input_data: {
                sync_params: JSON.stringify({
                  filter: ["lightspeed"],
                }),
              }
            }),
            acceptAck: opts.bootstrap.acceptAck ?? "RSAck",
            referer: opts.bootstrap.referer ?? "https://www.facebook.com/",
          });
          ws.send(open);
          this.emit("debug", { type: "bootstrap_open_sent", target });
        } catch (err) {
          this.emit("debug", { type: "bootstrap_open_failed", target, error: (err as Error).message });
        }
      }

      if (opts.bootstrap.dataPayload && opts.bootstrap.dataPayload.length > 0) {
        const dataTargets = opts.bootstrap.dataTargets ?? targets;
        for (const target of dataTargets) {
          const ws = this.sockets[target];
          if (!ws || ws.readyState !== WebSocket.OPEN) continue;

          try {
            const dataFrame = this.buildDataFrame(
              opts.bootstrap.streamId ?? 1,
              opts.bootstrap.dataPayload,
              opts.bootstrap.dataRequiresAck ?? true,
              opts.bootstrap.dataAckId ?? 0,
            );
            ws.send(dataFrame);
            this.emit("debug", {
              type: "bootstrap_data_sent",
              target,
              payloadLen: opts.bootstrap.dataPayload.length,
              requiresAck: opts.bootstrap.dataRequiresAck ?? true,
              ackId: opts.bootstrap.dataAckId ?? 0,
            });
          } catch (err) {
            this.emit("debug", { type: "bootstrap_data_failed", target, error: (err as Error).message });
          }
        }
      }
    }

    this.startPingLoop(opts.pingIntervalMs ?? 15000);

    this.emit("connected");
  }

  public close(): void {
    this.stopPingLoop();
    for (const ws of Object.values(this.sockets)) {
      ws?.close();
    }
    this.sockets = {};
  }

  public sendDataFrame(target: DGWEndpointKind, streamId: number, payload: Buffer, requiresAck = true, ackId = 0): void {
    const ws = this.sockets[target];
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      throw new Error(`Socket for ${target} is not open`);
    }
    const frame = this.buildDataFrame(streamId, payload, requiresAck, ackId);
    ws.send(frame);
    this.emit("debug", { type: "data_sent", target, streamId, payloadLen: payload.length });
  }

  private async connectOne(kind: DGWEndpointKind, url: string, opts: DGWConnectOptions): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const host = new URL(url).hostname;
      const ws = new WebSocket(url, {
        headers: {
          Origin: opts.origin,
          "User-Agent": opts.userAgent,
          Cookie: opts.cookieHeader,
          Referer: opts.referer ?? `${opts.origin}/`,
          Host: host,
          "Accept-Language": opts.acceptLanguage ?? "en-US,en;q=0.9",
        },
        perMessageDeflate: true,
      });

      ws.on("open", () => {
        this.sockets[kind] = ws;
        this.emit("socket_open", { kind, url });
        resolve();
      });

      ws.on("message", (data: any, isBinary: boolean) => {
        const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
        if (!isBinary || buf.length === 0) {
          this.emit("frame", { kind, isBinary, text: buf.toString("utf8") });
          return;
        }

        this.handleIncomingFrame(kind, buf);
      });

      ws.on("error", (err: Error) => {
        this.emit("error", new Error(`[DGW:${kind}] ${err.message}`));
        reject(err);
      });

      ws.on("close", (code: number, reason: Buffer) => {
        this.emit("socket_close", { kind, code, reason: reason.toString() });
      });
    });
  }

  private startPingLoop(intervalMs: number): void {
    this.stopPingLoop();

    this.pingTimer = setInterval(() => {
      for (const [kind, ws] of Object.entries(this.sockets) as Array<[DGWEndpointKind, WebSocket | undefined]>) {
        if (!ws || ws.readyState !== WebSocket.OPEN) continue;
        ws.send(Buffer.from([FRAME_PING]));
        this.emit("debug", { type: "ping_sent", target: kind });
      }
    }, intervalMs);
  }

  private stopPingLoop(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private handleIncomingFrame(kind: DGWEndpointKind, buf: Buffer): void {
    const parsed = this.parseFrame(buf);
    if (!parsed) {
      this.emit("frame", { kind, rawHex: buf.toString("hex") });
      return;
    }

    const payloadPreview = parsed.payload ? this.tryParsePayload(parsed.payload) : null;

    this.emit("frame", {
      kind,
      frameType: parsed.frameType,
      streamId: parsed.streamId,
      payloadLength: parsed.payloadLength,
      requiresAck: parsed.requiresAck,
      ackId: parsed.ackId,
      payloadHexHead: parsed.payload?.subarray(0, 48).toString("hex"),
      payloadTextHead: payloadPreview?.textHead,
      payloadJson: payloadPreview?.json,
    });

    const ws = this.sockets[kind];
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    if (parsed.frameType === FRAME_PING) {
      ws.send(Buffer.from([FRAME_PONG]));
      return;
    }

    if (parsed.frameType === FRAME_DATA && parsed.requiresAck && typeof parsed.streamId === "number" && typeof parsed.ackId === "number") {
      ws.send(this.buildAckFrame(parsed.streamId, parsed.ackId));
      return;
    }
  }

  private parseFrame(buf: Buffer): ParsedDGWFrame | null {
    if (buf.length < 1) return null;
    const frameType = buf[0] ?? 0;

    if (frameType === FRAME_PING || frameType === FRAME_PONG) {
      return { frameType };
    }
    
    if (frameType === 0x0e) {
      this.emit("debug", { type: "frame_0e_len", len: buf.length, hex: buf.toString("hex") });
    }

    if ((frameType === FRAME_OPEN || frameType === FRAME_ACK || frameType === FRAME_DATA || frameType === 0x0e) && buf.length >= 6) {
      const streamId = buf.readUInt16LE(1);
      const payloadLength = buf.readUInt16LE(3);

      if (frameType === FRAME_ACK) {
        if (buf.length < 8) return null;
        const ackId = buf.readUInt16LE(6);
        return { frameType, streamId, payloadLength, ackId };
      }

      if (frameType === FRAME_DATA) {
        if (buf.length < 8) return null;
        const ackRaw = buf.readUInt16LE(6);
        const requiresAck = (ackRaw & 0x8000) > 0;
        const ackId = ackRaw & 0x7fff;
        const payload = buf.subarray(8, 8 + Math.max(0, payloadLength - 2));
        return { frameType, streamId, payloadLength, requiresAck, ackId, payload };
      }

      const payload = buf.subarray(6, 6 + payloadLength);
      return { frameType, streamId, payloadLength, payload };
    }

    return { frameType };
  }

  private buildAckFrame(streamId: number, ackId: number): Buffer {
    const out = Buffer.alloc(8);
    out[0] = FRAME_ACK;
    out.writeUInt16LE(streamId & 0xffff, 1);
    out.writeUInt16LE(2, 3);
    out[5] = 0;
    out.writeUInt16LE(ackId & 0xffff, 6);
    return out;
  }

  private buildDataFrame(streamId: number, payload: Buffer, requiresAck: boolean, ackId: number): Buffer {
    const out = Buffer.alloc(8 + payload.length);
    out[0] = FRAME_DATA;
    out.writeUInt16LE(streamId & 0xffff, 1);
    out.writeUInt16LE(payload.length + 2, 3);
    out[5] = 0;

    let ackRaw = ackId & 0x7fff;
    if (requiresAck) ackRaw |= 0x8000;
    out.writeUInt16LE(ackRaw, 6);

    payload.copy(out, 8);
    return out;
  }

  private buildOpenFrame(params: {
    streamId: number;
    method: string;
    docId: string;
    routingHint: string;
    body: string;
    acceptAck: string;
    referer: string;
  }): Buffer {
    const jsonPayload = Buffer.from(JSON.stringify({
      "x-dgw-app-XRSS-method": params.method,
      "x-dgw-app-XRSS-doc_id": params.docId,
      "x-dgw-app-XRSS-routing_hint": params.routingHint,
      "x-dgw-app-xrs-body": params.body,
      "x-dgw-app-XRS-Accept-Ack": params.acceptAck,
      "x-dgw-app-XRSS-http_referer": params.referer,
    }));

    const out = Buffer.alloc(6 + jsonPayload.length);
    out[0] = FRAME_OPEN;
    out.writeUInt16LE(params.streamId & 0xffff, 1);
    out.writeUInt16LE(jsonPayload.length, 3);
    out[5] = 0;
    jsonPayload.copy(out, 6);
    return out;
  }

  private tryParsePayload(payload: Buffer): { textHead?: string; json?: unknown } {
    // DGW DATA payloads are often mixed binary+JSON; extract the first JSON object if present.
    const text = payload.toString("utf8");
    const textHead = text.slice(0, 240);

    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const jsonStr = text.slice(start, end + 1);
      try {
        return { textHead, json: JSON.parse(jsonStr) };
      } catch {
        return { textHead };
      }
    }

    return { textHead };
  }
}
