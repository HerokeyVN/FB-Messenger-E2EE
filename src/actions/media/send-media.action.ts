import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import type { ActionContext } from "../../core/action-context.ts";
import type { SendMediaInput, SendMultipleMediaInput, SendStickerInput, DownloadMediaInput, SendAttachmentItem } from "../../models/messaging.ts";
import { now } from "../../utils/fca-utils.ts";
import { normalizeDMThreadToJid, toBareMessengerJid, sameMessengerDevice, sameMessengerUser, uniqueJids } from "../../e2ee/application/fanout-planner.ts";
import { encodeNode, marshal as marshalBinary } from "../../e2ee/transport/binary/wa-binary.ts";
import { logger } from "../../utils/logger.ts";
import type { MediaFields } from "../../models/e2ee.ts";

export type MediaTypeKey = "image" | "video" | "audio" | "document";

function inferMediaType(fileName: string, mimeType?: string): MediaTypeKey {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "bmp"].includes(ext)) return "image";
  if (["mp4", "mov", "avi", "mkv", "webm", "3gp", "m4v"].includes(ext)) return "video";
  if (["mp3", "ogg", "aac", "flac", "wav", "m4a", "opus"].includes(ext)) return "audio";
  return "document";
}

/**
 * Common E2EE media send for DM (fanout per-device encrypted message).
 * All E2EE media messages use type="text" because the server cannot see the actual content.
 */
async function sendE2EEMediaDM(
  ctx: ActionContext,
  input: SendMediaInput,
  mediaType: MediaTypeKey,
  buildMessage: (fields: Record<string, unknown>) => Buffer,
): Promise<Record<string, unknown>> {
  const e2eeSocket = ctx.requireE2EESocket();
  if (input.threadId.includes("@g.us") || input.threadId.includes(".g.")) {
    throw new Error(`E2EE group ${mediaType} send is not implemented yet`);
  }

  const e2eeClient = ctx.e2eeService.getClient();
  const selfJid = ctx.getSelfE2EEJid();
  const toJid = normalizeDMThreadToJid(input.threadId);
  const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));

  const uploadConfig = await ctx.getMediaUploadConfig();
  const defaultMime = mediaType === "image" ? "image/png" : mediaType === "video" ? "video/mp4" : mediaType === "audio" ? "audio/ogg" : "application/octet-stream";
  
  const media = await e2eeClient.encryptAndUploadMedia(
    uploadConfig,
    input.data,
    mediaType,
    input.mimeType || defaultMime,
    async () => {
      logger.info("sendMediaAction", `Media upload 401, refreshing media_conn config...`);
      return ctx.refreshMediaUploadConfig();
    },
  );

  const consumerApp = buildMessage(media.mediaFields);
  const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(
    consumerApp,
    input.replyToMessageId
      ? {
          messageId: input.replyToMessageId,
          chatJid: toJid,
          senderJid: input.replyToSenderJid ?? toJid,
        }
      : undefined,
  );

  const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
  const selfDevicePayload = e2eeClient.buildMessageTransport({
    messageApp,
    dsm: { destinationJid: toJid, phash: "" },
  });

  const participantNodes: Buffer[] = [];
  const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
  if (deviceJids.length === 0) {
    logger.warn("sendMediaAction", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
  }

  for (const deviceJid of deviceJids) {
    if (sameMessengerDevice(deviceJid, selfJid)) continue;

    try {
      if (!(await e2eeClient.hasSession(deviceJid))) {
        logger.info("sendMediaAction", `Establishing new session with ${deviceJid}`);
        const bundle = await ctx.e2eeHandler.getPreKeyBundle(deviceJid);
        await e2eeClient.establishSession(deviceJid, bundle);
      }

      const payload = sameMessengerUser(deviceJid, selfJid)
        ? selfDevicePayload
        : devicePayload;
      const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

      participantNodes.push(encodeNode("to", { jid: deviceJid }, [
        encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext),
      ]));
    } catch (err) {
      logger.error("sendMediaAction", `Failed to encrypt E2EE ${mediaType} fanout to ${deviceJid}:`, err);
    }
  }

  const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
    encodeNode("participants", {}, participantNodes),
    encodeNode("franking", {}, [
      encodeNode("franking_tag", {}, frankingTag),
    ]),
    encodeNode("trace", {}, [
      encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
    ]),
  ]);

  await e2eeSocket.sendFrame(marshalBinary(msgNode));
  ctx.outgoingE2EECache.remember({
    kind: "dm",
    chatJid: toJid,
    messageId,
    messageType: mediaType,
    messageApp,
    frankingTag,
    createdAtMs: now(),
  });
  logger.info("sendMediaAction", `E2EE ${mediaType} sent to ${toJid} with ${participantNodes.length} devices`);
  return { messageId, timestampMs: now(), directPath: media.directPath };
}

export async function sendImageAction(ctx: ActionContext, input: SendMediaInput): Promise<Record<string, unknown>> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    return sendE2EEMediaDM(ctx, input, "image", (fields) => ctx.e2eeService.getClient().buildImageMessage({ ...fields as unknown as MediaFields, caption: input.caption }));
  }
  return ctx.mediaService.sendImage(ctx.requireApi(), input);
}

export async function sendVideoAction(ctx: ActionContext, input: SendMediaInput): Promise<Record<string, unknown>> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    return sendE2EEMediaDM(ctx, input, "video", (fields) => ctx.e2eeService.getClient().buildVideoMessage({ ...fields as unknown as MediaFields, caption: input.caption }));
  }
  return ctx.mediaService.sendVideo(ctx.requireApi(), input);
}

export async function sendAudioAction(ctx: ActionContext, input: SendMediaInput): Promise<Record<string, unknown>> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    return sendE2EEMediaDM(ctx, input, "audio", (fields) => ctx.e2eeService.getClient().buildAudioMessage(fields as unknown as MediaFields));
  }
  return ctx.mediaService.sendAudio(ctx.requireApi(), input);
}

export async function sendFileAction(ctx: ActionContext, input: SendMediaInput): Promise<Record<string, unknown>> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    return sendE2EEMediaDM(ctx, input, "document", (fields) => ctx.e2eeService.getClient().buildDocumentMessage({ ...fields as unknown as MediaFields, fileName: input.fileName, caption: input.caption }));
  }
  return ctx.mediaService.sendFile(ctx.requireApi(), input);
}

export async function sendFilesAction(
  ctx: ActionContext,
  input: SendMultipleMediaInput,
): Promise<Record<string, unknown> | Record<string, unknown>[]> {
  if (input.attachments.length === 0) {
    throw new Error("sendFiles requires at least one attachment");
  }

  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    // E2EE: send each attachment as its own encrypted message
    const results: Record<string, unknown>[] = [];
    for (let i = 0; i < input.attachments.length; i++) {
      const att: SendAttachmentItem = input.attachments[i]!;
      const mediaInput: SendMediaInput = {
        threadId: input.threadId,
        data: att.data,
        fileName: att.fileName,
        mimeType: att.mimeType,
        // Caption on first attachment only
        caption: i === 0 ? input.caption : undefined,
        replyToMessageId: i === 0 ? input.replyToMessageId : undefined,
        width: att.width,
        height: att.height,
        seconds: att.seconds,
        ptt: att.ptt,
      };
      const mediaType = inferMediaType(att.fileName, att.mimeType);
      let result: Record<string, unknown>;
      switch (mediaType) {
        case "image":  result = await sendImageAction(ctx, mediaInput); break;
        case "video":  result = await sendVideoAction(ctx, mediaInput); break;
        case "audio":  result = await sendAudioAction(ctx, mediaInput); break;
        default:       result = await sendFileAction(ctx, mediaInput); break;
      }
      results.push(result);
    }
    return results;
  }

  // Non-E2EE: bundle all attachments into one FCA message
  return ctx.mediaService.sendFiles(ctx.requireApi(), {
    threadId: input.threadId,
    attachments: input.attachments.map((a: SendAttachmentItem) => ({ data: a.data, fileName: a.fileName })),
    caption: input.caption,
    replyToMessageId: input.replyToMessageId,
  });
}

export async function sendStickerAction(ctx: ActionContext, input: SendStickerInput): Promise<Record<string, unknown>> {
  return ctx.mediaService.sendSticker(ctx.requireApi(), input);
}

export async function downloadMediaAction(ctx: ActionContext, input: DownloadMediaInput): Promise<Buffer> {
  return ctx.mediaService.downloadMedia(input);
}
