import { describe, it, expect, jest, afterEach } from "@jest/globals";
import * as http from "node:http";
import { MediaService } from "../../../src/services/media.service.ts";

describe("MediaService", () => {
  const gateway = {
    sendAttachmentMessage: jest.fn<(api: any, input: any) => Promise<Record<string, unknown>>>(),
    sendStickerMessage: jest.fn<(api: any, input: any) => Promise<Record<string, unknown>>>(),
  };
  const service = new MediaService(gateway as any);
  const api: any = {};

  afterEach(() => {
    jest.clearAllMocks();
  });

  it.each(["sendImage", "sendVideo", "sendAudio", "sendFile"] as const)(
    "%s delegates attachment send to the gateway",
    async (method) => {
      gateway.sendAttachmentMessage.mockResolvedValue({ messageID: "mid.1" });

      const result = await service[method](api, {
        threadId: "thread-1",
        data: Buffer.from("file"),
        fileName: "file.bin",
        caption: "caption",
        replyToMessageId: "reply-1",
      } as any);

      expect(result).toEqual({ messageID: "mid.1" });
      expect(gateway.sendAttachmentMessage).toHaveBeenCalledWith(api, {
        threadId: "thread-1",
        data: Buffer.from("file"),
        fileName: "file.bin",
        caption: "caption",
        replyToMessageId: "reply-1",
      });
    },
  );

  it("sendSticker delegates to the gateway", async () => {
    gateway.sendStickerMessage.mockResolvedValue({ messageID: "mid.sticker" });

    await expect(service.sendSticker(api, {
      threadId: "thread-1",
      stickerId: "123",
      replyToMessageId: "reply-1",
    } as any)).resolves.toEqual({ messageID: "mid.sticker" });

    expect(gateway.sendStickerMessage).toHaveBeenCalledWith(api, {
      threadId: "thread-1",
      stickerId: "123",
      replyToMessageId: "reply-1",
    });
  });

  it("normalizes supported attachment shapes", () => {
    expect(service.normalizeAttachment({
      type: "image",
      url: "https://cdn/image",
      filename: "a.png",
      mimeType: "image/png",
      fileSize: "10",
      mediaKey: "mk",
      mediaSha256: "sha",
      mediaEncSha256: "encsha",
      directPath: "/mms/a",
      width: "640",
      height: 480,
      thumbnailUrl: "https://cdn/thumb",
    })).toMatchObject({
      type: "image",
      url: "https://cdn/image",
      fileName: "a.png",
      mimeType: "image/png",
      fileSize: 10,
      mediaKey: "mk",
      mediaSha256: "sha",
      mediaEncSha256: "encsha",
      directPath: "/mms/a",
      width: 640,
      height: 480,
      previewUrl: "https://cdn/thumb",
    });

    expect(service.normalizeAttachment({ type: "video", durationMs: "42", width: 1, height: 2 })).toMatchObject({
      type: "video",
      duration: 42,
      width: 1,
      height: 2,
    });
    expect(service.normalizeAttachment({ type: "voice", duration: "7" })).toMatchObject({ type: "voice", duration: 7 });
    expect(service.normalizeAttachment({ type: "sticker", stickerID: "99" })).toMatchObject({ type: "sticker", stickerID: 99 });
    expect(service.normalizeAttachment({ type: "location", latitude: "10.5", longitude: "20.5" })).toMatchObject({
      type: "location",
      latitude: 10.5,
      longitude: 20.5,
    });
    expect(service.normalizeAttachment({ type: "link", description: "desc", source: "src", previewUrl: "p" })).toMatchObject({
      type: "link",
      description: "desc",
      sourceText: "src",
      previewUrl: "p",
    });
    expect(service.normalizeAttachment({ type: "unknown", name: "x.bin" })).toMatchObject({ type: "file", fileName: "x.bin" });
    expect(service.normalizeAttachment(null)).toBeNull();
    expect(service.normalizeAttachment({})).toBeNull();
  });

  it("downloads media bytes over HTTP", async () => {
    const server = http.createServer((_req, res) => res.end(Buffer.from("downloaded")));
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("missing test server address");

    try {
      await expect(service.downloadMedia({ url: `http://127.0.0.1:${address.port}/file` })).resolves.toEqual(Buffer.from("downloaded"));
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it("delegates thread management APIs and reports unavailable FCA methods", async () => {
    const fullApi: any = {
      muteThread: jest.fn(),
      setTitle: jest.fn(),
      changeGroupImage: jest.fn(),
      deleteThread: jest.fn(),
    };

    await service.muteThread(fullApi, { threadId: "t", muteSeconds: 60 });
    await service.renameThread(fullApi, { threadId: "t", newName: "new" });
    await service.setGroupPhoto(fullApi, { threadId: "t", data: Buffer.from("img"), mimeType: "image/png" });
    await service.deleteThread(fullApi, { threadId: "t" });

    expect(fullApi.muteThread).toHaveBeenCalledWith("t", 60);
    expect(fullApi.setTitle).toHaveBeenCalledWith("new", "t");
    expect(fullApi.changeGroupImage).toHaveBeenCalledWith(Buffer.from("img"), "t");
    expect(fullApi.deleteThread).toHaveBeenCalledWith("t");
    await expect(service.muteThread({} as any, { threadId: "t", muteSeconds: 1 })).rejects.toThrow("muteThread not available");
  });

  it("maps FCA search and user info responses", async () => {
    const searchApi: any = {
      searchUsers: jest.fn().mockReturnValue([{ "1": { name: "Alice", firstName: "A", vanity: "alice", thumbSrc: "pic", gender: 2 } }]),
      getUserInfo: jest.fn().mockReturnValue({ "1": { name: "Alice", firstName: "A", vanity: "alice", thumbSrc: "pic", gender: 2 } }),
    };

    await expect(service.searchUsers(searchApi, { query: "ali" })).resolves.toEqual([{
      id: "1",
      name: "Alice",
      firstName: "A",
      username: "alice",
      profilePictureUrl: "pic",
      gender: 2,
    }]);
    await expect(service.getUserInfo(searchApi, { userId: "1" })).resolves.toMatchObject({ id: "1", name: "Alice" });
    await expect(service.searchUsers({ searchUsers: jest.fn().mockReturnValue(null) } as any, { query: "x" })).resolves.toEqual([]);
    await expect(service.getUserInfo({ getUserInfo: jest.fn().mockReturnValue({}) } as any, { userId: "2" })).resolves.toBeNull();
  });

  it("creates a thread through FCA when available and falls back to the user ID", async () => {
    const createApi: any = { createNewGroup: jest.fn().mockReturnValue({ threadID: "thread-new" }) };

    await expect(service.createThread(createApi, { userId: "1001" })).resolves.toMatchObject({ id: "thread-new", type: 1 });
    expect(createApi.createNewGroup).toHaveBeenCalledWith(["1001"], "", undefined);
    await expect(service.createThread({} as any, { userId: "1001" })).resolves.toMatchObject({ id: "1001", type: 1 });
  });
});
