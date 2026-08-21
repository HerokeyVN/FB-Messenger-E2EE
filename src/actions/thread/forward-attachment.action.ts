import type { ActionContext } from "../../core/action-context.ts";
import type { ForwardAttachmentInput } from "../../models/thread.ts";
export async function forwardAttachmentAction(ctx: ActionContext, input: ForwardAttachmentInput): Promise<void> {
  await ctx.threadService.forwardAttachment(ctx.requireApi(), input);
}
