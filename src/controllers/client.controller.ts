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
import type {
  CreateThreadInput,
  DeleteThreadInput,
  DownloadMediaInput,
  GetUserInfoInput,
  MarkReadInput,
  MuteThreadInput,
  RenameThreadInput,
  SearchUsersInput,
  SendMediaInput,
  SendMessageInput,
  SendReactionInput,
  SendStickerInput,
  SetGroupPhotoInput,
  TypingInput,
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
    this.e2eeService.setProvider(client, {
      host: "rupload.facebook.com",
      auth: "MOCK_AUTH",
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
    const isE2EE = /^\d+$/.test(input.threadId) || input.threadId.includes("@msgr") || input.threadId.includes("@g.us") || input.threadId.includes(".g.");
    const isGroup = input.threadId.includes("@g.us") || input.threadId.includes(".g.");

    if (this.e2eeConnected && isE2EE) {
      if (isGroup) {
        await this.sendE2EEGroupText(input.threadId, input.text, input.replyToMessageId);
      } else {
        await this.sendE2EEText(input.threadId, input.text, input.replyToMessageId);
      }
      return { messageId: `e2ee-${now()}`, timestampMs: now() };
    }
    return this.messagingService.sendText(this.requireApi(), input);
  }

  public async sendE2EEText(threadId: string, text: string, replyToMessageId?: string): Promise<void> {
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
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE DM message sent to ${toJid} with ${participantNodes.length} devices`);
  }

  public async sendE2EEGroupText(groupJid: string, text: string, replyToMessageId?: string): Promise<void> {
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
      createdAtMs: now(),
    });
    logger.info("ClientController", `E2EE Group message sent to ${groupJid} with ${participantNodes.length} devices`);
  }

  private getSelfE2EEJid(): string {
    const device = this.activeDeviceStore?.jidDevice ?? 0;
    return `${this.userId}.${device}@msgr`;
  }

  public async sendReaction(input: SendReactionInput): Promise<void> { await this.messagingService.react(this.requireApi(), input); }
  public async unsendMessage(messageId: string): Promise<void> { await this.messagingService.unsend(this.requireApi(), messageId); }
  public async sendTyping(input: TypingInput): Promise<void> { await this.messagingService.sendTyping(this.requireApi(), input); }
  public async markAsRead(input: MarkReadInput): Promise<void> { await this.messagingService.markAsRead(this.requireApi(), input); }

  public async sendImage(input: SendMediaInput) { return this.mediaService.sendImage(this.requireApi(), input); }
  public async sendVideo(input: SendMediaInput) { return this.mediaService.sendVideo(this.requireApi(), input); }
  public async sendAudio(input: SendMediaInput) { return this.mediaService.sendAudio(this.requireApi(), input); }
  public async sendFile(input: SendMediaInput) { return this.mediaService.sendFile(this.requireApi(), input); }
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
  public async editMessage(input: EditMessageInput) { return this.threadService.editMessage(this.requireApi(), input); }
  public async addGroupMember(input: AddGroupMemberInput) { await this.threadService.addGroupMember(this.requireApi(), input); }
  public async removeGroupMember(input: RemoveGroupMemberInput) { await this.threadService.removeGroupMember(this.requireApi(), input); }
  public async changeAdminStatus(input: ChangeAdminStatusInput) { await this.threadService.changeAdminStatus(this.requireApi(), input); }
  public async getFriendsList() { return this.threadService.getFriendsList(this.requireApi()); }

  private requireApi(): FCAApi {
    if (!this.api) throw new Error("Client is not connected");
    return this.api;
  }
}
