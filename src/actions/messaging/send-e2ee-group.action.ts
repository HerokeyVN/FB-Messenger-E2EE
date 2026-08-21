import { randomUUID } from "node:crypto";
import type { ActionContext } from "../../core/action-context.ts";
import { encodeNode, marshal as marshalBinary } from "../../e2ee/transport/binary/wa-binary.ts";
import {
  buildParticipantListHash,
  sameMessengerDevice,
  sameMessengerUser,
  toBareMessengerJid,
  uniqueJids,
} from "../../e2ee/application/fanout-planner.ts";
import { now } from "../../utils/fca-utils.ts";
import { logger } from "../../utils/logger.ts";

export async function sendE2EEGroupTextAction(
  ctx: ActionContext,
  groupJid: string,
  text: string,
  replyToMessageId?: string,
  replyToSenderJid?: string,
): Promise<string> {
  const e2eeSocket = ctx.requireE2EESocket();
  const e2eeClient = ctx.e2eeService.getClient();
  const selfJid = ctx.getSelfE2EEJid();

  logger.debug("sendE2EEGroupTextAction", `Fetching participants for group: ${groupJid}`);
  const memberJids = await ctx.e2eeHandler.getGroupParticipants(groupJid);

  const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
  logger.debug("sendE2EEGroupTextAction", `Fetching devices for ${deviceUsers.length} members`);
  const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList(deviceUsers))
    .filter((jid) => !sameMessengerDevice(jid, selfJid));
  const messageId = String(BigInt(Math.floor(Math.random() * 1e15)));

  const result = await e2eeClient.encryptGroupText(
    groupJid,
    selfJid,
    text,
    messageId,
    replyToMessageId,
    replyToSenderJid,
  );

  const participantNodes: Buffer[] = [];
  for (const deviceJid of deviceJids) {
    try {
      if (!(await e2eeClient.hasSession(deviceJid))) {
        logger.info("sendE2EEGroupTextAction", `Establishing new session with ${deviceJid}`);
        const bundle = await ctx.e2eeHandler.getPreKeyBundle(deviceJid);
        await e2eeClient.establishSession(deviceJid, bundle);
      }

      const payload = sameMessengerUser(deviceJid, selfJid)
        ? result.selfDevicePayload
        : result.devicePayload;
      const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);

      participantNodes.push(encodeNode("to", { jid: deviceJid }, [
        encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext)
      ]));
    } catch (err) {
      logger.error("sendE2EEGroupTextAction", `Failed to distribute SKDM to ${deviceJid}:`, err);
    }
  }

  const phash = buildParticipantListHash(deviceJids);
  const participantsNode = encodeNode("participants", {}, participantNodes);
  const frankingNode = encodeNode("franking", {}, [
    encodeNode("franking_tag", {}, result.frankingTag),
  ]);
  const traceNode = encodeNode("trace", {}, [
    encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex")),
  ]);
  const skmsgNode = encodeNode("enc", { v: "3", type: "skmsg" }, result.groupCiphertext);

  const msgNode = encodeNode("message", { to: groupJid, type: "text", id: messageId, phash }, [
    participantsNode,
    frankingNode,
    traceNode,
    skmsgNode
  ]);

  await e2eeSocket.sendFrame(marshalBinary(msgNode));
  
  ctx.outgoingE2EECache.remember({
    kind: "group",
    chatJid: groupJid,
    messageId,
    messageType: "text",
    messageApp: result.messageApp,
    frankingTag: result.frankingTag,
    createdAtMs: now(),
  });
  
  logger.info("sendE2EEGroupTextAction", `E2EE Group message sent to ${groupJid} with ${participantNodes.length} devices`);
  return messageId;
}
