import type { UserInfo } from "../../models/domain.ts";
import type { ActionContext } from "../../core/action-context.ts";
import type { GetUserInfoInput } from "../../models/messaging.ts";
export async function getUserInfoAction(ctx: ActionContext, input: GetUserInfoInput): Promise<UserInfo | null> {
  return ctx.mediaService.getUserInfo(ctx.requireApi(), input);
}
