import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { unsendMessageAction } from "../../../src/actions/messaging/unsend.action.ts";
import type { UnsendMessageInput } from "../../../src/models/messaging.ts";

// Since sendE2EERevokeAction is not implemented here yet, we will test the plaintext path and 
// mock the behavior.

describe("unsendMessageAction", () => {
  let mockContext: jest.Mocked<ActionContext>;

  beforeEach(() => {
    mockContext = {
      requireApi: jest.fn<any>().mockReturnValue({}),
      isE2EEThreadId: jest.fn(),
      requireE2EESocket: jest.fn(),
      messagingService: {
        unsend: jest.fn<any>().mockResolvedValue(undefined),
      } as any,
    } as any;
  });

  it("should delegate to messagingService.unsend for plaintext threads", async () => {
    mockContext.isE2EEThreadId.mockReturnValue(false);
    
    const input: UnsendMessageInput = {
      threadId: "123",
      messageId: "msg-123",
    };

    await unsendMessageAction(mockContext, input);

    expect(mockContext.requireApi).toHaveBeenCalled();
    expect(mockContext.messagingService.unsend).toHaveBeenCalledWith(mockContext.requireApi(), input.messageId);
  });
});
