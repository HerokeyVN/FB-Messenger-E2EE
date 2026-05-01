/**
 * Integration tests for fbE2EE - runs with Bun test runner (bun test).
 *
 * These tests use in-memory fixture data and do NOT hit Facebook's servers.
 * They verify that:
 *   - domain mapping (attachment normalisation, mention mapping, event mapping) is correct
 *   - service-level methods behave correctly given a stubbed FCAApi
 *   - ClientController correctly wires services and emits typed events
 */

import { EventEmitter } from "node:events";
import { expect, mock, test, describe, beforeEach } from "bun:test";

// ---- Source under test -------------------------------------------------------
import type { FCAApi } from "fca-unofficial";
import { ClientController } from "../src/controllers/client.controller.ts";
import type { MessengerEvent, MessengerMessage } from "../src/models/domain.ts";
import { AuthService } from "../src/services/auth.service.ts";
import { E2EEService } from "../src/services/e2ee.service.ts";
import { FacebookGatewayService } from "../src/services/facebook-gateway.service.ts";
import { MediaService } from "../src/services/media.service.ts";
import { MessagingService } from "../src/services/messaging.service.ts";
import { ThreadService } from "../src/services/thread.service.ts";
import { ICDCService } from "../src/services/icdc.service.ts";

// ---- Fixture factories -------------------------------------------------------

function makeFakeApi(overrides: Partial<FCAApi> = {}): FCAApi {
  return {
    getCurrentUserID: () => "123456",
    getAppState: () => [],
    setOptions: () => undefined,
    listenMqtt: async () => undefined,
    sendMessage: async () => ({ messageID: "mid.001", timestamp: 1_700_000_000_000 }),
    setMessageReaction: async () => undefined,
    unsendMessage: async () => undefined,
    sendTypingIndicator: async () => undefined,
    markAsRead: async () => undefined,
    stopListenMqtt: () => undefined,
    muteThread: async () => undefined,
    setTitle: async () => undefined,
    deleteThread: async () => undefined,
    getThreadList: async () => [],
    getThreadHistory: async () => [],
    createPoll: async () => undefined,
    editMessage: async () => ({ messageID: "mid.001", body: "edited" }),
    addUserToGroup: async () => undefined,
    removeUserFromGroup: async () => undefined,
    changeAdminStatus: async () => undefined,
    getUserInfo: async () => ({
      "123456": { name: "Test User", firstName: "Test", vanity: "testuser", thumbSrc: "", gender: 1 },
    }),
    searchUsers: async () => [] as Record<string, import("fca-unofficial").FriendInfo>[],
    createNewGroup: async () => ({ threadID: "t.001" }),
    ...overrides,
  };
}

function makeServices() {
  const gateway = new FacebookGatewayService();
  const mediaService = new MediaService(gateway);
  const messagingService = new MessagingService(gateway);
  const threadService = new ThreadService(mediaService);
  const authService = new AuthService({ readSession: async () => null, saveSession: async () => undefined } as unknown as ConstructorParameters<typeof AuthService>[0]);
  const e2eeService = new E2EEService();
  const icdcService = new ICDCService("test-agent");
  const eventBus = new EventEmitter();
  const controller = new ClientController(
    authService,
    gateway,
    messagingService,
    mediaService,
    threadService,
    e2eeService,
    icdcService,
    eventBus,
  );
  return { gateway, mediaService, messagingService, threadService, e2eeService, eventBus, controller };
}

// =============================================================================
// MediaService - attachment normalisation
// =============================================================================

describe("MediaService.normalizeAttachment", () => {
  const { mediaService } = makeServices();

  test("returns null for non-object", () => {
    expect(mediaService.normalizeAttachment(null)).toBeNull();
    expect(mediaService.normalizeAttachment("bad")).toBeNull();
    expect(mediaService.normalizeAttachment(42)).toBeNull();
  });

  test("returns null when type is missing", () => {
    expect(mediaService.normalizeAttachment({})).toBeNull();
  });

  test("maps image attachment", () => {
    const raw = {
      type: "photo",
      url: "https://cdn.fb.com/img.jpg",
      previewUrl: "https://cdn.fb.com/thumb.jpg",
      width: 1920,
      height: 1080,
      mimeType: "image/jpeg",
      fileSize: 204800,
    };
    const att = mediaService.normalizeAttachment(raw);
    expect(att).not.toBeNull();
    if (att?.type !== "photo") throw new Error("Expected photo attachment");
    expect(att.url).toBe("https://cdn.fb.com/img.jpg");
    expect(att.width).toBe(1920);
    expect(att.height).toBe(1080);
  });

  test("maps audio attachment with duration", () => {
    const raw = {
      type: "audio",
      url: "https://cdn.fb.com/audio.mp3",
      mimeType: "audio/mpeg",
      duration: 30,
      fileSize: 512000,
    };
    const att = mediaService.normalizeAttachment(raw);
    if (att?.type !== "audio") throw new Error("Expected audio attachment");
    expect(att.duration).toBe(30);
  });

  test("maps sticker attachment", () => {
    const raw = { type: "sticker", url: "https://cdn.fb.com/sticker.png", stickerID: 369239263222822 };
    const att = mediaService.normalizeAttachment(raw);
    expect(att!.type).toBe("sticker");
  });

  test("maps location attachment", () => {
    const raw = { type: "location", latitude: 10.123, longitude: 106.456 };
    const att = mediaService.normalizeAttachment(raw);
    if (att?.type !== "location") throw new Error("Expected location attachment");
    expect(att.latitude).toBe(10.123);
    expect(att.longitude).toBe(106.456);
  });
});

// =============================================================================
// MediaService - downloadMedia
// =============================================================================

describe("MediaService.downloadMedia", () => {
  const { mediaService } = makeServices();

  test("throws on unreachable URL without crashing process", async () => {
    // Point at localhost:1 - guaranteed to refuse connection quickly
    await expect(
      mediaService.downloadMedia({ url: "http://127.0.0.1:1/file.bin" }),
    ).rejects.toThrow();
  });
});

// =============================================================================
// MessagingService
// =============================================================================

describe("MessagingService.sendText", () => {
  const { messagingService } = makeServices();

  test("calls api.sendMessage and returns result", async () => {
    const api = makeFakeApi();
    const result = await messagingService.sendText(api, {
      threadId: "t.001",
      text: "Hello",
    });
    expect(result).toBeDefined();
  });

  test("passes replyToMessageId through", async () => {
    let capturedReply: string | undefined;
    const api = makeFakeApi({
      sendMessage: (async (_msg: unknown, _tid: string, _cb: unknown, replyTo?: string) => {
        capturedReply = replyTo;
        return { messageID: "mid.002" };
      }) as FCAApi["sendMessage"],
    });
    await messagingService.sendText(api, {
      threadId: "t.001",
      text: "Reply",
      replyToMessageId: "mid.000",
    });
    expect(capturedReply).toBe("mid.000");
  });
});

// =============================================================================
// ThreadService
// =============================================================================

describe("ThreadService.getThreadList", () => {
  const { threadService } = makeServices();

  test("returns empty array when fca returns empty", async () => {
    const api = makeFakeApi({ getThreadList: async () => [] });
    const result = await threadService.getThreadList(api, { limit: 10 });
    expect(result).toEqual([]);
  });

  test("throws when getThreadList not available", async () => {
    const api = makeFakeApi({ getThreadList: undefined });
    await expect(
      threadService.getThreadList(api, { limit: 10 }),
    ).rejects.toThrow("getThreadList not available");
  });
});

describe("ThreadService.createPoll", () => {
  test("calls createPoll on api", async () => {
    const { threadService } = makeServices();
    let called = false;
    const api = makeFakeApi({
      createPoll: async () => {
        called = true;
      },
    });
    await threadService.createPoll(api, {
      threadId: "t.001",
      title: "Favourite fruit?",
      options: { Apple: false, Mango: true },
    });
    expect(called).toBe(true);
  });

  test("throws when createPoll not available", async () => {
    const { threadService } = makeServices();
    const api = makeFakeApi({ createPoll: undefined });
    await expect(
      threadService.createPoll(api, { threadId: "t.001", title: "Poll" }),
    ).rejects.toThrow("createPoll not available");
  });
});

describe("ThreadService.editMessage", () => {
  test("returns edited message info", async () => {
    const { threadService } = makeServices();
    const api = makeFakeApi({
      editMessage: async () => ({ messageID: "mid.999", body: "new text" }),
    });
    const result = await threadService.editMessage(api, {
      messageId: "mid.999",
      newText: "new text",
    });
    expect(result.messageId).toBe("mid.999");
    expect(result.newText).toBe("new text");
  });
});

describe("ThreadService.forwardAttachment", () => {
  test("calls forwardAttachment on api", async () => {
    const { threadService } = makeServices();
    let capturedAttId: string | undefined;
    let capturedTargets: string[] | undefined;
    const api = makeFakeApi({
      forwardAttachment: async (attachmentID: string, targets: string | string[]) => {
        capturedAttId = attachmentID;
        capturedTargets = Array.isArray(targets) ? targets : [targets];
      },
    });
    await threadService.forwardAttachment(api, {
      attachmentId: "att.001",
      threadIds: ["t.001", "t.002"],
    });
    expect(capturedAttId).toBe("att.001");
    expect(capturedTargets).toEqual(["t.001", "t.002"]);
  });
});

// =============================================================================
// E2EEService - contract/stub
// =============================================================================

describe("E2EEService stubs", () => {
  test("isConnected starts false", () => {
    const svc = new E2EEService();
    expect(svc.isConnected).toBe(false);
  });

  test("markConnected/Disconnected toggles state", () => {
    const svc = new E2EEService();
    svc.markConnected();
    expect(svc.isConnected).toBe(true);
    svc.markDisconnected();
    expect(svc.isConnected).toBe(false);
  });

  test("sendImage throws", async () => {
    const svc = new E2EEService();
    await expect(
      svc.sendImage({ chatJid: "x@s.whatsapp.net", data: Buffer.alloc(1) }),
    ).rejects.toThrow("E2EE provider not connected");
  });

  test("downloadMedia throws", async () => {
    const svc = new E2EEService();
    await expect(
      svc.downloadMedia({
        directPath: "/path",
        mediaKey: "key",
        mediaSha256: "sha",
        mediaType: "image",
      }),
    ).rejects.toThrow("E2EE provider not connected");
  });
});

// =============================================================================
// ClientController - event mapping
// =============================================================================

describe("ClientController event mapping", () => {
  function collectEvents(controller: ClientController, eventBus: EventEmitter): MessengerEvent[] {
    const events: MessengerEvent[] = [];
    eventBus.on("event", (e: MessengerEvent) => events.push(e));

    // Expose internal emitMappedEvent via the test harness:
    // We invoke connect() with a mocked API that captures the listener callback,
    // then call it directly.
    return events;
  }

  // Helper to directly fire a raw event through the controller's private mapper.
  function fireRaw(controller: ClientController, raw: Record<string, unknown>): void {
    const testController = controller as unknown as {
      eventMapper: { emitMappedEvent(rawEvent: Record<string, unknown>): void };
    };
    testController.eventMapper.emitMappedEvent(raw);
  }

  test("maps standard message event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "message",
      messageID: "mid.1",
      threadID: "t.1",
      senderID: "u.1",
      body: "Hello world",
      timestamp: 1_700_000_000_000,
    });
    expect(events).toHaveLength(1);
    const evt = events[0]!;
    expect(evt.type).toBe("message");
    const msg = (evt as { type: "message"; data: MessengerMessage }).data;
    expect(msg.id).toBe("mid.1");
    expect(msg.text).toBe("Hello world");
    expect(msg.threadId).toBe("t.1");
    expect(msg.senderId).toBe("u.1");
  });

  test("maps reaction event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "message_reaction",
      messageID: "mid.2",
      threadID: "t.1",
      userID: "u.2",
      reaction: "❤️",
      timestamp: 1_700_000_001_000,
    });
    expect(events[0]!.type).toBe("reaction");
    const d = (events[0] as Extract<MessengerEvent, { type: "reaction" }>).data;
    expect(d.reaction).toBe("❤️");
    expect(d.actorId).toBe("u.2");
  });

  test("maps typing event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "typ",
      threadID: "t.1",
      from: "u.3",
      isTyping: true,
    });
    expect(events[0]!.type).toBe("typing");
    const d = (events[0] as Extract<MessengerEvent, { type: "typing" }>).data;
    expect(d.isTyping).toBe(true);
    expect(d.senderId).toBe("u.3");
  });

  test("maps unsend event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "message_unsend",
      messageID: "mid.3",
      threadID: "t.1",
      senderID: "u.1",
      timestamp: 1_700_000_002_000,
    });
    expect(events[0]!.type).toBe("message_unsend");
  });

  test("maps read_receipt event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "read_receipt",
      threadID: "t.1",
      reader: "u.4",
      time: 1_700_000_003_000,
    });
    expect(events[0]!.type).toBe("read_receipt");
    const d = (events[0] as Extract<MessengerEvent, { type: "read_receipt" }>).data;
    expect(d.readerId).toBe("u.4");
  });

  test("maps presence event", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "presence",
      userID: "u.5",
      userStatus: 1,
      timestamp: 1_700_000_004_000,
    });
    expect(events[0]!.type).toBe("presence");
    const d = (events[0] as Extract<MessengerEvent, { type: "presence" }>).data;
    expect(d.userId).toBe("u.5");
    expect(d.isOnline).toBe(true);
  });

  test("maps unknown event to raw", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, { type: "some_unknown_type", foo: "bar" });
    expect(events[0]!.type).toBe("raw");
  });

  test("maps message with attachments", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "message",
      messageID: "mid.10",
      threadID: "t.1",
      senderID: "u.1",
      body: "",
      timestamp: 1_700_000_005_000,
      attachments: [
        { type: "photo", url: "https://cdn.fb.com/img.jpg", width: 800, height: 600 },
      ],
    });
    const msg = (events[0] as Extract<MessengerEvent, { type: "message" }>).data;
    expect(msg.attachments).toHaveLength(1);
    expect(msg.attachments![0]!.type).toBe("photo");
  });

  test("maps message with replyTo", () => {
    const { controller, eventBus } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, {
      type: "message",
      messageID: "mid.11",
      threadID: "t.1",
      senderID: "u.1",
      body: "yes",
      timestamp: 1_700_000_006_000,
      messageReply: { messageID: "mid.old", senderID: "u.2", body: "original" },
    });
    const msg = (events[0] as Extract<MessengerEvent, { type: "message" }>).data;
    expect(msg.replyTo?.messageId).toBe("mid.old");
    expect(msg.replyTo?.senderId).toBe("u.2");
  });

  test("maps e2ee_connected event and marks e2ee service", () => {
    const { controller, eventBus, e2eeService } = makeServices();
    const events = collectEvents(controller, eventBus);
    fireRaw(controller, { type: "e2ee_connected" });
    expect(events[0]!.type).toBe("e2ee_connected");
    expect(e2eeService.isConnected).toBe(true);
  });
});

// =============================================================================
// ClientController - requireApi guard
// =============================================================================

describe("ClientController requireApi guard", () => {
  test("sendMessage throws when not connected", async () => {
    const { controller } = makeServices();
    await expect(
      controller.sendMessage({ threadId: "t.1", text: "hi" }),
    ).rejects.toThrow("Client is not connected");
  });

  test("muteThread throws when not connected", async () => {
    const { controller } = makeServices();
    await expect(
      controller.muteThread({ threadId: "t.1", muteSeconds: -1 }),
    ).rejects.toThrow("Client is not connected");
  });
});
