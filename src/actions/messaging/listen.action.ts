import type { ActionContext } from "../../core/action-context.ts";
import type { MessengerEvent } from "../../models/domain.ts";

export async function listenAction(ctx: ActionContext): Promise<void> {
  const api = ctx.requireApi();
  await ctx.gateway.startListening(
    api,
    (event) => ctx.eventMapper.emitMappedEvent(event),
    (error) =>
      ctx.eventBus.emit("event", {
        type: "error",
        data: { message: error.message },
      } satisfies MessengerEvent),
  );
}
