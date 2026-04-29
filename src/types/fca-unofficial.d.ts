declare module "fca-unofficial" {
  export interface SendMessagePayload {
    body?: string;
    attachment?: unknown;
    url?: string;
    sticker?: number;
    mentions?: Array<{
      id: string;
      tag: string;
      fromIndex: number;
    }>;
  }

  export interface AppStateCookie {
    key: string;
    value: string;
    domain?: string;
    path?: string;
    expires?: number;
  }

  export interface LoginData {
    appState: AppStateCookie[];
  }

  export interface FriendInfo {
    name: string;
    firstName?: string;
    vanity?: string;
    thumbSrc?: string;
    profileUrl?: string;
    gender?: number;
    type?: string;
    isFriend?: boolean;
    isBirthDay?: boolean;
  }

  export interface ThreadParticipant {
    accountType: string;
    userID: string;
    name: string;
    url?: string;
    profilePicture?: string;
    username?: string | null;
    gender?: string;
    isViewerFriend?: boolean;
    isMessengerUser?: boolean;
    isVerified?: boolean;
  }

  export interface ThreadListItem {
    threadID: string;
    name: string | null;
    unreadCount: number;
    messageCount: number;
    imageSrc: string | null;
    emoji: string | null;
    color: string | null;
    nicknames: Array<{ userID: string; nickname: string }>;
    muteUntil: number | null;
    participants: ThreadParticipant[];
    participantIDs: string[];
    adminIDs: string[];
    folder: string;
    isGroup: boolean;
    isArchived: boolean;
    isSubscribed: boolean;
    timestamp: string;
    snippet: string | null;
    snippetSender: string | null;
    lastMessageTimestamp: string | null;
    lastReadTimestamp: string | null;
    approvalMode: boolean;
    threadType: 1 | 2;
  }

  export interface HistoryMessage {
    type: string;
    senderID: string;
    body: string;
    threadID: string;
    messageID: string;
    attachments: unknown[];
    mentions: Record<string, string>;
    timestamp: string;
    isGroup: boolean;
    isUnread?: boolean;
    messageReactions?: unknown[] | null;
  }

  export interface FCAApi {
    getCurrentUserID?(): string;
    getAppState?(): AppStateCookie[];
    setOptions?(options: Record<string, unknown>): void;
    listenMqtt(
      callback: (err: unknown, event?: Record<string, unknown>) => void,
    ): Promise<void> | void;
    sendMessage(
      message: string | SendMessagePayload,
      threadID: string,
      callback?: unknown,
      replyToMessage?: string,
    ): Promise<Record<string, unknown>> | void;
    setMessageReaction?(
      reaction: string,
      messageID: string,
      callback?: unknown,
      forceCustomReaction?: boolean,
    ): Promise<void> | void;
    unsendMessage?(messageID: string, callback?: unknown): Promise<void> | void;
    sendTypingIndicator?(
      isTyping: boolean,
      threadID: string,
      callback?: unknown,
    ): Promise<void> | void;
    markAsRead?(threadID: string, read?: boolean, callback?: unknown): Promise<void> | void;
    changeGroupImage?(image: unknown, threadID: string, callback?: unknown): Promise<void> | void;
    setTitle?(newTitle: string, threadID: string, callback?: unknown): Promise<void> | void;
    muteThread?(threadID: string, muteSeconds: number, callback?: unknown): Promise<void> | void;
    deleteThread?(threadOrThreads: string | string[], callback?: unknown): Promise<void> | void;
    stopListenMqtt?(): void;
    /** Download a media URL and return raw buffer */
    getAttachmentStream?(url: string, callback?: unknown): Promise<Buffer> | void;
    /** Search users by query */
    searchUsers?(
      name: string,
      callback?: (err: unknown, users?: Record<string, FriendInfo>[]) => void,
    ): Promise<Record<string, FriendInfo>[]> | void;
    /** Get user info for one or multiple IDs */
    getUserInfo?(
      ids: string | string[],
      callback?: (err: unknown, info?: Record<string, FriendInfo>) => void,
    ): Promise<Record<string, FriendInfo>> | void;
    /** Create a new thread with a user */
    createNewGroup?(
      userIDs: string[],
      groupTitle: string,
      callback?: unknown,
    ): Promise<Record<string, unknown>> | void;

    /** Get paginated thread list */
    getThreadList?(
      limit: number,
      timestamp: number | null,
      tags: string[],
      callback?: (err: unknown, threads?: ThreadListItem[]) => void,
    ): Promise<ThreadListItem[]> | void;

    /** Get message history for a thread */
    getThreadHistory?(
      threadID: string,
      amount: number,
      timestamp: number | undefined,
      callback?: (err: unknown, messages?: HistoryMessage[]) => void,
    ): Promise<HistoryMessage[]> | void;

    /** Forward a media attachment to one or more threads */
    forwardAttachment?(
      attachmentID: string,
      userOrUsers: string | string[],
      callback?: unknown,
    ): Promise<void> | void;

    /** Create a poll in a thread */
    createPoll?(
      title: string,
      threadID: string,
      options?: Record<string, boolean>,
      callback?: unknown,
    ): Promise<void> | void;

    /** Edit an already-sent message (requires MQTT) */
    editMessage?(
      text: string,
      messageID: string,
      callback?: unknown,
    ): Promise<Record<string, unknown>> | void;

    /** Add user(s) to a group thread */
    addUserToGroup?(
      userID: string | string[],
      threadID: string,
      callback?: unknown,
    ): Promise<void> | void;

    /** Remove a user from a group thread */
    removeUserFromGroup?(
      userID: string,
      threadID: string,
      callback?: unknown,
    ): Promise<void> | void;

    /** Change admin status of a user in a group */
    changeAdminStatus?(
      threadID: string,
      userID: string,
      adminStatus: boolean,
      callback?: unknown,
    ): Promise<void> | void;

    /** Get the logged-in user's friends list */
    getFriendsList?(
      callback?: (err: unknown, friends?: Record<string, FriendInfo>) => void,
    ): Promise<Record<string, FriendInfo>> | void;
  }

  export default function login(
    loginData: LoginData,
    options: Record<string, unknown>,
    callback: (err: unknown, api?: FCAApi) => void,
  ): void;
}
