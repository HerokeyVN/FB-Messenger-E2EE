import type { MessengerMessage } from "../../models/domain.ts";
import type { ActionContext } from "../../core/action-context.ts";
import type { GetThreadHistoryInput } from "../../models/thread.ts";
export async function getThreadHistoryAction(ctx: ActionContext, input: GetThreadHistoryInput): Promise<MessengerMessage[]> {
  return ctx.threadService.getThreadHistory(ctx.requireApi(), input);
}
