import type { UserInfo } from "../../models/domain.ts";
import type { ActionContext } from "../../core/action-context.ts";
import type { SearchUsersInput } from "../../models/messaging.ts";
export async function searchUsersAction(ctx: ActionContext, input: SearchUsersInput): Promise<UserInfo[]> {
  return ctx.mediaService.searchUsers(ctx.requireApi(), input);
}
