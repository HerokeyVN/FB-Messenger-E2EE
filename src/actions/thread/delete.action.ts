import type { ActionContext } from "../../core/action-context.ts";
import type { DeleteThreadInput } from "../../models/messaging.ts";
export async function deleteThreadAction(ctx: ActionContext, input: DeleteThreadInput): Promise<void> {
  await ctx.mediaService.deleteThread(ctx.requireApi(), input);
}
