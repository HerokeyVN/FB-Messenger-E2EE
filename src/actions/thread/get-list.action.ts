import type { ThreadDetails } from "../../models/thread.ts";
import type { ActionContext } from "../../core/action-context.ts";
import type { GetThreadListInput } from "../../models/thread.ts";
export async function getThreadListAction(ctx: ActionContext, input: GetThreadListInput): Promise<ThreadDetails[]> {
  return ctx.threadService.getThreadList(ctx.requireApi(), input);
}
