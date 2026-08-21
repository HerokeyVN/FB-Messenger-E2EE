import { jest } from "@jest/globals";
import type { ActionContext } from "../../../src/core/action-context.ts";
import { sendReactionAction } from "../../../src/actions/messaging/reaction.action.ts";
import type { SendReactionInput } from "../../../src/models/messaging.ts";

describe("sendReactionAction", () => {
  let mockContext: jest.Mocked<ActionContext>;

  beforeEach(() => {
    mockContext = {
      requireApi: jest.fn<any>().mockReturnValue({}),
      messagingService: {
        react: jest.fn<any>().mockResolvedValue(undefined),
      } as any,
    } as any;
  });

  it("should delegate to messagingService.react", async () => {
    const input: SendReactionInput = {
      threadId: "123",
      messageId: "msg-123",
      reaction: "👍",
    };

    await sendReactionAction(mockContext, input);

    expect(mockContext.requireApi).toHaveBeenCalled();
    expect(mockContext.messagingService.react).toHaveBeenCalledWith(mockContext.requireApi(), input);
  });
});
