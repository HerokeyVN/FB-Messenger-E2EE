#!/bin/bash
mkdir -p src/actions/thread
mkdir -p src/actions/user
mkdir -p src/actions/messaging

# Thread Actions
cat << 'INNER_EOF' > src/actions/thread/mute.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { MuteThreadInput } from "../../models/messaging.ts";
export async function muteThreadAction(ctx: ActionContext, input: MuteThreadInput): Promise<void> {
  await ctx.mediaService.muteThread(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/rename.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { RenameThreadInput } from "../../models/messaging.ts";
export async function renameThreadAction(ctx: ActionContext, input: RenameThreadInput): Promise<void> {
  await ctx.mediaService.renameThread(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/set-group-photo.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { SetGroupPhotoInput } from "../../models/messaging.ts";
export async function setGroupPhotoAction(ctx: ActionContext, input: SetGroupPhotoInput): Promise<void> {
  await ctx.mediaService.setGroupPhoto(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/delete.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { DeleteThreadInput } from "../../models/messaging.ts";
export async function deleteThreadAction(ctx: ActionContext, input: DeleteThreadInput): Promise<void> {
  await ctx.mediaService.deleteThread(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/create.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { CreateThreadInput } from "../../models/messaging.ts";
export async function createThreadAction(ctx: ActionContext, input: CreateThreadInput): Promise<Record<string, unknown>> {
  return ctx.mediaService.createThread(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/get-list.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { GetThreadListInput } from "../../models/messaging.ts";
export async function getThreadListAction(ctx: ActionContext, input: GetThreadListInput): Promise<Record<string, unknown>[]> {
  return ctx.threadService.getThreadList(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/get-history.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { GetThreadHistoryInput } from "../../models/messaging.ts";
export async function getThreadHistoryAction(ctx: ActionContext, input: GetThreadHistoryInput): Promise<Record<string, unknown>[]> {
  return ctx.threadService.getThreadHistory(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/forward-attachment.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { ForwardAttachmentInput } from "../../models/messaging.ts";
export async function forwardAttachmentAction(ctx: ActionContext, input: ForwardAttachmentInput): Promise<void> {
  await ctx.threadService.forwardAttachment(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/create-poll.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { CreatePollInput } from "../../models/messaging.ts";
export async function createPollAction(ctx: ActionContext, input: CreatePollInput): Promise<void> {
  await ctx.threadService.createPoll(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/add-member.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { AddGroupMemberInput } from "../../models/messaging.ts";
export async function addGroupMemberAction(ctx: ActionContext, input: AddGroupMemberInput): Promise<void> {
  await ctx.threadService.addGroupMember(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/remove-member.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { RemoveGroupMemberInput } from "../../models/messaging.ts";
export async function removeGroupMemberAction(ctx: ActionContext, input: RemoveGroupMemberInput): Promise<void> {
  await ctx.threadService.removeGroupMember(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/thread/change-admin-status.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { ChangeAdminStatusInput } from "../../models/messaging.ts";
export async function changeAdminStatusAction(ctx: ActionContext, input: ChangeAdminStatusInput): Promise<void> {
  await ctx.threadService.changeAdminStatus(ctx.requireApi(), input);
}
INNER_EOF

# User Actions
cat << 'INNER_EOF' > src/actions/user/search.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { SearchUsersInput } from "../../models/messaging.ts";
export async function searchUsersAction(ctx: ActionContext, input: SearchUsersInput): Promise<Record<string, unknown>[]> {
  return ctx.mediaService.searchUsers(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/user/get-info.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { GetUserInfoInput } from "../../models/messaging.ts";
export async function getUserInfoAction(ctx: ActionContext, input: GetUserInfoInput): Promise<Record<string, unknown>> {
  return ctx.mediaService.getUserInfo(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/user/get-friends-list.action.ts
import type { ActionContext } from "../../core/action-context.ts";
export async function getFriendsListAction(ctx: ActionContext): Promise<Record<string, unknown>[]> {
  return ctx.threadService.getFriendsList(ctx.requireApi());
}
INNER_EOF

# Messaging Status Actions
cat << 'INNER_EOF' > src/actions/messaging/typing.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { TypingInput } from "../../models/messaging.ts";
export async function sendTypingAction(ctx: ActionContext, input: TypingInput): Promise<void> {
  await ctx.messagingService.sendTyping(ctx.requireApi(), input);
}
INNER_EOF

cat << 'INNER_EOF' > src/actions/messaging/mark-read.action.ts
import type { ActionContext } from "../../core/action-context.ts";
import type { MarkReadInput } from "../../models/messaging.ts";
export async function markAsReadAction(ctx: ActionContext, input: MarkReadInput): Promise<void> {
  await ctx.messagingService.markAsRead(ctx.requireApi(), input);
}
INNER_EOF

chmod +x generate_actions.sh
./generate_actions.sh
rm generate_actions.sh
