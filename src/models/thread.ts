import type { Thread } from "./domain.ts";

export interface GetThreadListInput {
  limit: number;
  /** Pass timestamp from last thread to paginate */
  beforeTimestamp?: number | null;
  /** Thread folder: "" | "INBOX" | "PENDING" | etc. */
  folder?: string;
}

export interface GetThreadHistoryInput {
  threadId: string;
  amount: number;
  /** Fetch messages before this timestamp for pagination */
  beforeTimestamp?: number;
}

export interface ForwardAttachmentInput {
  attachmentId: string;
  /** One or more thread IDs to forward to */
  threadIds: string[];
}

export interface CreatePollInput {
  threadId: string;
  title: string;
  /** Map of option text -> whether creator pre-votes for it */
  options?: Record<string, boolean>;
}

export interface EditMessageInput {
  messageId: string;
  newText: string;
}

export interface AddGroupMemberInput {
  threadId: string;
  /** User ID(s) to add */
  userIds: string[];
}

export interface RemoveGroupMemberInput {
  threadId: string;
  userId: string;
}

export interface ChangeAdminStatusInput {
  threadId: string;
  userId: string;
  isAdmin: boolean;
}

export interface ThreadDetails extends Omit<Thread, "snippet"> {
  unreadCount: number;
  messageCount: number;
  emoji: string | null;
  muteUntil: number | null;
  participantIds: string[];
  adminIds: string[];
  isArchived: boolean;
  folder: string;
  /** fca-unofficial can return null for snippet */
  snippet: string | null | undefined;
}

export interface EditMessageResult {
  messageId: string;
  newText: string;
}
