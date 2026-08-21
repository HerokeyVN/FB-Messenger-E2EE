import type { ActionContext } from "../../core/action-context.ts";
import type { MuteThreadInput } from "../../models/messaging.ts";
export async function muteThreadAction(ctx: ActionContext, input: MuteThreadInput): Promise<void> {
  await ctx.mediaService.muteThread(ctx.requireApi(), input);
}
