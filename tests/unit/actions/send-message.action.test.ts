import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { sendMessageAction } from "../../../src/actions/messaging/send-message.action.ts";
import type { SendMessageInput } from "../../../src/models/messaging.ts";

describe("sendMessageAction", () => {
  let mockContext: jest.Mocked<ActionContext>;

  beforeEach(() => {
    mockContext = {
      getUserId: jest.fn(),
      requireApi: jest.fn(),
      requireE2EESocket: jest.fn(),
      requireDeviceStore: jest.fn(),
      getSelfE2EEJid: jest.fn(),
      isE2EEThreadId: jest.fn(),
      getMediaUploadConfig: jest.fn(),
      refreshMediaUploadConfig: jest.fn(),
      e2eeService: {
        getClient: jest.fn(),
      } as any,
      mediaService: {} as any,
      messagingService: {
        sendText: jest.fn(),
      } as any,
      threadService: {} as any,
      gateway: {} as any,
      e2eeHandler: {} as any,
      eventMapper: {} as any,
      outgoingE2EECache: {} as any,
      eventBus: {} as any,
    };
  });

  it("should send plaintext message if thread is not E2EE", async () => {
    mockContext.isE2EEThreadId.mockReturnValue(false);
    mockContext.messagingService.sendText.mockResolvedValue({ messageId: "msg-123" });

    const input: SendMessageInput = { threadId: "123", text: "Hello" };
    const result = await sendMessageAction(mockContext, input);

    expect(mockContext.isE2EEThreadId).toHaveBeenCalledWith("123");
    expect(mockContext.messagingService.sendText).toHaveBeenCalledWith(mockContext.requireApi(), input);
    expect(result).toEqual({ messageId: "msg-123" });
  });

  // Since we haven't implemented E2EE dispatching fully via Actions in this test yet,
  // we will test the logic inside sendMessageAction which delegates to sendE2EETextAction 
  // or sendE2EEGroupTextAction. For now, we will mock these dependencies or have the action 
  // accept them, but since actions are standalone, it might call another action.
});
