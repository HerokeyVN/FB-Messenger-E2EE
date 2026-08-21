import type { ActionContext } from "../../core/action-context.ts";
import type { RenameThreadInput } from "../../models/messaging.ts";
export async function renameThreadAction(ctx: ActionContext, input: RenameThreadInput): Promise<void> {
  await ctx.mediaService.renameThread(ctx.requireApi(), input);
}
