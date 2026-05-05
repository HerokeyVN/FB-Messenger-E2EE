import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { FCAApi } from "fca-unofficial";

import {
  unmarshal,
  encodeNode,
  marshal as marshalBinary,
  buildUnifiedSessionId,
  encodeKeepAlive,
  encodePresenceAvailable,
  encodePrimingNode,
  encodeSetPassive,
} from "../e2ee/transport/binary/wa-binary.ts";
import type { DGWEndpointKind } from "../e2ee/transport/dgw/dgw-socket.ts";
import type { Node } from "../e2ee/transport/binary/wa-binary.ts";
import type { SessionData } from "../models/client.ts";
import type { MediaUploadConfig } from "../models/media.ts";
import type { MediaFields } from "../models/e2ee.ts";
import type {
  SendMediaInput,
  SendMessageInput,
  SendReactionInput,
  TypingInput,
} from "../models/messaging.ts";
import type { AuthConfig } from "../models/config.ts";
import { AuthService } from "../services/auth.service.ts";
import type { E2EEService } from "../services/e2ee.service.ts";
import { FacebookGatewayService } from "../services/facebook-gateway.service.ts";
import { MediaService } from "../services/media.service.ts";
import { ICDCService } from "../services/icdc.service.ts";
import { DeviceStore } from "../e2ee/store/device-store.ts";
import { E2EEClient } from "../e2ee/application/e2ee-client.ts";
import type { MediaTypeKey } from "../e2ee/media/media-crypto.ts";
import { FacebookE2EESocket } from "../e2ee/transport/noise/noise-socket.ts";
import { FacebookDGWSocket } from "../e2ee/transport/dgw/dgw-socket.ts";
import { encodeClientPayload } from "../e2ee/message/message-builder.ts";
import { str, now } from "../utils/fca-utils.ts";
import { inferMimeTypeFromFileName } from "../utils/mime.ts";
import { logger } from "../utils/logger.ts";
import { EventMapper } from "./event-mapper.ts";
import { DGWHandler } from "./dgw-handler.ts";
import { E2EEHandler } from "./e2ee-handler.ts";
import { OutboundMessageCache } from "../e2ee/application/outbound-message-cache.ts";
import { E2EERetryManager } from "../e2ee/application/retry-manager.ts";
import { PreKeyMaintenance } from "../e2ee/application/prekey-maintenance.ts";
import {
  buildParticipantListHash,
  normalizeDMThreadToJid,
  sameMessengerDevice,
  sameMessengerUser,
  toBareMessengerJid,
  uniqueJids,
} from "../e2ee/application/fanout-planner.ts";

type E2EEDMMediaType = Extract<MediaTypeKey, "image" | "video" | "audio" | "document">;

interface E2EESendMessageResult extends Record<string, unknown> {
  messageId: string;
  timestampMs: number;
}

const E2EE_EDIT_SENDER_REVOKE = "7";

export class ClientController {
  private api: FCAApi | null = null;
  private dgwSocket: FacebookDGWSocket | null = null;
  private e2eeSocket: FacebookE2EESocket | null = null;
  private activeDeviceStore: DeviceStore | null = null;
  private e2eeConnected: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private userId: string = "";
  private readonly outgoingE2EECache = new OutboundMessageCache();
  private e2eeUploadConfig: MediaUploadConfig | null = null;

  private readonly eventMapper: EventMapper;
  private readonly dgwHandler: DGWHandler;
  private readonly e2eeHandler: E2EEHandler;
  private readonly retryManager: E2EERetryManager;
  private readonly preKeyMaintenance: PreKeyMaintenance;

  public constructor(
    private readonly authService: AuthService,
    private readonly gateway: FacebookGatewayService,
    private readonly mediaService: MediaService,
    private readonly e2eeService: E2EEService,
    private readonly icdcService: ICDCService,
    private readonly eventBus: EventEmitter,
  ) {
    this.eventMapper = new EventMapper(this.eventBus, this.mediaService, this.e2eeService);
    this.dgwHandler = new DGWHandler(this.eventMapper);
    this.e2eeHandler = new E2EEHandler(
      this.eventMapper,
      () => this.e2eeSocket,
      () => this.activeDeviceStore,
      node => this.retryManager.handleReceipt(node),
    );
    this.retryManager = new E2EERetryManager({
      cache: this.outgoingE2EECache,
      getClient: () => this.e2eeService.getClient(),
      getSocket: () => this.e2eeSocket,
      getSelfJid: () => this.getSelfE2EEJid(),
      getPreKeyBundle: (jid) => this.e2eeHandler.getPreKeyBundle(jid),
    });
    this.preKeyMaintenance = new PreKeyMaintenance({
      getSocket: () => this.e2eeSocket,
      getStore: () => this.activeDeviceStore,
      getServerPreKeyCount: () => this.e2eeHandler.getServerPreKeyCount(),
      uploadPreKeys: (count) => this.e2eeHandler.uploadPreKeys(count),
    });
  }

  // Lifecycle

  public async connect(authConfig: AuthConfig, sessionStorePath?: string): Promise<{ userId: string }> {
    const appState = await this.authService.readAppState(authConfig);
    const api = await this.gateway.login(appState);
    this.gateway.configure(api);

    const userId = str(api.getCurrentUserID?.());

    const session: SessionData = {
      userId,
      appState: appState.map(cookie => ({ key: cookie.key, value: cookie.value })),
      platform: authConfig.platform,
      updatedAt: now(),
    };

    if (sessionStorePath) {
      await this.authService.saveSession(sessionStorePath, session);
    }

    this.api = api;

    this.userId = userId;
    return { userId };
  }

  public async disconnect(): Promise<void> {
    this.cleanup();
    this.dgwSocket?.close();
    this.dgwSocket = null;

    this.e2eeSocket?.close();
    this.e2eeSocket = null;

    if (!this.api) return;
    this.gateway.stop(this.api);
    this.api = null;
  }

  // E2EE

  public async sendNoiseKeepAlive(): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const id = (now() % 1000).toString();
    await this.e2eeSocket.sendFrame(encodeKeepAlive(id));
  }

  public async connectE2EE(deviceStorePath: string, userId: string): Promise<void> {
    this.userId = userId;
    const ds = await DeviceStore.fromFile(deviceStorePath);
    this.activeDeviceStore = ds;

    const client = new E2EEClient(ds);
    this.e2eeUploadConfig = process.env.FB_E2EE_MEDIA_UPLOAD_AUTH
      ? {
        host: process.env.FB_E2EE_MEDIA_UPLOAD_HOST ?? "rupload.facebook.com",
        auth: process.env.FB_E2EE_MEDIA_UPLOAD_AUTH,
        fetchedAtMs: now(),
      }
      : null;
    this.e2eeService.setProvider(client, this.e2eeUploadConfig ?? {
      host: process.env.FB_E2EE_MEDIA_UPLOAD_HOST ?? "rupload.facebook.com",
      auth: "",
    });

    const endpoint = "wss://web-chat-e2ee.facebook.com/ws/chat?cid=client-" + now();
    const noiseSocket = new FacebookE2EESocket(endpoint);

    noiseSocket.on("connected", () => {
      this.eventMapper.emit({ type: "e2ee_connected", data: {} });
    });

    noiseSocket.on("disconnected", () => {
      this.cleanup();
      this.eventMapper.emit({ type: "disconnected", data: { isE2EE: true } });
    });

    noiseSocket.on("error", (err) => {
      this.eventMapper.emit({ type: "error", data: { message: err.message } });
    });

    logger.debug("ClientController", "Fetching CAT...");
    const fbCat = await this.gateway.fetchCAT(this.requireApi());

    if (!ds.jidDevice) {
      const api = this.requireApi();
      const appState = (api as any).getAppState?.() || [];
      const cookieStr = appState.map((c: any) => `${c.key}=${c.value}`).join("; ");
      this.icdcService.setCookies(cookieStr);

      logger.info("ClientController", "Registering new device via ICDC...");
      const waDeviceId = await this.icdcService.register(userId, fbCat, "2220391788200892", ds);
      ds.jidDevice = waDeviceId;
      ds.jidUser = userId;
      ds.saveToFile();
    }

    const clientPayload = encodeClientPayload({
      username: BigInt(userId),
      deviceId: ds.jidDevice ?? 0,
      fbCatBase64: fbCat,
    });

    noiseSocket.on("frame", async (rawFrame: Buffer) => {
      if (rawFrame.length === 0) return;
      try {
        const node = unmarshal(rawFrame);
        if (["receipt", "notification", "iq", "presence", "call", "chatstate"].includes(node.tag) && node.attrs.id) {
          this.e2eeHandler.sendAck(node);
        }

        switch (node.tag) {
          case "success":
            this.e2eeConnected = true;
            if (node.attrs.jid) this.activeDeviceStore?.setJIDs(node.attrs.jid, node.attrs.jid);
            // Send presence to start stream
            await noiseSocket.sendFrame(encodePresenceAvailable("false"));
            break;
          case "iq":
            this.e2eeHandler.handleIQ(node);
            break;
          case "presence":
            this.dispatchPresence(node);
            break;
          case "receipt":
            await this.e2eeHandler.handleReceipt(node);
            break;
          case "notification":
            await this.e2eeHandler.handleNotification(node);
            break;
          case "message":
          case "appdata":
            await this.e2eeHandler.handleEncryptedMessage(node, userId, client);
            break;
          case "ib":
            this.e2eeHandler.handleIB(node);
            break;
        }
      } catch (err) {
        logger.error("E2EE", "Frame error:", err);
      }
    });

    await noiseSocket.connect(ds.noiseKeyPriv, clientPayload);
    this.e2eeSocket = noiseSocket;

    // Wait for success
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Handshake timeout")), 10000);
      const onFrame = (frame: Buffer) => {
        const node = unmarshal(frame);
        if (node.tag === "success") {
          noiseSocket.off("frame", onFrame);
          clearTimeout(timeout);
          resolve();
        } else if (node.tag === "failure") {
          noiseSocket.off("frame", onFrame);
          clearTimeout(timeout);
          reject(new Error(`Login failure: ${node.attrs.reason}`));
        }
      };
      noiseSocket.on("frame", onFrame);
    });

    this.eventBus.emit("event", { type: "e2ee_connected", data: {} } as any);

    // Initial sync nodes
    await noiseSocket.sendFrame(encodePrimingNode(buildUnifiedSessionId()));
    await noiseSocket.sendFrame(encodeSetPassive("active-stream", false));

    await this.preKeyMaintenance.sync("startup");
    this.preKeyMaintenance.start();

    // Proactively fetch media_conn config for media uploads
    this.fetchMediaUploadConfigProactively().catch((err) => {
      logger.warn("ClientController", "Proactive media_conn fetch failed (will retry on first media send):", err);
    });

    this.startHeartbeat();
    await this.connectDGWIfEnabled(userId);
  }

  private dispatchPresence(node: Node) {
    const userId = node.attrs.from?.split("@")[0];
    const type = node.attrs.type;
    this.eventMapper.emit({
      type: "presence",
      data: {
        userId,
        isOnline: type === "available",
        lastActiveTimestampMs: now(),
      },
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (!this.e2eeSocket) return;
        await this.sendNoiseKeepAlive();
      } catch (err) {
        logger.error("ClientController", "E2EE heartbeat failed:", err);
        this.eventMapper.emit({
          type: "error",
          data: { message: `E2EE heartbeat failed: ${(err as Error).message}` },
        });
      }
    }, 30000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private cleanup() {
    this.stopHeartbeat();
    this.preKeyMaintenance.stop();
    this.e2eeConnected = false;
  }

  private async connectDGWIfEnabled(userId: string): Promise<void> {
    if (process.env.FB_DGW_ENABLE !== "1") return;

    const endpoints: Record<DGWEndpointKind, string | undefined> = {
      lightspeed: process.env.FB_DGW_URL_LIGHTSPEED,
      streamcontroller: process.env.FB_DGW_URL_STREAMCONTROLLER,
      realtime: process.env.FB_DGW_URL_REALTIME,
    };

    if (!Object.values(endpoints).some(Boolean)) return;

    const api = this.requireApi();
    const appState = (api as any).getAppState?.() || [];
    const cookieHeader = appState.map((c: any) => `${c.key}=${c.value}`).join("; ");

    const dgw = new FacebookDGWSocket();
    dgw.on("connected", () => this.eventMapper.emit({ type: "raw", data: { source: "dgw", type: "connected" } }));
    dgw.on("frame", (ev: any) => {
      this.eventMapper.emit({ type: "raw", data: { source: "dgw", userId, ...ev } });
      this.dgwHandler.handleDGWFrame({ ...ev, kind: ev.target });
    });
    dgw.on("error", (err) => this.eventMapper.emit({ type: "error", data: { message: err.message } }));

    const bootstrapTargets = this.resolveDGWTargets(process.env.FB_DGW_BOOTSTRAP_TARGETS, ["lightspeed" as DGWEndpointKind], endpoints);
    const dataTargets = this.resolveDGWTargets(process.env.FB_DGW_BOOTSTRAP_DATA_TARGETS, bootstrapTargets, endpoints);

    await dgw.connect({
      endpoints,
      cookieHeader,
      userAgent: process.env.FB_DGW_UA || "Mozilla/5.0",
      origin: process.env.FB_DGW_ORIGIN || "https://www.facebook.com",
      referer: process.env.FB_DGW_REFERER || "https://www.facebook.com/",
      acceptLanguage: process.env.FB_DGW_ACCEPT_LANGUAGE || "en-US,en;q=0.9",
      pingIntervalMs: Number(process.env.FB_DGW_PING_INTERVAL_MS ?? "15000"),
      bootstrap: {
        targets: bootstrapTargets,
        streamId: Number(process.env.FB_DGW_STREAM_ID ?? "1"),
        dataTargets,
        dataPayload: undefined,
      },
    });

    for (const target of dataTargets) {
      const url = endpoints[target];
      if (!url) continue;
      const deviceId = new URL(url).searchParams.get("x-dgw-deviceid") || "";
      const payload = this.dgwHandler.buildDGWBootstrapDataPayload(userId, deviceId);
      if (payload) dgw.sendDataFrame(target, Number(process.env.FB_DGW_STREAM_ID ?? "1"), payload, true, 0);
    }

    this.dgwSocket = dgw;
  }

  private resolveDGWTargets(raw: string | undefined, fallback: DGWEndpointKind[], endpoints: Record<DGWEndpointKind, any>): DGWEndpointKind[] {
    const allowed: DGWEndpointKind[] = ["lightspeed", "streamcontroller", "realtime"];
    const base = (raw ?? "").split(",").map(s => s.trim()).filter((s): s is DGWEndpointKind => allowed.includes(s as DGWEndpointKind));
    return (base.length > 0 ? base : fallback).filter(t => !!endpoints[t]);
  }

  // Messaging delegate methods

  public async sendMessage(input: SendMessageInput): Promise<Record<string, unknown>> {
    this.assertE2EEReadyForThread(input.threadId, "sendMessage");
    const isGroup = this.isE2EEGroupThread(input.threadId);
    return isGroup
      ? this.sendE2EEGroupText(input.threadId, input.text, input.replyToMessageId)
      : this.sendE2EEText(input.threadId, input.text, input.replyToMessageId);
  }

  public async sendE2EEText(threadId: string, text: string, replyToMessageId?: string): Promise<E2EESendMessageResult> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const toJid = normalizeDMThreadToJid(threadId);
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const timestampMs = now();

    const result = await e2eeClient.buildDMTextFanoutPayloads({
      toJid,
      selfJid,
      text,
      isGroup: false,
      replyToId: replyToMessageId,
      replyToSenderJid: replyToMessageId ? toJid : undefined,
    });

    const participantNodes: Buffer[] = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }

    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;

      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid)
          ? result.selfDevicePayload
          : result.devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt DM fanout to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, result.frankingTag),
      ]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId,
      messageType: "text",
      messageApp: result.messageApp,
      frankingTag: result.frankingTag,
      createdAtMs: timestampMs,
    });
    logger.info("ClientController", `E2EE DM message sent to ${toJid} with ${participantNodes.length} devices`);
    return { messageId, timestampMs };
  }

  public async sendE2EEGroupText(groupJid: string, text: string, replyToMessageId?: string): Promise<E2EESendMessageResult> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();

    // Fetch group participants
    logger.debug("ClientController", `Fetching participants for group: ${groupJid}`);
    const memberJids = await this.e2eeHandler.getGroupParticipants(groupJid);

    // Fetch device list for all members
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    logger.debug("ClientController", `Fetching devices for ${deviceUsers.length} members`);
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers))
      .filter((jid) => !sameMessengerDevice(jid, selfJid));
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const timestampMs = now();

    // Encrypt the main group payload
    const result = await e2eeClient.encryptGroupText(
      groupJid,
      selfJid,
      text,
      messageId,
      replyToMessageId,
      undefined
    );

    // Distribute SKDM to all devices
    const participantNodes: Buffer[] = [];
    for (const deviceJid of deviceJids) {
      try {
        // Establish session if missing
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid)
          ? result.selfDevicePayload
          : result.devicePayload;
        const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext)
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to distribute SKDM to ${deviceJid}:`, err);
      }
    }

    const phash = buildParticipantListHash(deviceJids);
    const participantsNode = encodeNode("participants", {}, participantNodes);
    const frankingNode = encodeNode("franking", {}, [
      encodeNode("franking_tag", {}, result.frankingTag),
    ]);
    const traceNode = encodeNode("trace", {}, [
      encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
    ]);
    const skmsgNode = encodeNode("enc", { v: "3", type: "skmsg" }, result.groupCiphertext);

    const msgNode = encodeNode("message", { to: groupJid, type: "text", id: messageId, phash }, [
      participantsNode,
      frankingNode,
      traceNode,
      skmsgNode
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "group",
      chatJid: groupJid,
      messageId,
      messageType: "text",
      messageApp: result.messageApp,
      frankingTag: result.frankingTag,
      createdAtMs: timestampMs,
    });
    logger.info("ClientController", `E2EE Group message sent to ${groupJid} with ${participantNodes.length} devices`);
    return { messageId, timestampMs };
  }

  private getSelfE2EEJid(): string {
    const device = this.activeDeviceStore?.jidDevice ?? 0;
    return `${this.userId}.${device}@msgr`;
  }

  private isE2EEThreadId(threadId: string): boolean {
    return /^\d+$/.test(threadId) || threadId.includes("@msgr") || threadId.includes("@g.us") || threadId.includes(".g.");
  }

  private assertE2EEReadyForThread(threadId: string, operation: string): void {
    if (!this.isE2EEThreadId(threadId)) {
      throw new Error(`${operation} is E2EE-only. Pass a Messenger E2EE user/group JID or numeric user ID, and use fca-unofficial directly for non-E2EE threads.`);
    }
    if (!this.e2eeConnected || !this.e2eeSocket) {
      throw new Error(`${operation} requires an active E2EE connection. Call connectE2EE() before using this E2EE-only API.`);
    }
  }

  public async sendReaction(input: SendReactionInput): Promise<void> {
    this.assertE2EEReadyForThread(input.threadId, "sendReaction");
    await this.sendE2EEReaction(input);
  }

  public async sendE2EEReaction(input: SendReactionInput): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const chatJid = this.isE2EEGroupThread(input.threadId)
      ? input.threadId
      : normalizeDMThreadToJid(input.threadId);

    if (this.isE2EEGroupThread(chatJid)) {
      await this.sendE2EEGroupReaction(chatJid, input);
      return;
    }

    await this.sendE2EEDMReaction(chatJid, input);
  }

  private async sendE2EEDMReaction(toJid: string, input: SendReactionInput): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const reactionId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const keyOpts = this.buildReactionMessageKeyOptions(toJid, selfJid, input);
    const consumerApp = e2eeClient.buildReactionMessage(input.messageId, input.reaction, keyOpts);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);

    const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
    const selfDevicePayload = e2eeClient.buildMessageTransport({
      messageApp,
      dsm: { destinationJid: toJid, phash: "" },
    });

    const participantNodes: Buffer[] = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }

    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;

      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid) ? selfDevicePayload : devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type, "decrypt-fail": "hide" }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt E2EE reaction fanout to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "reaction", id: reactionId }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("meta", { "decrypt-fail": "hide" }, undefined),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId: reactionId,
      messageType: "reaction",
      messageApp,
      frankingTag,
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE reaction sent to ${toJid} for ${input.messageId}`);
  }

  private async sendE2EEGroupReaction(groupJid: string, input: SendReactionInput): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const reactionId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const keyOpts = this.buildReactionMessageKeyOptions(groupJid, selfJid, input);
    const consumerApp = e2eeClient.buildReactionMessage(input.messageId, input.reaction, keyOpts);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
    const result = await e2eeClient.encryptGroupMessageApplication(groupJid, selfJid, messageApp, reactionId);

    logger.debug("ClientController", `Fetching participants for group reaction: ${groupJid}`);
    const memberJids = await this.e2eeHandler.getGroupParticipants(groupJid);
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers))
      .filter((jid) => !sameMessengerDevice(jid, selfJid));

    const participantNodes: Buffer[] = [];
    for (const deviceJid of deviceJids) {
      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid) ? result.selfDevicePayload : result.devicePayload;
        const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: skdmEnc.type, "decrypt-fail": "hide" }, skdmEnc.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to distribute reaction SKDM to ${deviceJid}:`, err);
      }
    }

    const phash = buildParticipantListHash(deviceJids);
    const msgNode = encodeNode("message", { to: groupJid, type: "reaction", id: reactionId, phash }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("meta", { "decrypt-fail": "hide" }, undefined),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
      encodeNode("enc", { v: "3", type: "skmsg" }, result.groupCiphertext),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "group",
      chatJid: groupJid,
      messageId: reactionId,
      messageType: "reaction",
      messageApp,
      frankingTag,
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE group reaction sent to ${groupJid} for ${input.messageId}`);
  }

  private buildReactionMessageKeyOptions(chatJid: string, selfJid: string, input: SendReactionInput): { remoteJid: string; fromMe: boolean; participant?: string } {
    const targetSenderJid = input.senderJid ?? input.targetSenderJid;
    const key: { remoteJid: string; fromMe: boolean; participant?: string } = {
      remoteJid: chatJid,
      fromMe: true,
    };

    if (targetSenderJid && !sameMessengerUser(targetSenderJid, selfJid)) {
      key.fromMe = false;
      if (this.isE2EEGroupThread(chatJid)) {
        key.participant = toBareMessengerJid(targetSenderJid);
      }
    }

    return key;
  }

  private isE2EEGroupThread(threadId: string): boolean {
    return threadId.includes("@g.us") || threadId.includes(".g.");
  }

  public async unsendMessage(messageId: string, threadId?: string): Promise<void> {
    const cached = this.outgoingE2EECache.get(messageId);
    const e2eeThreadId = threadId ?? cached?.chatJid;
    if (!e2eeThreadId) {
      throw new Error("unsendMessage is E2EE-only and requires threadId when the target message is not in the outbound cache.");
    }

    this.assertE2EEReadyForThread(e2eeThreadId, "unsendMessage");
    await this.sendE2EEUnsend(e2eeThreadId, messageId);
  }

  public async sendE2EEUnsend(threadId: string, targetMessageId: string): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const chatJid = this.isE2EEGroupThread(threadId)
      ? threadId
      : normalizeDMThreadToJid(threadId);

    if (this.isE2EEGroupThread(chatJid)) {
      await this.sendE2EEGroupUnsend(chatJid, targetMessageId);
      return;
    }

    await this.sendE2EEDMUnsend(chatJid, targetMessageId);
  }

  private async sendE2EEDMUnsend(toJid: string, targetMessageId: string): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const revokeId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const consumerApp = e2eeClient.buildRevokeMessage(targetMessageId, { remoteJid: toJid, fromMe: true });
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);

    const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
    const selfDevicePayload = e2eeClient.buildMessageTransport({
      messageApp,
      dsm: { destinationJid: toJid, phash: "" },
    });

    const participantNodes: Buffer[] = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }

    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;

      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid) ? selfDevicePayload : devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type, "decrypt-fail": "hide" }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt E2EE revoke fanout to ${deviceJid}:`, err);
      }
    }

    const timestampMs = now();
    const msgNode = encodeNode("message", { to: toJid, type: "text", id: revokeId, edit: E2EE_EDIT_SENDER_REVOKE }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("meta", { "decrypt-fail": "hide" }, undefined),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId: revokeId,
      messageType: "revoke",
      messageApp,
      frankingTag,
      createdAtMs: timestampMs,
    });
    logger.info("ClientController", `E2EE DM revoke sent to ${toJid} for ${targetMessageId}`);
  }

  private async sendE2EEGroupUnsend(groupJid: string, targetMessageId: string): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const revokeId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const consumerApp = e2eeClient.buildRevokeMessage(targetMessageId, { remoteJid: groupJid, fromMe: true });
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
    const result = await e2eeClient.encryptGroupMessageApplication(groupJid, selfJid, messageApp, revokeId);

    logger.debug("ClientController", `Fetching participants for group revoke: ${groupJid}`);
    const memberJids = await this.e2eeHandler.getGroupParticipants(groupJid);
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers))
      .filter((jid) => !sameMessengerDevice(jid, selfJid));

    const participantNodes: Buffer[] = [];
    for (const deviceJid of deviceJids) {
      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid) ? result.selfDevicePayload : result.devicePayload;
        const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: skdmEnc.type, "decrypt-fail": "hide" }, skdmEnc.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to distribute revoke SKDM to ${deviceJid}:`, err);
      }
    }

    const timestampMs = now();
    const phash = buildParticipantListHash(deviceJids);
    const msgNode = encodeNode("message", { to: groupJid, type: "text", id: revokeId, phash, edit: E2EE_EDIT_SENDER_REVOKE }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("meta", { "decrypt-fail": "hide" }, undefined),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
      encodeNode("enc", { v: "3", type: "skmsg" }, result.groupCiphertext),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "group",
      chatJid: groupJid,
      messageId: revokeId,
      messageType: "revoke",
      messageApp,
      frankingTag,
      createdAtMs: timestampMs,
    });
    logger.info("ClientController", `E2EE group revoke sent to ${groupJid} for ${targetMessageId}`);
  }

  public async sendTyping(input: TypingInput): Promise<void> {
    this.assertE2EEReadyForThread(input.threadId, "sendTyping");
    await this.sendE2EETyping(input);
  }

  public async sendE2EETyping(input: TypingInput): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const chatJid = this.isE2EEGroupThread(input.threadId)
      ? input.threadId
      : normalizeDMThreadToJid(input.threadId);
    const state = input.isTyping ? "composing" : "paused";
    const node = encodeNode("chatstate", {
      from: toBareMessengerJid(this.getSelfE2EEJid()),
      to: chatJid,
    }, [encodeNode(state, {})]);

    await this.e2eeSocket.sendFrame(marshalBinary(node));
    logger.info("ClientController", `E2EE typing ${state} sent to ${chatJid}`);
  }
  // --- E2EE Media Upload Config ---
  private async getE2EEMediaUploadConfig(): Promise<MediaUploadConfig> {
    if (this.e2eeUploadConfig && !this.isMediaUploadConfigExpired(this.e2eeUploadConfig)) {
      return this.e2eeUploadConfig;
    }

    logger.info("ClientController", "Fetching E2EE media upload auth via media_conn...");
    this.e2eeUploadConfig = await this.e2eeHandler.getMediaUploadConfig();
    this.e2eeService.setProvider(this.e2eeService.getClient(), this.e2eeUploadConfig);
    return this.e2eeUploadConfig;
  }

  private async fetchMediaUploadConfigProactively(): Promise<void> {
    if (!this.e2eeConnected) return;
    try {
      const config = await this.e2eeHandler.getMediaUploadConfig();
      this.e2eeUploadConfig = config;
      this.e2eeService.setProvider(this.e2eeService.getClient(), config);
      logger.debug("ClientController", `Proactive media_conn fetched: host=${config.host}, auth=${config.auth ? `${config.auth.slice(0, 12)}...` : "(empty)"}`);
    } catch (err) {
      logger.warn("ClientController", "Proactive media_conn fetch failed (will retry on first media send):", err);
      throw err;
    }
  }

  private isMediaUploadConfigExpired(config: MediaUploadConfig): boolean {
    // Empty auth is always invalid - never cache it
    if (!config.auth) return true;
    const ttlSeconds = config.authTtl ?? config.ttl;
    if (!config.fetchedAtMs || !ttlSeconds) return false;
    const refreshSkewMs = 60_000;
    return now() >= config.fetchedAtMs + ttlSeconds * 1000 - refreshSkewMs;
  }

  public async sendE2EEImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "image", (fields) => (
      this.e2eeService.getClient().buildImageMessage({ ...fields, caption: input.caption })
    ));
  }

  public async sendE2EEVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "video", (fields) => (
      this.e2eeService.getClient().buildVideoMessage({ ...fields, caption: input.caption })
    ));
  }

  public async sendE2EEAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "audio", (fields) => (
      this.e2eeService.getClient().buildAudioMessage(fields)
    ));
  }

  public async sendE2EEFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "document", (fields) => (
      this.e2eeService.getClient().buildDocumentMessage({ ...fields, fileName: input.fileName })
    ));
  }

  /**
   * Common E2EE media send for one-to-one Messenger chats.
   * Mirrors whatsmeow's V3 node shape: message type="media" and mediatype on
   * each encrypted participant payload so current Messenger clients render the
   * decrypted payload as image/video/audio/document instead of broken text.
   */
  private async sendE2EEMediaDM(
    input: SendMediaInput,
    mediaType: E2EEDMMediaType,
    buildMessage: (fields: MediaFields) => Buffer,
  ): Promise<Record<string, unknown>> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    if (input.threadId.includes("@g.us") || input.threadId.includes(".g.")) {
      throw new Error(`E2EE group ${mediaType} send is not implemented yet`);
    }

    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const toJid = normalizeDMThreadToJid(input.threadId);
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));

    const uploadConfig = await this.getE2EEMediaUploadConfig();

    const defaultMime = this.getDefaultE2EEMediaMime(mediaType);
    const mimeType = input.mimeType ?? inferMimeTypeFromFileName(input.fileName, defaultMime);
    const media = await e2eeClient.encryptAndUploadMedia(
      uploadConfig,
      input.data,
      mediaType,
      mimeType,
      async () => {
        logger.info("ClientController", "Media upload 401, refreshing media_conn config...");
        const refreshed = await this.e2eeHandler.getMediaUploadConfig();
        this.e2eeUploadConfig = refreshed;
        this.e2eeService.setProvider(this.e2eeService.getClient(), refreshed);
        return refreshed;
      },
    );

    const mediaFields = this.withE2EEMediaDefaults(media.mediaFields, mediaType, input);
    const nodeMediaType = this.getE2EENodeMediaType(mediaType, mediaFields);
    const consumerApp = buildMessage(mediaFields);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(
      consumerApp,
      input.replyToMessageId ? { id: input.replyToMessageId, senderJid: toJid } : undefined,
    );

    const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
    const selfDevicePayload = e2eeClient.buildMessageTransport({
      messageApp,
      dsm: { destinationJid: toJid, phash: "" },
    });

    const participantNodes: Buffer[] = [];
    const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
    if (deviceJids.length === 0) {
      logger.warn("ClientController", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
    }

    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;

      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          logger.info("ClientController", `Establishing new session with ${deviceJid}`);
          const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }

        const payload = sameMessengerUser(deviceJid, selfJid)
          ? selfDevicePayload
          : devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type, mediatype: nodeMediaType }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt E2EE ${mediaType} fanout to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "media", id: messageId }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [
        encodeNode("franking_tag", {}, frankingTag),
      ]),
      encodeNode("trace", {}, [
        encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
      ]),
    ]);

    await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
    this.outgoingE2EECache.remember({
      kind: "dm",
      chatJid: toJid,
      messageId,
      messageType: mediaType,
      messageApp,
      frankingTag,
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE ${mediaType} sent to ${toJid} with ${participantNodes.length} devices`);
    return {
      messageId,
      timestampMs: now(),
      directPath: media.directPath,
      handle: media.handle,
      objectId: media.objectId,
    };
  }

  private getDefaultE2EEMediaMime(mediaType: E2EEDMMediaType): string {
    switch (mediaType) {
      case "image":
        return "image/jpeg";
      case "video":
        return "video/mp4";
      case "audio":
        return "audio/ogg; codecs=opus";
      case "document":
        return "application/octet-stream";
    }
  }

  private withE2EEMediaDefaults(fields: Omit<MediaFields, "caption" | "ptt" | "fileName">, mediaType: E2EEDMMediaType, input: SendMediaInput): MediaFields {
    const mediaFields: MediaFields = { ...fields };

    if (mediaType === "image" || mediaType === "video") {
      mediaFields.width = input.width ?? fields.width ?? 400;
      mediaFields.height = input.height ?? fields.height ?? 400;
    }
    if (mediaType === "video") {
      mediaFields.seconds = input.seconds ?? input.duration ?? fields.seconds ?? 0;
    }
    if (mediaType === "audio") {
      mediaFields.seconds = input.seconds ?? input.duration ?? fields.seconds ?? 0;
      mediaFields.ptt = input.ptt ?? true;
    }
    if (mediaType === "document") {
      mediaFields.fileName = input.fileName;
    }

    return mediaFields;
  }

  private getE2EENodeMediaType(mediaType: E2EEDMMediaType, fields: MediaFields): string {
    if (mediaType === "audio" && fields.ptt) return "ptt";
    return mediaType;
  }

  public async sendImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    this.assertE2EEReadyForThread(input.threadId, "sendImage");
    return this.sendE2EEImage(input);
  }

  public async sendVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    this.assertE2EEReadyForThread(input.threadId, "sendVideo");
    return this.sendE2EEVideo(input);
  }

  public async sendAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    this.assertE2EEReadyForThread(input.threadId, "sendAudio");
    return this.sendE2EEAudio(input);
  }

  public async sendFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    this.assertE2EEReadyForThread(input.threadId, "sendFile");
    return this.sendE2EEFile(input);
  }

  private requireApi(): FCAApi {
    if (!this.api) throw new Error("Client is not connected");
    return this.api;
  }
}
