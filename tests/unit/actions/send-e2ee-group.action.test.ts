import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { sendE2EEGroupTextAction } from "../../../src/actions/messaging/send-e2ee-group.action.ts";
import type { FacebookE2EESocket } from "../../../src/e2ee/transport/noise/noise-socket.ts";

describe("sendE2EEGroupTextAction", () => {
  let mockContext: jest.Mocked<ActionContext>;
  let mockE2EEClient: any;
  let mockE2EEHandler: any;
  let mockSocket: jest.Mocked<FacebookE2EESocket>;
  let mockCache: any;

  beforeEach(() => {
    mockE2EEClient = {
      encryptGroupText: jest.fn<any>().mockResolvedValue({
        messageApp: Buffer.from("app"),
        frankingTag: Buffer.from("tag"),
        devicePayload: Buffer.from("dev"),
        selfDevicePayload: Buffer.from("selfDev"),
        groupCiphertext: Buffer.from("skmsg"),
      }),
      hasSession: jest.fn<any>().mockResolvedValue(true),
      encryptDevicePayload: jest.fn<any>().mockResolvedValue({
        type: "msg",
        ciphertext: Buffer.from("cipher"),
      }),
    };

    mockE2EEHandler = {
      getGroupParticipants: jest.fn<any>().mockResolvedValue(["peer.1@msgr", "peer.2@msgr"]),
      getDeviceList: jest.fn<any>().mockResolvedValue(["peer.1@msgr", "peer.2@msgr", "self.1@msgr"]),
      getPreKeyBundle: jest.fn(),
    };

    mockSocket = {
      sendFrame: jest.fn<any>().mockResolvedValue(undefined),
    } as any;

    mockCache = {
      remember: jest.fn(),
    };

    mockContext = {
      getSelfE2EEJid: jest.fn<any>().mockReturnValue("self.0@msgr"),
      requireE2EESocket: jest.fn<any>().mockReturnValue(mockSocket),
      e2eeService: {
        getClient: jest.fn<any>().mockReturnValue(mockE2EEClient),
      } as any,
      e2eeHandler: mockE2EEHandler,
      outgoingE2EECache: mockCache,
    } as any;
  });

  it("should encrypt and fanout message for Group", async () => {
    const threadId = "12345@g.us";
    const text = "Hello Group";

    const msgId = await sendE2EEGroupTextAction(mockContext, threadId, text);

    expect(mockContext.getSelfE2EEJid).toHaveBeenCalled();
    expect(mockE2EEHandler.getGroupParticipants).toHaveBeenCalledWith(threadId);
    expect(mockE2EEClient.encryptGroupText).toHaveBeenCalledWith(
      threadId,
      "self.0@msgr",
      text,
      expect.any(String),
      undefined,
      undefined
    );
    expect(mockSocket.sendFrame).toHaveBeenCalled();
    expect(mockCache.remember).toHaveBeenCalled();
    
    // UUID should be string length > 0
    expect(typeof msgId).toBe("string");
    expect(msgId.length).toBeGreaterThan(5);
  });
});
