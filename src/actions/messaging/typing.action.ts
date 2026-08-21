import type { ActionContext } from "../../core/action-context.ts";
import type { TypingInput } from "../../models/messaging.ts";
export async function sendTypingAction(ctx: ActionContext, input: TypingInput): Promise<void> {
  await ctx.messagingService.sendTyping(ctx.requireApi(), input);
}
