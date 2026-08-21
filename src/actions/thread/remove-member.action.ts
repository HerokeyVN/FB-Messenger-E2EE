import type { ActionContext } from "../../core/action-context.ts";
import type { RemoveGroupMemberInput } from "../../models/thread.ts";
export async function removeGroupMemberAction(ctx: ActionContext, input: RemoveGroupMemberInput): Promise<void> {
  await ctx.threadService.removeGroupMember(ctx.requireApi(), input);
}
