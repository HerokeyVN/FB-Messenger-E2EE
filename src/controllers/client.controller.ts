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
import type { ActionContext } from "../core/action-context.ts";
import {
  editMessageAction,
  sendMessageAction,
  sendReactionAction,
  unsendMessageAction,
  sendTypingAction,
  markAsReadAction,
  listenAction
} from "../actions/messaging/index.ts";
import {
  muteThreadAction,
  renameThreadAction,
  setGroupPhotoAction,
  deleteThreadAction,
  createThreadAction,
  getThreadListAction,
  getThreadHistoryAction,
  forwardAttachmentAction,
  createPollAction,
  addGroupMemberAction,
  removeGroupMemberAction,
  changeAdminStatusAction,
} from "../actions/thread/index.ts";
import {
  searchUsersAction,
  getUserInfoAction,
  getFriendsListAction,
} from "../actions/user/index.ts";
import {
  sendImageAction,
  sendVideoAction,
  sendAudioAction,
  sendFileAction,
  sendFilesAction,
  sendStickerAction,
  downloadMediaAction,
} from "../actions/media/send-media.action.ts";
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
  SendMultipleMediaInput,
  SendReactionInput,
  SendStickerInput,
  SetGroupPhotoInput,
  TypingInput,
  UnsendMessageInput,
  SendMessageInput,
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

    void listenAction(this.getActionContext());

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

    // Build cookie header from FCA session — required for server to accept the WebSocket upgrade.
    // Without cookies the server returns HTTP 415 (Unsupported Media Type / Unauthorized).
    const api = this.requireApi();
    const appState: any[] = (api as any).getAppState?.() || [];
    const cookieStr = appState.map((c: any) => `${c.key}=${c.value}`).join("; ");
    logger.info("ClientController", "FCA appState length:", appState.length);
    logger.info("ClientController", "Cookie string snippet:", cookieStr.substring(0, 100));

    await noiseSocket.connect(ds.noiseKeyPriv, clientPayload, cookieStr || undefined);
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

  private getActionContext(): ActionContext {
    return {
      getUserId: () => this.userId,
      requireApi: () => this.requireApi(),
      requireE2EESocket: () => {
        if (!this.e2eeSocket) throw new Error("E2EE not connected");
        return this.e2eeSocket;
      },
      requireDeviceStore: () => {
        if (!this.activeDeviceStore) throw new Error("Device store not initialized");
        return this.activeDeviceStore;
      },
      getSelfE2EEJid: () => this.getSelfE2EEJid(),
      isE2EEThreadId: (threadId: string) => this.isE2EEThreadId(threadId),
      e2eeService: this.e2eeService,
      mediaService: this.mediaService,
      messagingService: this.messagingService,
      threadService: this.threadService,
      gateway: this.gateway,
      e2eeHandler: this.e2eeHandler,
      eventMapper: this.eventMapper,
      outgoingE2EECache: this.outgoingE2EECache,
      eventBus: this.eventBus,
      getMediaUploadConfig: () => this.getE2EEMediaUploadConfig(),
      refreshMediaUploadConfig: async () => {
        logger.info("ClientController", `Media upload 401, refreshing media_conn config...`);
        const refreshed = await this.e2eeHandler.getMediaUploadConfig();
        this.e2eeUploadConfig = refreshed;
        this.e2eeService.setProvider(this.e2eeService.getClient(), refreshed);
        return refreshed;
      },
    };
  }

  // Messaging delegate methods

  public async sendMessage(input: SendMessageInput): Promise<Record<string, unknown>> {
    return sendMessageAction(this.getActionContext(), input);
  }



  private getSelfE2EEJid(): string {
    const device = this.activeDeviceStore?.jidDevice ?? 0;
    return `${this.userId}.${device}@msgr`;
  }

  private isE2EEThreadId(threadId: string): boolean {
    return /^\d+$/.test(threadId) || threadId.includes("@msgr") || threadId.includes("@g.us") || threadId.includes(".g.");
  }

  public async sendReaction(input: SendReactionInput): Promise<void> {
    return sendReactionAction(this.getActionContext(), input);
  }

  /**
   * Unsend/revoke a message.
   *
   * - **E2EE threads**: Sends an encrypted `ConsumerApplication { applicationData { revoke } }`
   *   message over the Noise socket. The `fromMe` flag in the revoke key determines
   *   whether it is a sender revoke (`true`, default) or an admin revoke (`false`).
   * - **Non-E2EE threads**: Falls back to `fca-unofficial` HTTP unsend.
   */
  public async unsendMessage(input: UnsendMessageInput): Promise<void> {
    return unsendMessageAction(this.getActionContext(), input);
  }

  /**
   * Edit an E2EE message (change its text).
   *
   * - **E2EE threads**: Sends an encrypted `ConsumerApplication { content { editMessage { key, message, timestampMS } } }`
   *   payload with the edit message attribute set.
   * - **Non-E2EE threads**: Falls back to `fca-unofficial` HTTP edit.
   */
  public async editMessage(input: E2EEEditMessageInput): Promise<void> {
    return editMessageAction(this.getActionContext(), input);
  }

  public async sendTyping(input: TypingInput): Promise<void> {
    return sendTypingAction(this.getActionContext(), input);
  }

  public async markAsRead(input: MarkReadInput): Promise<void> {
    return markAsReadAction(this.getActionContext(), input);
  }

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

  public async sendImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    return sendImageAction(this.getActionContext(), input);
  }

  public async sendVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    return sendVideoAction(this.getActionContext(), input);
  }

  public async sendAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    return sendAudioAction(this.getActionContext(), input);
  }

  public async sendFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    return sendFileAction(this.getActionContext(), input);
  }

  public async sendFiles(
    input: SendMultipleMediaInput,
  ): Promise<Record<string, unknown> | Record<string, unknown>[]> {
    return sendFilesAction(this.getActionContext(), input);
  }

  public async sendSticker(input: SendStickerInput) {
    return sendStickerAction(this.getActionContext(), input);
  }

  public async downloadMedia(input: DownloadMediaInput) {
    return downloadMediaAction(this.getActionContext(), input);
  }

  public async muteThread(input: MuteThreadInput) { return muteThreadAction(this.getActionContext(), input); }
  public async renameThread(input: RenameThreadInput) { return renameThreadAction(this.getActionContext(), input); }
  public async setGroupPhoto(input: SetGroupPhotoInput) { return setGroupPhotoAction(this.getActionContext(), input); }
  public async deleteThread(input: DeleteThreadInput) { return deleteThreadAction(this.getActionContext(), input); }
  public async createThread(input: CreateThreadInput) { return createThreadAction(this.getActionContext(), input); }

  public async searchUsers(input: SearchUsersInput) { return searchUsersAction(this.getActionContext(), input); }
  public async getUserInfo(input: GetUserInfoInput) { return getUserInfoAction(this.getActionContext(), input); }

  public async getThreadList(input: GetThreadListInput) { return getThreadListAction(this.getActionContext(), input); }
  public async getThreadHistory(input: GetThreadHistoryInput) { return getThreadHistoryAction(this.getActionContext(), input); }
  public async forwardAttachment(input: ForwardAttachmentInput) { return forwardAttachmentAction(this.getActionContext(), input); }
  public async createPoll(input: CreatePollInput) { return createPollAction(this.getActionContext(), input); }
 
  public async addGroupMember(input: AddGroupMemberInput) { return addGroupMemberAction(this.getActionContext(), input); }
  public async removeGroupMember(input: RemoveGroupMemberInput) { return removeGroupMemberAction(this.getActionContext(), input); }
  public async changeAdminStatus(input: ChangeAdminStatusInput) { return changeAdminStatusAction(this.getActionContext(), input); }
  public async getFriendsList() { return getFriendsListAction(this.getActionContext()); }

  private requireApi(): FCAApi {
    if (!this.api) throw new Error("Client is not connected");
    return this.api;
  }
}

