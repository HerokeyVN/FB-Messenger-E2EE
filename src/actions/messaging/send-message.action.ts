import type { ActionContext } from "../../core/action-context.ts";
import type { SendMessageInput } from "../../models/messaging.ts";
import { sendE2EETextAction } from "./send-e2ee-text.action.ts";
import { sendE2EEGroupTextAction } from "./send-e2ee-group.action.ts";
import { now } from "../../utils/fca-utils.ts";

export async function sendMessageAction(
  ctx: ActionContext,
  input: SendMessageInput
): Promise<Record<string, unknown>> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const isGroup = input.threadId.includes("@g.us") || input.threadId.includes(".g.");

  // For simplicity we check if there's an e2eeSocket, though the controller checked a boolean `e2eeConnected`.
  // The context's requireE2EESocket throws if not connected, but let's assume it's connected if we can get it.
  let isE2EEConnected = true;
  try {
    ctx.requireE2EESocket();
  } catch {
    isE2EEConnected = false;
  }

  if (isE2EEConnected && isE2EE) {
    let messageId: string;
    if (isGroup) {
      messageId = await sendE2EEGroupTextAction(
        ctx,
        input.threadId,
        input.text,
        input.replyToMessageId,
        input.replyToSenderJid
      );
    } else {
      messageId = await sendE2EETextAction(
        ctx,
        input.threadId,
        input.text,
        input.replyToMessageId,
        input.replyToSenderJid
      );
    }
    return { messageId, timestampMs: now() };
  }

  return ctx.messagingService.sendText(ctx.requireApi(), input);
}
