import type {
  MessengerEvent,
  MessengerMessage,
  Thread,
  UserInfo,
} from "../models/domain.ts";
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
import type { ClientOptions, MessengerEventMap } from "../models/client.ts";
import { TypedEventEmitter } from "../types/advanced-types.ts";
import { ClientController } from "../controllers/client.controller.ts";
import { FileSessionRepository } from "../repositories/session.repository.ts";
import { AuthService } from "../services/auth.service.ts";
import { E2EEService } from "../services/e2ee.service.ts";
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


export class FBClient {
  private readonly eventBus = new TypedEventEmitter<MessengerEventMap>();
  private readonly controller: ClientController;

  public constructor(private readonly options: ClientOptions) {
    const sessionRepository = new FileSessionRepository();
    const authService = new AuthService(sessionRepository);
    const gateway = new FacebookGatewayService();
    const messagingService = new MessagingService(gateway);
    const mediaService = new MediaService(gateway);
    const threadService = new ThreadService(mediaService);
    const e2eeService = new E2EEService();

    const icdcService = new ICDCService(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );
    this.controller = new ClientController(
      authService,
      gateway,
      messagingService,
      mediaService,
      threadService,
      e2eeService,
      icdcService,
      this.eventBus as any,
    );
  }

  // Events

  /** Listen for events. Supports catch-all or specific event types. */
  public onEvent(listener: (event: MessengerEvent) => void): void;
  public onEvent<K extends keyof MessengerEventMap>(
    event: K,
    listener: (data: MessengerEventMap[K]) => void,
  ): void;
  public onEvent(arg1: any, arg2?: any): void {
    if (typeof arg1 === "function") {
      this.eventBus.on("event", arg1);
    } else {
      this.eventBus.on(arg1, arg2);
    }
  }

  /** Stop listening for events. */
  public offEvent(listener: (event: MessengerEvent) => void): void;
  public offEvent<K extends keyof MessengerEventMap>(
    event: K,
    listener: (data: MessengerEventMap[K]) => void,
  ): void;
  public offEvent(arg1: any, arg2?: any): void {
    if (typeof arg1 === "function") {
      this.eventBus.off("event", arg1);
    } else {
      this.eventBus.off(arg1, arg2);
    }
  }

  /** Legacy helper for the 'event' wrapper used by the controller */
  public onAnyEvent(listener: (event: MessengerEvent) => void): void {
    // The controller currently emits everything as 'event' event with MessengerEvent payload
    // We should probably refactor the controller too, but for now we'll support this
    (this.eventBus as any).on("event", listener);
  }

  // Lifecycle

  public async connect(): Promise<{ userId: string }> {
    return this.controller.connect(
      {
        appStatePath: this.options.appStatePath,
        appState: this.options.appState,
        platform: this.options.platform ?? "facebook",
      },
      this.options.sessionStorePath,
    );
  }

  public async disconnect(): Promise<void> {
    await this.controller.disconnect();
  }

  // E2EE

  public async connectE2EE(deviceStorePath: string, userId: string): Promise<void> {
    await this.controller.connectE2EE(deviceStorePath, userId);
  }

  public async sendNoiseKeepAlive(): Promise<void> {
    await this.controller.sendNoiseKeepAlive();
  }

  // Messaging

  public async sendMessage(input: SendMessageInput): Promise<Record<string, unknown>> {
    return this.controller.sendMessage(input);
  }

  public async sendReaction(input: SendReactionInput): Promise<void> {
    await this.controller.sendReaction(input);
  }

  public async unsendMessage(messageId: string): Promise<void> {
    await this.controller.unsendMessage(messageId);
  }

  public async sendTyping(input: TypingInput): Promise<void> {
    await this.controller.sendTyping(input);
  }

  public async markAsRead(input: MarkReadInput): Promise<void> {
    await this.controller.markAsRead(input);
  }

  // Media send

  public async sendImage(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.controller.sendImage(input);
  }

  public async sendVideo(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.controller.sendVideo(input);
  }

  public async sendAudio(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.controller.sendAudio(input);
  }

  public async sendFile(input: SendMediaInput): Promise<Record<string, unknown>> {
    return this.controller.sendFile(input);
  }

  public async sendSticker(input: SendStickerInput): Promise<Record<string, unknown>> {
    return this.controller.sendSticker(input);
  }

  // Media download

  /** Downloads raw bytes from a Facebook CDN URL. */
  public async downloadMedia(input: DownloadMediaInput): Promise<Buffer> {
    return this.controller.downloadMedia(input);
  }

  // Thread / group management

  /** Mute a thread. muteSeconds = -1 -> forever, 0 -> unmute. */
  public async muteThread(input: MuteThreadInput): Promise<void> {
    await this.controller.muteThread(input);
  }

  /** Rename a group thread. */
  public async renameThread(input: RenameThreadInput): Promise<void> {
    await this.controller.renameThread(input);
  }

  /** Set the group photo/avatar. */
  public async setGroupPhoto(input: SetGroupPhotoInput): Promise<void> {
    await this.controller.setGroupPhoto(input);
  }

  /** Delete / leave a thread. */
  public async deleteThread(input: DeleteThreadInput): Promise<void> {
    await this.controller.deleteThread(input);
  }

  /** Create a 1:1 thread with a user (or find existing DM). */
  public async createThread(input: CreateThreadInput): Promise<Thread> {
    return this.controller.createThread(input);
  }

  // User / search

  public async searchUsers(input: SearchUsersInput): Promise<UserInfo[]> {
    return this.controller.searchUsers(input);
  }

  public async getUserInfo(input: GetUserInfoInput): Promise<UserInfo | null> {
    return this.controller.getUserInfo(input);
  }

  // Thread list / history

  /** Get paginated list of threads. */
  public async getThreadList(input: GetThreadListInput): Promise<ThreadDetails[]> {
    return this.controller.getThreadList(input);
  }

  /** Get message history for a thread. */
  public async getThreadHistory(input: GetThreadHistoryInput): Promise<MessengerMessage[]> {
    return this.controller.getThreadHistory(input);
  }

  // Forward / poll / edit

  /** Forward a media attachment to one or more threads. */
  public async forwardAttachment(input: ForwardAttachmentInput): Promise<void> {
    await this.controller.forwardAttachment(input);
  }

  /** Create a poll inside a group thread. */
  public async createPoll(input: CreatePollInput): Promise<void> {
    await this.controller.createPoll(input);
  }

  /** Edit an already-sent (non-E2EE) message. */
  public async editMessage(input: EditMessageInput): Promise<EditMessageResult> {
    return this.controller.editMessage(input);
  }

  // Group member management

  /** Add one or more members to a group thread. */
  public async addGroupMember(input: AddGroupMemberInput): Promise<void> {
    await this.controller.addGroupMember(input);
  }

  /** Remove a member from a group thread. */
  public async removeGroupMember(input: RemoveGroupMemberInput): Promise<void> {
    await this.controller.removeGroupMember(input);
  }

  /** Promote or demote a group member's admin status. */
  public async changeAdminStatus(input: ChangeAdminStatusInput): Promise<void> {
    await this.controller.changeAdminStatus(input);
  }

  /** Get the logged-in user's friends list. */
  public async getFriendsList(): Promise<UserInfo[]> {
    return this.controller.getFriendsList();
  }
}
