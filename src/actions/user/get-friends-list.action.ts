import type { UserInfo } from "../../models/domain.ts";
import type { ActionContext } from "../../core/action-context.ts";
export async function getFriendsListAction(ctx: ActionContext): Promise<UserInfo[]> {
  return ctx.threadService.getFriendsList(ctx.requireApi());
}
