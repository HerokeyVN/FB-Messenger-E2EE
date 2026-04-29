import { EventEmitter } from "node:events";
import { doHandshake } from "./noise-handshake.ts";
import type { NoiseSocket, RawWebSocket } from "../models/e2ee.ts";
import { encodeKeepAlive, unmarshal } from "./wa-binary.ts";
import { logger } from "../utils/logger.ts";

export class FacebookE2EESocket extends EventEmitter {
  private ws: WebSocket | null = null;
  private noiseSocket: NoiseSocket | null = null;
  private url: string;
  private heartbeatInterval: any = null;
  private isConnected: boolean = false;

  constructor(endpoint: string) {
    super();
    this.url = endpoint;
  }

  public async connect(noisePrivKey: Buffer, authPayload: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = new URL(this.url);
        // Add chat specific query params if needed
        wsUrl.searchParams.set("cid", "client-" + Date.now());

        const UserAgentStr = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

        this.ws = new (WebSocket as any)(wsUrl.toString(), undefined, {
          headers: {
            "Origin": "https://www.facebook.com",
            "User-Agent": UserAgentStr,
          }
        });
        this.ws!.binaryType = "arraybuffer";

        let handshakeResolved = false;
        let streamBuffer: Buffer[] = [];
        let streamLen = 0;
        let waitingResolver: ((data: Buffer) => void) | null = null;
        let waitingLen: number = 0;

        this.ws!.addEventListener("message", (ev) => {
          const frame = Buffer.from(ev.data as ArrayBuffer);
          streamBuffer.push(frame);
          streamLen += frame.length;
          if (waitingResolver && streamLen >= waitingLen) {
            const res = waitingResolver;
            const len = waitingLen;
            waitingResolver = null;
            waitingLen = 0;
            res(readFromBuffer(len));
          }
        });

        function readFromBuffer(len: number): Buffer {
          let res = Buffer.alloc(len);
          let offset = 0;
          while (offset < len && streamBuffer.length > 0) {
            const first = streamBuffer[0];
            const remaining = len - offset;
            if (first && first.length <= remaining) {
              first.copy(res, offset);
              offset += first.length;
              streamBuffer.shift();
            } else if (first) {
              first.copy(res, offset, 0, remaining);
              streamBuffer[0] = first.subarray(remaining);
              offset += remaining;
            } else {
              break;
            }
          }
          streamLen -= len;
          return res;
        }

        const rawWs: RawWebSocket = {
          send: (data: Buffer) => {
            if (this.ws?.readyState === WebSocket.OPEN) {
              this.ws.send(data);
            }
          },
          readRaw: (len?: number): Promise<Buffer> => {
            const targetLen = len || 0;
            if (targetLen === 0) {
              if (streamLen > 0) return Promise.resolve(readFromBuffer(streamLen));
              return new Promise((resolve) => {
                waitingLen = 1;
                waitingResolver = () => resolve(readFromBuffer(streamLen));
              });
            }
            if (streamLen >= targetLen) {
              return Promise.resolve(readFromBuffer(targetLen));
            }
            if (this.ws?.readyState !== WebSocket.OPEN) {
              return Promise.reject(new Error("WebSocket not open"));
            }
            return new Promise((resolve) => {
              waitingLen = targetLen;
              waitingResolver = resolve;
            });
          },
          close: () => this.ws?.close(),
        };

        this.ws!.addEventListener("close", () => {
          this.isConnected = false;
          this.stopHeartbeat();
          if (waitingResolver) {
            waitingResolver(null as any);
            waitingResolver = null;
          }
          this.emit("disconnected");
        });

        this.ws!.addEventListener("open", async () => {
          try {
            const { socket } = await doHandshake(rawWs, noisePrivKey, authPayload);
            this.noiseSocket = socket;
            handshakeResolved = true;
            this.isConnected = true;
            this.emit("connected");
            resolve();
            this.startReading();
            this.startHeartbeat();
          } catch (err) {
            reject(err);
            this.ws?.close();
          }
        });

        this.ws!.addEventListener("error", (ev) => {
          if (!handshakeResolved) reject(new Error("WebSocket error"));
          this.emit("error", ev);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          logger.debug("NoiseSocket", "Sending Noise heartbeat (0,0,0)...");
          this.ws.send(Buffer.from([0, 0, 0]));
        }

      } catch (err) {
        logger.error("FacebookE2EESocket", "Heartbeat failed:", err);
      }
    }, 15000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private async startReading(): Promise<void> {
    if (!this.noiseSocket) return;
    try {
      while (this.isConnected && this.noiseSocket) {
        logger.debug("FacebookE2EESocket", "Waiting for frame...");
        const frame = await this.noiseSocket.readFrame();
        if (frame && frame.length > 0) {
          try {
            logger.debug("FacebookE2EESocket", `Unmarshaling frame (${frame.length} bytes)...`);
            const node = unmarshal(frame);
            logger.debug("FacebookE2EESocket", `Decrypted node: <${node.tag}>`, JSON.stringify(node.attrs, null, 2));
            if (node.content) {
              logger.debug("FacebookE2EESocket", `Node content type: ${Array.isArray(node.content) ? "Array[" + node.content.length + "]" : typeof node.content}`);
            }
          } catch (e) {
            logger.error("FacebookE2EESocket", `Received decrypted frame (${frame.length} bytes), but failed to unmarshal: ${e}`);
            logger.debug("FacebookE2EESocket", `Frame hex: ${frame.toString("hex").slice(0, 100)}`);
          }
          this.emit("frame", frame);
        } else if (frame) {
          // Heartbeat or empty frame from server
          logger.debug("FacebookE2EESocket", "Received empty frame (heartbeat from server)");
        }
      }
    } catch (err) {
      logger.error("FacebookE2EESocket", "Read loop stopped due to error:", err);
      this.isConnected = false;
      this.emit("error", err);
    }
  }

  public async sendFrame(data: Buffer): Promise<void> {
    if (!this.noiseSocket) throw new Error("Socket not connected");
    try {
      const node = unmarshal(data);
      logger.debug("NoiseSocket", `Sending encrypted node: <${node.tag}>`, JSON.stringify(node.attrs, null, 2));
    } catch (e) {
      logger.debug("NoiseSocket", `Sending raw encrypted frame (${data.length} bytes)`);
    }
    await this.noiseSocket.sendFrame(data);
  }


  public close(): void {
    this.isConnected = false;
    this.stopHeartbeat();
    this.noiseSocket?.close();
    this.ws?.close();
  }
}
