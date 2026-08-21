import type { ActionContext } from "../../core/action-context.ts";
import type { SendReactionInput } from "../../models/messaging.ts";

export async function sendReactionAction(ctx: ActionContext, input: SendReactionInput): Promise<void> {
  await ctx.messagingService.react(ctx.requireApi(), input);
}
