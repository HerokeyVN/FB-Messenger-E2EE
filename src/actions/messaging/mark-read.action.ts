import type { ActionContext } from "../../core/action-context.ts";
import type { MarkReadInput } from "../../models/messaging.ts";
export async function markAsReadAction(ctx: ActionContext, input: MarkReadInput): Promise<void> {
  await ctx.messagingService.markAsRead(ctx.requireApi(), input);
}
