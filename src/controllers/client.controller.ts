import { EventEmitter } from "node:events";
import type { FCAApi } from "fca-unofficial";

import type {
  MessengerEvent,
  MessengerMessage,
  Thread,
  UserInfo,
} from "../models/domain.ts";
import {
  unmarshal,
  buildUnifiedSessionId,
  encodePresenceAvailable,
  encodePrimingNode,
  encodeSetPassive,
} from "../e2ee/wa-binary.ts";
import type { DGWEndpointKind } from "../e2ee/dgw-socket.ts";
import type { Node } from "../e2ee/wa-binary.ts";
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
  EditMessageResult,
  ForwardAttachmentInput,
  GetThreadHistoryInput,
  GetThreadListInput,
  RemoveGroupMemberInput,
  ThreadDetails,
} from "../models/thread.ts";
import { ThreadService } from "../services/thread.service.ts";

import { DeviceStore } from "../e2ee/device-store.ts";
import { E2EEClient } from "../e2ee/e2ee-client.ts";
import { FacebookE2EESocket } from "../e2ee/noise-socket.ts";
import { FacebookDGWSocket } from "../e2ee/dgw-socket.ts";
import { encodeClientPayload } from "../e2ee/message-builder.ts";
import { str, now } from "../utils/fca-utils.ts";
import { EventMapper } from "./event-mapper.ts";
import { DGWHandler } from "./dgw-handler.ts";
import { E2EEHandler } from "./e2ee-handler.ts";

export class ClientController {
  private api: FCAApi | null = null;
  private dgwSocket: FacebookDGWSocket | null = null;
  private e2eeSocket: FacebookE2EESocket | null = null;
  private activeDeviceStore: DeviceStore | null = null;
  private e2eeConnected: boolean = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private userId: string = "";

  private readonly eventMapper: EventMapper;
  private readonly dgwHandler: DGWHandler;
  private readonly e2eeHandler: E2EEHandler;

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
      () => this.activeDeviceStore
    );
  }

  // Lifecycle

  public async connect(authConfig: AuthConfig, sessionStorePath: string): Promise<{ userId: string }> {
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

    await this.authService.saveSession(sessionStorePath, session);

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

  public async connectE2EE(deviceStorePath: string, userId: string): Promise<void> {
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
      this.eventMapper.emit({ type: "disconnected", data: { isE2EE: true } });
    });

    noiseSocket.on("error", (err) => {
      this.eventMapper.emit({ type: "error", data: { message: err.message } });
    });

    console.log("[ClientController] Fetching CAT...");
    const fbCat = await this.gateway.fetchCAT(this.requireApi());

    if (!ds.jidDevice) {
      const api = this.requireApi();
      const appState = (api as any).getAppState?.() || [];
      const cookieStr = appState.map((c: any) => `${c.key}=${c.value}`).join("; ");
      this.icdcService.setCookies(cookieStr);

      console.log("[ClientController] Registering new device via ICDC...");
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
        if ((node.tag === "message" || node.tag === "iq" || node.tag === "presence") && node.attrs.id) {
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
          case "message":
          case "appdata":
            await this.e2eeHandler.handleEncryptedMessage(node, userId, client);
            break;
          case "ib":
            this.e2eeHandler.handleIB(node);
            break;
        }
      } catch (err) {
        console.error("[E2EE] Frame error:", err);
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

    // Prekey check
    try {
      const serverCount = await this.e2eeHandler.getServerPreKeyCount();
      if (serverCount < 10) await this.e2eeHandler.uploadPreKeys(80);
    } catch (err) {
      console.error("[ClientController] Prekey sync failed:", err);
    }

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
      if (!this.e2eeSocket) return;
      const { encodeKeepAlive } = await import("../e2ee/wa-binary.ts");
      const id = (now() % 1000).toString();
      const keepAliveBuf = encodeKeepAlive(id);
      await this.e2eeSocket.sendFrame(keepAliveBuf);
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
    if (this.e2eeConnected && (/^\d+$/.test(input.threadId) || input.threadId.includes("@msgr"))) {
      try {
        await this.sendE2EEText(input.threadId, input.text);
        return { messageId: `e2ee-${now()}`, timestampMs: now() };
      } catch (err) {
        console.warn("[ClientController] E2EE send failed, fallback:", (err as Error).message);
      }
    }
    return this.messagingService.sendText(this.requireApi(), input);
  }

  public async sendE2EEText(threadId: string, text: string): Promise<void> {
    if (!this.e2eeSocket) throw new Error("E2EE not connected");
    const e2eeClient = this.e2eeService.getClient();
    const selfJid = this.userId + ".0@msgr";
    const toJid = threadId.includes("@") ? threadId : (threadId.includes(".") ? threadId + "@msgr" : threadId + ".0@msgr");

    const result = await e2eeClient.encryptDMText({ toJid, selfJid, text, isGroup: false });
    const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));
    const msgNode: Node = {
      tag: "message",
      attrs: { to: toJid, type: "chat", id: messageId },
      content: [{ tag: "enc", attrs: { v: "3", type: result.encrypted.type }, content: result.encrypted.ciphertext }],
    };

    const { marshal: m } = await import("../e2ee/wa-binary.ts");
    await this.e2eeSocket.sendFrame(m(msgNode));
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
