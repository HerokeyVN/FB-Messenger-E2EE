import type { FCAApi, HistoryMessage, ThreadListItem } from "fca-unofficial";

import type {
  Attachment,
  MessengerMessage,
  Thread,
  UserInfo,
} from "../models/domain.ts";
import type {
  AddGroupMemberInput,
  ChangeAdminStatusInput,
  CreatePollInput,
  EditMessageInput,
  EditMessageResult,
  ForwardAttachmentInput,
  GetThreadHistoryInput,
  GetThreadListInput,
  RemoveGroupMemberInput,
  ThreadDetails,
} from "../models/thread.ts";
import type { MediaService } from "./media.service.ts";


// ThreadService

export class ThreadService {
  public constructor(private readonly mediaService: MediaService) { }

  // Thread list

  public async getThreadList(
    api: FCAApi,
    input: GetThreadListInput,
  ): Promise<ThreadDetails[]> {
    if (!api.getThreadList) {
      throw new Error("getThreadList not available in fca-unofficial");
    }
    const tags = input.folder ? [input.folder] : [""];
    const raw = await Promise.resolve(
      api.getThreadList(input.limit, input.beforeTimestamp ?? null, tags),
    );
    if (!raw) return [];
    return (raw as ThreadListItem[]).map(t => this.mapThread(t));
  }

  // Thread history

  public async getThreadHistory(
    api: FCAApi,
    input: GetThreadHistoryInput,
  ): Promise<MessengerMessage[]> {
    if (!api.getThreadHistory) {
      throw new Error("getThreadHistory not available in fca-unofficial");
    }
    const raw = await Promise.resolve(
      api.getThreadHistory(
        input.threadId,
        input.amount,
        input.beforeTimestamp,
      ),
    );
    if (!raw) return [];
    return (raw as HistoryMessage[]).map(m => this.mapHistoryMessage(m));
  }

  // Forward attachment

  public async forwardAttachment(
    api: FCAApi,
    input: ForwardAttachmentInput,
  ): Promise<void> {
    if (!api.forwardAttachment) {
      throw new Error("forwardAttachment not available in fca-unofficial");
    }
    await Promise.resolve(
      api.forwardAttachment(input.attachmentId, input.threadIds),
    );
  }

  // Poll

  public async createPoll(api: FCAApi, input: CreatePollInput): Promise<void> {
    if (!api.createPoll) {
      throw new Error("createPoll not available in fca-unofficial");
    }
    await Promise.resolve(
      api.createPoll(input.title, input.threadId, input.options ?? {}),
    );
  }

  // Edit message (non-E2EE; uses MQTT internally)

  public async editMessage(
    api: FCAApi,
    input: EditMessageInput,
  ): Promise<EditMessageResult> {
    if (!api.editMessage) {
      throw new Error("editMessage not available in fca-unofficial");
    }
    const res = await Promise.resolve(
      api.editMessage(input.newText, input.messageId),
    );
    const r = (res ?? {}) as Record<string, unknown>;
    return {
      messageId: typeof r["messageID"] === "string" ? r["messageID"] : input.messageId,
      newText: typeof r["body"] === "string" ? r["body"] : input.newText,
    };
  }

  // Group member management

  public async addGroupMember(
    api: FCAApi,
    input: AddGroupMemberInput,
  ): Promise<void> {
    if (!api.addUserToGroup) {
      throw new Error("addUserToGroup not available in fca-unofficial");
    }
    const ids = input.userIds.length === 1 ? (input.userIds[0] ?? "") : input.userIds;
    await Promise.resolve(api.addUserToGroup(ids, input.threadId));
  }

  public async removeGroupMember(
    api: FCAApi,
    input: RemoveGroupMemberInput,
  ): Promise<void> {
    if (!api.removeUserFromGroup) {
      throw new Error("removeUserFromGroup not available in fca-unofficial");
    }
    await Promise.resolve(api.removeUserFromGroup(input.userId, input.threadId));
  }

  public async changeAdminStatus(
    api: FCAApi,
    input: ChangeAdminStatusInput,
  ): Promise<void> {
    if (!api.changeAdminStatus) {
      throw new Error("changeAdminStatus not available in fca-unofficial");
    }
    await Promise.resolve(
      api.changeAdminStatus(input.threadId, input.userId, input.isAdmin),
    );
  }

  // Friends list

  public async getFriendsList(api: FCAApi): Promise<UserInfo[]> {
    if (!api.getFriendsList) {
      throw new Error("getFriendsList not available in fca-unofficial");
    }
    const raw = await Promise.resolve(api.getFriendsList());
    if (!raw) return [];
    return Object.entries(raw).map(([id, info]) => ({
      id,
      name: info.name ?? "",
      firstName: info.firstName,
      username: info.vanity,
      profilePictureUrl: info.thumbSrc,
      gender: info.gender,
    }));
  }

  // Private helpers

  private mapThread(t: ThreadListItem): ThreadDetails {
    return {
      id: t.threadID,
      type: t.threadType,
      name: t.name ?? "",
      lastActivityTimestampMs: t.timestamp ? Number(t.timestamp) : 0,
      snippet: t.snippet,
      unreadCount: t.unreadCount,
      messageCount: t.messageCount,
      emoji: t.emoji,
      muteUntil: t.muteUntil,
      participantIds: t.participantIDs,
      adminIds: t.adminIDs,
      isArchived: t.isArchived,
      folder: t.folder,
    };
  }

  private mapHistoryMessage(m: HistoryMessage): MessengerMessage {
    const attachments = Array.isArray(m.attachments) && m.attachments.length > 0
      ? m.attachments
        .map(a => this.mediaService.normalizeAttachment(a))
        .filter((a): a is Attachment => a !== null)
      : undefined;

    return {
      id: m.messageID,
      threadId: m.threadID,
      senderId: m.senderID,
      text: m.body ?? "",
      timestampMs: m.timestamp ? Number(m.timestamp) : 0,
      attachments: attachments && attachments.length > 0 ? attachments : undefined,
    };
  }
}
