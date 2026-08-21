import { randomUUID } from "node:crypto";
import type { ActionContext } from "../../core/action-context.ts";
import { encodeNode, marshal as marshalBinary } from "../../e2ee/transport/binary/wa-binary.ts";
import {
  normalizeDMThreadToJid,
  sameMessengerDevice,
  sameMessengerUser,
  toBareMessengerJid,
  uniqueJids,
} from "../../e2ee/application/fanout-planner.ts";
import { now } from "../../utils/fca-utils.ts";
import { logger } from "../../utils/logger.ts";

export async function sendE2EETextAction(
  ctx: ActionContext,
  threadId: string,
  text: string,
  replyToMessageId?: string,
  replyToSenderJid?: string,
): Promise<string> {
  const e2eeSocket = ctx.requireE2EESocket();
  const e2eeClient = ctx.e2eeService.getClient();
  const selfJid = ctx.getSelfE2EEJid();
  const toJid = normalizeDMThreadToJid(threadId);
  const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));

  const result = await e2eeClient.buildDMTextFanoutPayloads({
    toJid,
    selfJid,
    text,
    isGroup: false,
    replyToId: replyToMessageId,
    // For DM: participant = sender of original msg. If caller knows who sent it, use that;
    // otherwise fall back to the peer's JID (correct for messages they sent to us).
    replyToSenderJid: replyToMessageId ? (replyToSenderJid ?? toJid) : undefined,
  });

  const participantNodes: Buffer[] = [];
  const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));
  
  if (deviceJids.length === 0) {
    logger.warn("sendE2EETextAction", `No E2EE devices discovered for ${toJid}; sending empty participant list`);
  }

  for (const deviceJid of deviceJids) {
    if (sameMessengerDevice(deviceJid, selfJid)) continue;

    try {
      if (!(await e2eeClient.hasSession(deviceJid))) {
        logger.info("sendE2EETextAction", `Establishing new session with ${deviceJid}`);
        const bundle = await ctx.e2eeHandler.getPreKeyBundle(deviceJid);
        await e2eeClient.establishSession(deviceJid, bundle);
      }

      const payload = sameMessengerUser(deviceJid, selfJid)
        ? result.selfDevicePayload
        : result.devicePayload;
      const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

      participantNodes.push(encodeNode("to", { jid: deviceJid }, [
        encodeNode("enc", { v: "3", type: encrypted.type }, encrypted.ciphertext),
      ]));
    } catch (err) {
      logger.error("sendE2EETextAction", `Failed to encrypt DM fanout to ${deviceJid}:`, err);
    }
  }

  const msgNode = encodeNode("message", { to: toJid, type: "text", id: messageId }, [
    encodeNode("participants", {}, participantNodes),
    encodeNode("franking", {}, [
      encodeNode("franking_tag", {}, result.frankingTag),
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
    messageType: "text",
    messageApp: result.messageApp,
    frankingTag: result.frankingTag,
    createdAtMs: now(),
  });
  
  logger.info("sendE2EETextAction", `E2EE DM message sent to ${toJid} with ${participantNodes.length} devices`);
  return messageId;
}
