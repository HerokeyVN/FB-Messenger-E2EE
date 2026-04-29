import * as https from "node:https";
import * as http from "node:http";
import { str, num } from "../utils/fca-utils.ts";


import type { FCAApi } from "fca-unofficial";

import type {
  Attachment,
  BaseAttachment,
  Thread,
  UserInfo,
} from "../models/domain.ts";
import type {
  CreateThreadInput,
  DeleteThreadInput,
  DownloadMediaInput,
  GetUserInfoInput,
  MarkReadInput,
  MuteThreadInput,
  RenameThreadInput,
  SearchUsersInput,
  SendMediaInput,
  SendStickerInput,
  SetGroupPhotoInput,
} from "../models/messaging.ts";
import type { MediaUploadResult } from "../models/media.ts";
import { FacebookGatewayService } from "./facebook-gateway.service.ts";

export class MediaService {
  public constructor(private readonly gateway: FacebookGatewayService) { }

  // Media send

  public async sendImage(
    api: FCAApi,
    input: SendMediaInput,
  ): Promise<Record<string, unknown>> {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
    });
  }

  public async sendVideo(
    api: FCAApi,
    input: SendMediaInput,
  ): Promise<Record<string, unknown>> {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
    });
  }

  public async sendAudio(
    api: FCAApi,
    input: SendMediaInput,
  ): Promise<Record<string, unknown>> {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
    });
  }

  public async sendFile(
    api: FCAApi,
    input: SendMediaInput,
  ): Promise<Record<string, unknown>> {
    return this.gateway.sendAttachmentMessage(api, {
      threadId: input.threadId,
      data: input.data,
      fileName: input.fileName,
      caption: input.caption,
      replyToMessageId: input.replyToMessageId,
    });
  }

  public async sendSticker(
    api: FCAApi,
    input: SendStickerInput,
  ): Promise<Record<string, unknown>> {
    return this.gateway.sendStickerMessage(api, {
      threadId: input.threadId,
      stickerId: input.stickerId,
      replyToMessageId: input.replyToMessageId,
    });
  }

  // Media download

  /**
   * Downloads raw bytes from a Facebook CDN URL.
   * Uses Node's built-in https/http since fca-unofficial does not expose a
   * dedicated download API at the JS level (unlike the Go messagix client).
   */
  public async downloadMedia(input: DownloadMediaInput): Promise<Buffer> {
    return downloadUrl(input.url);
  }

  // Attachment normalisation helper (used by client controller)

  public normalizeAttachment(item: unknown): Attachment | null {
    if (typeof item !== "object" || item === null) {
      return null;
    }
    const att = item as Record<string, unknown>;
    const type = typeof att.type === "string" ? att.type : "";
    if (!type) return null;

    const base: BaseAttachment = {
      url: str(att.url ?? att.previewUrl ?? att.largePreviewUrl),
      fileName: str(att.filename ?? att.name),
      mimeType: str(att.mimeType),
      fileSize: num(att.fileSize),
      mediaKey: str(att.mediaKey) || undefined,
      mediaSha256: str(att.mediaSha256) || undefined,
      mediaEncSha256: str(att.mediaEncSha256) || undefined,
      directPath: str(att.directPath) || undefined,
    };

    switch (type) {
      case "image":
      case "gif":
      case "photo":
        return {
          ...base,
          type,
          width: num(att.width),
          height: num(att.height),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl),
        };
      case "video":
        return {
          ...base,
          type,
          width: num(att.width),
          height: num(att.height),
          duration: num(att.duration ?? att.durationMs),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl),
        };
      case "audio":
      case "voice":
        return {
          ...base,
          type,
          duration: num(att.duration ?? att.durationMs),
        };
      case "sticker":
        return {
          ...base,
          type,
          stickerID: num(att.stickerID),
        };
      case "location":
        return {
          ...base,
          type,
          latitude: num(att.latitude),
          longitude: num(att.longitude),
        };
      case "link":
        return {
          ...base,
          type,
          description: str(att.description),
          sourceText: str(att.source),
          previewUrl: str(att.thumbnailUrl ?? att.previewUrl),
        };
      default:
        return {
          ...base,
          type: "file",
        };
    }
  }

  // Thread / group management (mirrors bridge-go media.go)

  public async muteThread(api: FCAApi, input: MuteThreadInput): Promise<void> {
    if (!api.muteThread) {
      throw new Error("muteThread not available in fca-unofficial");
    }
    await Promise.resolve(api.muteThread(input.threadId, input.muteSeconds));
  }

  public async renameThread(
    api: FCAApi,
    input: RenameThreadInput,
  ): Promise<void> {
    if (!api.setTitle) {
      throw new Error("setTitle not available in fca-unofficial");
    }
    await Promise.resolve(api.setTitle(input.newName, input.threadId));
  }

  public async setGroupPhoto(
    api: FCAApi,
    input: SetGroupPhotoInput,
  ): Promise<void> {
    if (!api.changeGroupImage) {
      throw new Error("changeGroupImage not available in fca-unofficial");
    }
    // fca-unofficial accepts a Readable stream or Buffer for the image
    await Promise.resolve(api.changeGroupImage(input.data, input.threadId));
  }

  public async deleteThread(
    api: FCAApi,
    input: DeleteThreadInput,
  ): Promise<void> {
    if (!api.deleteThread) {
      throw new Error("deleteThread not available in fca-unofficial");
    }
    await Promise.resolve(api.deleteThread(input.threadId));
  }

  // User / search (mirrors bridge-go media.go SearchUsers / GetUserInfo / CreateThread)

  public async searchUsers(
    api: FCAApi,
    input: SearchUsersInput,
  ): Promise<UserInfo[]> {
    if (!api.searchUsers) {
      throw new Error("searchUsers not available in fca-unofficial");
    }
    const raw = await Promise.resolve(api.searchUsers(input.query));
    if (!raw) return [];
    // fca-unofficial returns an array of {[id]: FriendInfo} objects
    const entries = Array.isArray(raw)
      ? (raw as Record<string, unknown>[]).flatMap(item => Object.entries(item))
      : Object.entries(raw as Record<string, unknown>);
    return entries.map(([id, infoRaw]) => {
      const info = infoRaw as { name?: string; firstName?: string; vanity?: string; thumbSrc?: string; gender?: number };
      return {
        id,
        name: info.name ?? "",
        firstName: info.firstName,
        username: info.vanity,
        profilePictureUrl: info.thumbSrc,
        gender: info.gender,
      };
    });
  }

  public async getUserInfo(
    api: FCAApi,
    input: GetUserInfoInput,
  ): Promise<UserInfo | null> {
    if (!api.getUserInfo) {
      throw new Error("getUserInfo not available in fca-unofficial");
    }
    const raw = await Promise.resolve(api.getUserInfo(input.userId));
    if (!raw) return null;
    const info = raw[input.userId];
    if (!info) return null;
    return {
      id: input.userId,
      name: info.name ?? "",
      firstName: info.firstName,
      username: info.vanity,
      profilePictureUrl: info.thumbSrc,
      gender: info.gender,
    };
  }

  public async createThread(
    api: FCAApi,
    input: CreateThreadInput,
  ): Promise<Thread> {
    // fca-unofficial createNewGroup with a single user creates a DM-like thread
    if (!api.createNewGroup) {
      // Fallback: treat the userId as the threadId (1:1 DM convention)
      return { id: input.userId, type: 1, name: "", lastActivityTimestampMs: Date.now() };
    }
    const result = await Promise.resolve(
      api.createNewGroup([input.userId], "", undefined),
    );
    const threadId = str((result as Record<string, unknown>)?.threadID ?? input.userId) || input.userId;
    return { id: threadId, type: 1, name: "", lastActivityTimestampMs: Date.now() };
  }
}

// Internal helpers

function downloadUrl(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, (res: any) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}
