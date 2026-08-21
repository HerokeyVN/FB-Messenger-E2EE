import type { ActionContext } from "../../core/action-context.ts";
import type { AddGroupMemberInput } from "../../models/thread.ts";
export async function addGroupMemberAction(ctx: ActionContext, input: AddGroupMemberInput): Promise<void> {
  await ctx.threadService.addGroupMember(ctx.requireApi(), input);
}
