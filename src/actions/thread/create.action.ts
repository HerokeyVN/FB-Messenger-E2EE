import type { Thread } from "../../models/domain.ts";
import type { ActionContext } from "../../core/action-context.ts";
import type { CreateThreadInput } from "../../models/messaging.ts";
export async function createThreadAction(ctx: ActionContext, input: CreateThreadInput): Promise<Thread> {
  return ctx.mediaService.createThread(ctx.requireApi(), input);
}
