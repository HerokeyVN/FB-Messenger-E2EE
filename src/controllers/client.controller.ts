import { EventEmitter } from "node:events";
import { randomUUID } from "node:crypto";
import type { FCAApi } from "fca-unofficial";

import type { MessengerEvent } from "../models/domain.ts";
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
  CreateThreadInput,
  DeleteThreadInput,
  DownloadMediaInput,
  E2EEEditMessageInput,
  GetUserInfoInput,
  MarkReadInput,
  MuteThreadInput,
  RenameThreadInput,
  SearchUsersInput,
  SendAttachmentItem,
  SendMediaInput,
  SendMessageInput,
  SendMultipleMediaInput,
  SendReactionInput,
  SendStickerInput,
  SetGroupPhotoInput,
  TypingInput,
  UnsendMessageInput,
} from "../models/messaging.ts";
import type { AuthConfig } from "../models/config.ts";
import { AuthService } from "../services/auth.service.ts";
import type { E2EEService } from "../services/e2ee.service.ts";
import { FacebookGatewayService } from "../services/facebook-gateway.service.ts";
import { MediaService } from "../services/media.service.ts";
import { MessagingService } from "../services/messaging.service.ts";
import { ICDCService } from "../services/icdc.service.ts";
import type {
  AddGroupMemberInput,
  ChangeAdminStatusInput,
  CreatePollInput,
  EditMessageInput,
  ForwardAttachmentInput,
  GetThreadHistoryInput,
  GetThreadListInput,
  RemoveGroupMemberInput,
} from "../models/thread.ts";
import { ThreadService } from "../services/thread.service.ts";

import { DeviceStore } from "../e2ee/store/device-store.ts";
import { E2EEClient } from "../e2ee/application/e2ee-client.ts";
import type { MediaTypeKey } from "../e2ee/media/media-crypto.ts";
import { FacebookE2EESocket } from "../e2ee/transport/noise/noise-socket.ts";
import { FacebookDGWSocket } from "../e2ee/transport/dgw/dgw-socket.ts";
import { encodeClientPayload } from "../e2ee/message/message-builder.ts";
import { str, now } from "../utils/fca-utils.ts";
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
    private readonly messagingService: MessagingService,
    private readonly mediaService: MediaService,
    private readonly threadService: ThreadService,
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

    void this.gateway.startListening(
      api,
      event => this.eventMapper.emitMappedEvent(event),
      error =>
        this.eventBus.emit("event", {
          type: "error",
          data: { message: error.message },
        } satisfies MessengerEvent),
    );

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
    const isE2EE = this.isE2EEThreadId(input.threadId);
    const isGroup = input.threadId.includes("@g.us") || input.threadId.includes(".g.");

    if (this.e2eeConnected && isE2EE) {
      let messageId: string;
      if (isGroup) {
        messageId = await this.sendE2EEGroupText(
          input.threadId,
          input.text,
          input.replyToMessageId,
          input.replyToSenderJid,
        );
      } else {
        messageId = await this.sendE2EEText(
          input.threadId,
          input.text,
          input.replyToMessageId,
          input.replyToSenderJid,
        );
      }
      return { messageId, timestampMs: now() };
    }
    return this.messagingService.sendText(this.requireApi(), input);
  }

  public async sendE2EEText(
    threadId: string,
    text: string,
    replyToMessageId?: string,
    replyToSenderJid?: string,
  ): Promise<string> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const toJid = normalizeDMThreadToJid(threadId);
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));

    const result = await e2eeClient.buildDMTextFanoutPayloads({
      toJid,
      selfJid,
      text,
      isGroup: false,
      replyToId: replyToMessageId,
      // For DM: participant = sender of original msg. If caller knows who sent it, use that;
      // otherwise fall back to the peer's JID (correct for messages they sent to us).
      replyToSenderJid: replyToMessageId ? (replyToSenderJid ?? toJid) : undefined,
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
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE DM message sent to ${toJid} with ${participantNodes.length} devices`);
    return messageId;
  }

  public async sendE2EEGroupText(
    groupJid: string,
    text: string,
    replyToMessageId?: string,
    replyToSenderJid?: string,
  ): Promise<string> {
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

    // Encrypt the main group payload
    const result = await e2eeClient.encryptGroupText(
      groupJid,
      selfJid,
      text,
      messageId,
      replyToMessageId,
      replyToSenderJid,  // pass through — undefined when not replying
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
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE Group message sent to ${groupJid} with ${participantNodes.length} devices`);
    return messageId;
  }

  private getSelfE2EEJid(): string {
    const device = this.activeDeviceStore?.jidDevice ?? 0;
    return `${this.userId}.${device}@msgr`;
  }

  private isE2EEThreadId(threadId: string): boolean {
    return /^\d+$/.test(threadId) || threadId.includes("@msgr") || threadId.includes("@g.us") || threadId.includes(".g.");
  }

  public async sendReaction(input: SendReactionInput): Promise<void> { await this.messagingService.react(this.requireApi(), input); }

  /**
   * Unsend/revoke a message.
   *
   * - **E2EE threads**: Sends an encrypted `ConsumerApplication { applicationData { revoke } }`
   *   message over the Noise socket. The `fromMe` flag in the revoke key determines
   *   whether it is a sender revoke (`true`, default) or an admin revoke (`false`).
   * - **Non-E2EE threads**: Falls back to `fca-unofficial` HTTP unsend.
   */
  public async unsendMessage(input: UnsendMessageInput): Promise<void> {
    const isE2EE = this.isE2EEThreadId(input.threadId);
    if (this.e2eeConnected && isE2EE) {
      await this.sendE2EERevoke(input.threadId, input.messageId, input.fromMe ?? true);
      return;
    }
    await this.messagingService.unsend(this.requireApi(), input.messageId);
  }

  /**
   * Send an E2EE revoke (unsend) for a DM or group message.
   *
   * Builds a `ConsumerApplication { applicationData { revoke { key { id, fromMe } } } }`
   * payload, wraps it in MessageApplication + MessageTransport, then fans out to all
   * participant devices exactly like a normal DM or group text — but with the
   * correct edit attribute on the `<message>` node so the server and
   * receiving clients apply the correct revoke semantics.
   */
  private async sendE2EERevoke(threadId: string, messageId: string, fromMe: boolean): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const isGroup = threadId.includes("@g.us") || threadId.includes(".g.");

    // Edit attribute "7" for sender revoke or "8" for admin revoke
    const editAttr = fromMe ? "7" : "8";

    // ConsumerApplication { applicationData { revoke { key { id, fromMe, remoteJid } } } }
    const toJid = isGroup ? threadId : normalizeDMThreadToJid(threadId);
    const consumerApp = e2eeClient.buildRevokeMessage(messageId, { fromMe, remoteJid: toJid });
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
    const newMessageId = String(BigInt(Math.floor(Math.random() * 1e15)));

    if (isGroup) {
      // Group revoke
      const memberJids = await this.e2eeHandler.getGroupParticipants(threadId);
      const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
      const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers))
        .filter((jid) => !sameMessengerDevice(jid, selfJid));

      const groupResult = await e2eeClient.encryptGroupMessageApplication(
        threadId, selfJid, messageApp, newMessageId,
      );

      const participantNodes: Buffer[] = [];
      for (const deviceJid of deviceJids) {
        try {
          if (!(await e2eeClient.hasSession(deviceJid))) {
            const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
            await e2eeClient.establishSession(deviceJid, bundle);
          }
          const payload = sameMessengerUser(deviceJid, selfJid)
            ? groupResult.selfDevicePayload
            : groupResult.devicePayload;
          const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
          participantNodes.push(encodeNode("to", { jid: deviceJid }, [
            encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext),
          ]));
        } catch (err) {
          logger.error("ClientController", `Failed to distribute revoke SKDM to ${deviceJid}:`, err);
        }
      }

      const phash = buildParticipantListHash(deviceJids);
      const msgNode = encodeNode("message", { to: threadId, type: "text", id: newMessageId, phash, edit: editAttr }, [
        encodeNode("participants", {}, participantNodes),
        encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
        encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
        encodeNode("enc", { v: "3", type: "skmsg", "decrypt-fail": "hide" }, groupResult.groupCiphertext),
      ]);
      await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
      logger.info("ClientController", `E2EE group revoke sent for message ${messageId} in ${threadId}`);
    } else {
      // DM revoke
      const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
      const selfDevicePayload = e2eeClient.buildMessageTransport({
        messageApp,
        dsm: { destinationJid: toJid, phash: "" },
      });

      const participantNodes: Buffer[] = [];
      const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));

      for (const deviceJid of deviceJids) {
        if (sameMessengerDevice(deviceJid, selfJid)) continue;
        try {
          if (!(await e2eeClient.hasSession(deviceJid))) {
            const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
            await e2eeClient.establishSession(deviceJid, bundle);
          }
          const payload = sameMessengerUser(deviceJid, selfJid)
            ? selfDevicePayload
            : devicePayload;
          const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
          participantNodes.push(encodeNode("to", { jid: deviceJid }, [
            encodeNode("enc", { v: "3", type: encrypted.type, "decrypt-fail": "hide" }, encrypted.ciphertext),
          ]));
        } catch (err) {
          logger.error("ClientController", `Failed to encrypt revoke to ${deviceJid}:`, err);
        }
      }

      const msgNode = encodeNode("message", { to: toJid, type: "text", id: newMessageId, edit: editAttr }, [
        encodeNode("participants", {}, participantNodes),
        encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
        encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
      ]);
      await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
      logger.info("ClientController", `E2EE DM revoke sent for message ${messageId} to ${toJid}`);
    }
  }

  /**
   * Edit an E2EE message (change its text).
   *
   * - **E2EE threads**: Sends an encrypted `ConsumerApplication { content { editMessage { key, message, timestampMS } } }`
   *   payload with the edit message attribute set.
   * - **Non-E2EE threads**: Falls back to `fca-unofficial` HTTP edit.
   */
  public async editMessage(input: E2EEEditMessageInput): Promise<void> {
    const isE2EE = this.isE2EEThreadId(input.threadId);
    if (this.e2eeConnected && isE2EE) {
      await this.sendE2EEEdit(input.threadId, input.messageId, input.newText);
      return;
    }
    // Fallback: fca-unofficial plaintext edit (non-E2EE threads)
    await this.threadService.editMessage(this.requireApi(), {
      messageId: input.messageId,
      newText: input.newText,
    });
  }

  /**
   * Send an E2EE message edit for a DM or group message.
   *
   * Builds a `ConsumerApplication { payload { content { editMessage { key, message, timestampMS } } } }`
   * payload, fanned out to all participant devices exactly like a normal message send.
   */
  private async sendE2EEEdit(threadId: string, messageId: string, newText: string): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.getSelfE2EEJid();
    const isGroup = threadId.includes("@g.us") || threadId.includes(".g.");

    // Edit attribute "1" for standard message edits
    const editAttr = "1";

    const toJid = isGroup ? threadId : normalizeDMThreadToJid(threadId);
    const consumerApp = e2eeClient.buildEditMessage(messageId, newText);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
    const newMessageId = String(BigInt(Math.floor(Math.random() * 1e15)));

    if (isGroup) {
      const memberJids = await this.e2eeHandler.getGroupParticipants(threadId);
      const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
      const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList(deviceUsers))
        .filter((jid) => !sameMessengerDevice(jid, selfJid));

      const groupResult = await e2eeClient.encryptGroupMessageApplication(
        threadId, selfJid, messageApp, newMessageId,
      );

      const participantNodes: Buffer[] = [];
      for (const deviceJid of deviceJids) {
        try {
          if (!(await e2eeClient.hasSession(deviceJid))) {
            const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
            await e2eeClient.establishSession(deviceJid, bundle);
          }
          const payload = sameMessengerUser(deviceJid, selfJid)
            ? groupResult.selfDevicePayload
            : groupResult.devicePayload;
          const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
          participantNodes.push(encodeNode("to", { jid: deviceJid }, [
            encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext),
          ]));
        } catch (err) {
          logger.error("ClientController", `Failed to distribute edit SKDM to ${deviceJid}:`, err);
        }
      }

      const phash = buildParticipantListHash(deviceJids);
      const msgNode = encodeNode("message", { to: threadId, type: "text", id: newMessageId, phash, edit: editAttr }, [
        encodeNode("participants", {}, participantNodes),
        encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
        encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
        encodeNode("enc", { v: "3", type: "skmsg", "decrypt-fail": "hide" }, groupResult.groupCiphertext),
      ]);
      await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
      logger.info("ClientController", `E2EE group edit sent for message ${messageId} in ${threadId}`);
    } else {
      const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
      const selfDevicePayload = e2eeClient.buildMessageTransport({
        messageApp,
        dsm: { destinationJid: toJid, phash: "" },
      });

      const participantNodes: Buffer[] = [];
      const deviceJids = uniqueJids(await this.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));

      for (const deviceJid of deviceJids) {
        if (sameMessengerDevice(deviceJid, selfJid)) continue;
        try {
          if (!(await e2eeClient.hasSession(deviceJid))) {
            const bundle = await this.e2eeHandler.getPreKeyBundle(deviceJid);
            await e2eeClient.establishSession(deviceJid, bundle);
          }
          const payload = sameMessengerUser(deviceJid, selfJid)
            ? selfDevicePayload
            : devicePayload;
          const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
          participantNodes.push(encodeNode("to", { jid: deviceJid }, [
            encodeNode("enc", { v: "3", type: encrypted.type, "decrypt-fail": "hide" }, encrypted.ciphertext),
          ]));
        } catch (err) {
          logger.error("ClientController", `Failed to encrypt edit to ${deviceJid}:`, err);
        }
      }

      const msgNode = encodeNode("message", { to: toJid, type: "text", id: newMessageId, edit: editAttr }, [
        encodeNode("participants", {}, participantNodes),
        encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
        encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
      ]);
      await this.e2eeSocket.sendFrame(marshalBinary(msgNode));
      logger.info("ClientController", `E2EE DM edit sent for message ${messageId} to ${toJid}`);
    }
  }

  public async sendTyping(input: TypingInput): Promise<void> { await this.messagingService.sendTyping(this.requireApi(), input); }
  public async markAsRead(input: MarkReadInput): Promise<void> { await this.messagingService.markAsRead(this.requireApi(), input); }

  // E2EE Media Upload Config
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
    // Empty auth is always invalid
    if (!config.auth) return true;
    const ttlSeconds = config.authTtl ?? config.ttl;
    if (!config.fetchedAtMs || !ttlSeconds) return false;
    const refreshSkewMs = 60_000;
    return now() >= config.fetchedAtMs + ttlSeconds * 1000 - refreshSkewMs;
  }

  public async sendE2EEImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "image", (fields) => this.e2eeService.getClient().buildImageMessage({ ...fields as unknown as MediaFields, caption: input.caption }));
  }

  public async sendE2EEVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "video", (fields) => this.e2eeService.getClient().buildVideoMessage({ ...fields as unknown as MediaFields, caption: input.caption }));
  }

  public async sendE2EEAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "audio", (fields) => this.e2eeService.getClient().buildAudioMessage(fields as unknown as MediaFields));
  }

  public async sendE2EEFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.sendE2EEMediaDM(input, "document", (fields) => this.e2eeService.getClient().buildDocumentMessage({ ...fields as unknown as MediaFields, fileName: input.fileName, caption: input.caption }));
  }

  /**
   * Common E2EE media send for DM (fanout per-device encrypted message).
   * All E2EE media messages use type="text" because the server cannot see the actual content.
   */
  private async sendE2EEMediaDM(
    input: SendMediaInput,
    mediaType: MediaTypeKey,
    buildMessage: (fields: Record<string, unknown>) => Buffer,
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

    const defaultMime = mediaType === "image" ? "image/png" : mediaType === "video" ? "video/mp4" : mediaType === "audio" ? "audio/ogg" : "application/octet-stream";
    const media = await e2eeClient.encryptAndUploadMedia(
      uploadConfig,
      input.data,
      mediaType,
      input.mimeType || defaultMime,
      async () => {
        logger.info("ClientController", `Media upload 401, refreshing media_conn config...`);
        const refreshed = await this.e2eeHandler.getMediaUploadConfig();
        this.e2eeUploadConfig = refreshed;
        this.e2eeService.setProvider(this.e2eeService.getClient(), refreshed);
        return refreshed;
      },
    );

    const consumerApp = buildMessage(media.mediaFields);
    const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(
      consumerApp,
      input.replyToMessageId
        ? {
            messageId: input.replyToMessageId,
            chatJid: toJid,
            senderJid: input.replyToSenderJid ?? toJid,
          }
        : undefined,
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
          encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("ClientController", `Failed to encrypt E2EE ${mediaType} fanout to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
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
    return { messageId, timestampMs: now(), directPath: media.directPath };
  }

  public async sendImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEImage(input);
    }
    return this.mediaService.sendImage(this.requireApi(), input);
  }

  public async sendVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEVideo(input);
    }
    return this.mediaService.sendVideo(this.requireApi(), input);
  }

  public async sendAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEAudio(input);
    }
    return this.mediaService.sendAudio(this.requireApi(), input);
  }

  public async sendFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      return this.sendE2EEFile(input);
    }
    return this.mediaService.sendFile(this.requireApi(), input);
  }

  /**
   * Send multiple files/attachments.
   *
   * - **Non-E2EE threads**: All files are bundled into a single FCA message.
   * - **E2EE threads**: Files are sent as separate sequential encrypted E2EE
   *   media messages (the protocol does not support multi-attachment in one
   *   encrypted frame). Returns an array with one result per attachment.
   */
  public async sendFiles(
    input: SendMultipleMediaInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    if (input.attachments.length === 0) {
      throw new Error("sendFiles requires at least one attachment");
    }

    if (this.e2eeConnected && this.isE2EEThreadId(input.threadId)) {
      // E2EE: send each attachment as its own encrypted message
      const results: Record<string, unknown>[] = [];
      for (let i = 0; i < input.attachments.length; i++) {
        const att: SendAttachmentItem = input.attachments[i]!;
        const mediaInput: SendMediaInput = {
          threadId: input.threadId,
          data: att.data,
          fileName: att.fileName,
          mimeType: att.mimeType,
          // Caption on first attachment only
          caption: i === 0 ? input.caption : undefined,
          replyToMessageId: i === 0 ? input.replyToMessageId : undefined,
          width: att.width,
          height: att.height,
          seconds: att.seconds,
          ptt: att.ptt,
        };
        const mediaType = inferMediaType(att.fileName, att.mimeType);
        let result: Record<string, unknown>;
        switch (mediaType) {
          case "image":  result = await this.sendE2EEImage(mediaInput); break;
          case "video":  result = await this.sendE2EEVideo(mediaInput); break;
          case "audio":  result = await this.sendE2EEAudio(mediaInput); break;
          default:       result = await this.sendE2EEFile(mediaInput); break;
        }
        results.push(result);
      }
      return results;
    }

    // Non-E2EE: bundle all attachments into one FCA message
    return this.mediaService.sendFiles(this.requireApi(), {
      threadId: input.threadId,
      attachments: input.attachments.map(a => ({ data: a.data, fileName: a.fileName })),
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
    });
  }
  public async sendSticker(input: SendStickerInput) { return this.mediaService.sendSticker(this.requireApi(), input); }
  public async downloadMedia(input: DownloadMediaInput) { return this.mediaService.downloadMedia(input); }

  public async muteThread(input: MuteThreadInput) { await this.mediaService.muteThread(this.requireApi(), input); }
  public async renameThread(input: RenameThreadInput) { await this.mediaService.renameThread(this.requireApi(), input); }
  public async setGroupPhoto(input: SetGroupPhotoInput) { await this.mediaService.setGroupPhoto(this.requireApi(), input); }
  public async deleteThread(input: DeleteThreadInput) { await this.mediaService.deleteThread(this.requireApi(), input); }
  public async createThread(input: CreateThreadInput) { return this.mediaService.createThread(this.requireApi(), input); }

  public async searchUsers(input: SearchUsersInput) { return this.mediaService.searchUsers(this.requireApi(), input); }
  public async getUserInfo(input: GetUserInfoInput) { return this.mediaService.getUserInfo(this.requireApi(), input); }

  public async getThreadList(input: GetThreadListInput) { return this.threadService.getThreadList(this.requireApi(), input); }
  public async getThreadHistory(input: GetThreadHistoryInput) { return this.threadService.getThreadHistory(this.requireApi(), input); }
  public async forwardAttachment(input: ForwardAttachmentInput) { await this.threadService.forwardAttachment(this.requireApi(), input); }
  public async createPoll(input: CreatePollInput) { await this.threadService.createPoll(this.requireApi(), input); }
 
  public async addGroupMember(input: AddGroupMemberInput) { await this.threadService.addGroupMember(this.requireApi(), input); }
  public async removeGroupMember(input: RemoveGroupMemberInput) { await this.threadService.removeGroupMember(this.requireApi(), input); }
  public async changeAdminStatus(input: ChangeAdminStatusInput) { await this.threadService.changeAdminStatus(this.requireApi(), input); }
  public async getFriendsList() { return this.threadService.getFriendsList(this.requireApi()); }

  private requireApi(): FCAApi {
    if (!this.api) throw new Error("Client is not connected");
    return this.api;
  }
}

/**
 * Infer an E2EE media type key from a file name and optional MIME type.
 * Falls back to "document" for unknown types.
 */
function inferMediaType(fileName: string, mimeType?: string): "image" | "video" | "audio" | "document" {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm", "3gp", "m4v"].includes(ext)) return "video";
  if (["mp3", "ogg", "aac", "flac", "wav", "m4a", "opus"].includes(ext)) return "audio";
  return "document";
}
