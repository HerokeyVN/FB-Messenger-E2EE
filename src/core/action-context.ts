import { EventEmitter } from "node:events";
import type { FCAApi } from "fca-unofficial";
import type { DeviceStore } from "../e2ee/store/device-store.ts";
import type { FacebookE2EESocket } from "../e2ee/transport/noise/noise-socket.ts";
import type { OutboundMessageCache } from "../e2ee/application/outbound-message-cache.ts";
import type { E2EEHandler } from "../controllers/e2ee-handler.ts";
import type { EventMapper } from "../controllers/event-mapper.ts";
import type { E2EEService } from "../services/e2ee.service.ts";
import type { MediaService } from "../services/media.service.ts";
import type { MessagingService } from "../services/messaging.service.ts";
import type { ThreadService } from "../services/thread.service.ts";
import type { FacebookGatewayService } from "../services/facebook-gateway.service.ts";

/**
 * Provides all necessary dependencies and state for actions to execute.
 */
export interface ActionContext {
  /** The active user's ID */
  getUserId(): string;
  
  /** The active FCA API instance (throws if not connected) */
  requireApi(): FCAApi;
  
  /** The active E2EE socket (throws if not connected) */
  requireE2EESocket(): FacebookE2EESocket;
  
  /** The active E2EE device store (throws if not initialized) */
  requireDeviceStore(): DeviceStore;
  
  /** Returns the full E2EE JID of the current user device */
  getSelfE2EEJid(): string;
  
  /** Check if the thread is E2EE capable based on its ID */
  isE2EEThreadId(threadId: string): boolean;
  
  /** Services */
  readonly e2eeService: E2EEService;
  readonly mediaService: MediaService;
  readonly messagingService: MessagingService;
  readonly threadService: ThreadService;
  readonly gateway: FacebookGatewayService;
  
  /** Handlers & Cache */
  readonly e2eeHandler: E2EEHandler;
  readonly eventMapper: EventMapper;
  readonly outgoingE2EECache: OutboundMessageCache;
  readonly eventBus: EventEmitter;
  
  /** Gets the valid E2EE Media Upload Config, fetching if necessary */
  getMediaUploadConfig(): Promise<import("../models/media.ts").MediaUploadConfig>;
  
  /** Refresh the E2EE media upload configuration */
  refreshMediaUploadConfig(): Promise<import("../models/media.ts").MediaUploadConfig>;
}
