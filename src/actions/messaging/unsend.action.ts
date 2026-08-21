import type { ActionContext } from "../../core/action-context.ts";
import type { UnsendMessageInput } from "../../models/messaging.ts";
import { sendE2EERevokeAction } from "./send-e2ee-revoke.action.ts";

export async function unsendMessageAction(ctx: ActionContext, input: UnsendMessageInput): Promise<void> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  
  let isE2EEConnected = true;
  try {
    ctx.requireE2EESocket();
  } catch {
    isE2EEConnected = false;
  }

  if (isE2EEConnected && isE2EE) {
    await sendE2EERevokeAction(ctx, input.threadId, input.messageId, input.fromMe ?? true);
    return;
  }
  await ctx.messagingService.unsend(ctx.requireApi(), input.messageId);
}
