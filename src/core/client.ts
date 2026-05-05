import type { MessengerEvent } from "../models/domain.ts";
import type {
  SendMediaInput,
  SendMessageInput,
  SendReactionInput,
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
import { ICDCService } from "../services/icdc.service.ts";

/**
 * E2EE-only Messenger client facade.
 *
 * `fca-unofficial` is still used internally for app-state login and CAT/bootstrap
 * material that the E2EE transport currently requires, but plaintext/non-E2EE
 * messaging, thread management, polls, stickers, and history APIs are intentionally
 * not exposed here. Use `fca-unofficial` directly for those non-E2EE surfaces.
 */
export class FBClient {
  private readonly eventBus = new TypedEventEmitter<MessengerEventMap>();
  private readonly controller: ClientController;

  public constructor(private readonly options: ClientOptions) {
    const sessionRepository = new FileSessionRepository();
    const authService = new AuthService(sessionRepository);
    const gateway = new FacebookGatewayService();
    const mediaService = new MediaService(gateway);
    const e2eeService = new E2EEService();

    const icdcService = new ICDCService(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    );
    this.controller = new ClientController(
      authService,
      gateway,
      mediaService,
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

  /** Legacy helper for the catch-all wrapper event. */
  public onAnyEvent(listener: (event: MessengerEvent) => void): void {
    (this.eventBus as any).on("event", listener);
  }

  // Lifecycle

  /**
   * Login with appState and prepare auth/CAT bootstrap state.
   * This does not start plaintext/non-E2EE MQTT listening.
   */
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

  // E2EE lifecycle

  public async connectE2EE(deviceStorePath: string, userId: string): Promise<void> {
    await this.controller.connectE2EE(deviceStorePath, userId);
  }

  public async sendNoiseKeepAlive(): Promise<void> {
    await this.controller.sendNoiseKeepAlive();
  }

  // E2EE messaging

  public async sendMessage(input: SendMessageInput): Promise<Record<string, unknown>> {
    return this.controller.sendMessage(input);
  }

  public async sendReaction(input: SendReactionInput): Promise<void> {
    await this.controller.sendReaction(input);
  }

  public async unsendMessage(messageId: string, threadId?: string): Promise<void> {
    await this.controller.unsendMessage(messageId, threadId);
  }

  public async sendTyping(input: TypingInput): Promise<void> {
    await this.controller.sendTyping(input);
  }

  // E2EE media send

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
}
