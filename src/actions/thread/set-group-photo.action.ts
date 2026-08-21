import type { ActionContext } from "../../core/action-context.ts";
import type { SetGroupPhotoInput } from "../../models/messaging.ts";
export async function setGroupPhotoAction(ctx: ActionContext, input: SetGroupPhotoInput): Promise<void> {
  await ctx.mediaService.setGroupPhoto(ctx.requireApi(), input);
}
