import type { ActionContext } from "../../core/action-context.ts";
import type { CreatePollInput } from "../../models/thread.ts";
export async function createPollAction(ctx: ActionContext, input: CreatePollInput): Promise<void> {
  await ctx.threadService.createPoll(ctx.requireApi(), input);
}
