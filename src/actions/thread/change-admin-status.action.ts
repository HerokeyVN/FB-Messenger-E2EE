import type { ActionContext } from "../../core/action-context.ts";
import type { ChangeAdminStatusInput } from "../../models/thread.ts";
export async function changeAdminStatusAction(ctx: ActionContext, input: ChangeAdminStatusInput): Promise<void> {
  await ctx.threadService.changeAdminStatus(ctx.requireApi(), input);
}
