import { randomUUID } from "node:crypto";
import type { ActionContext } from "../../core/action-context.ts";
import { encodeNode, marshal as marshalBinary } from "../../e2ee/transport/binary/wa-binary.ts";
import {
  buildParticipantListHash,
  normalizeDMThreadToJid,
  sameMessengerDevice,
  sameMessengerUser,
  toBareMessengerJid,
  uniqueJids,
} from "../../e2ee/application/fanout-planner.ts";
import { logger } from "../../utils/logger.ts";

export async function sendE2EERevokeAction(
  ctx: ActionContext,
  threadId: string,
  messageId: string,
  fromMe: boolean
): Promise<void> {
  const e2eeSocket = ctx.requireE2EESocket();
  const e2eeClient = ctx.e2eeService.getClient();
  const selfJid = ctx.getSelfE2EEJid();
  const isGroup = threadId.includes("@g.us") || threadId.includes(".g.");

  // Edit attribute "7" for sender revoke or "8" for admin revoke
  const editAttr = fromMe ? "7" : "8";

  const toJid = isGroup ? threadId : normalizeDMThreadToJid(threadId);
  const consumerApp = e2eeClient.buildRevokeMessage(messageId, { fromMe, remoteJid: toJid });
  const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
  const newMessageId = String(BigInt(Math.floor(Math.random() * 1e15)));

  if (isGroup) {
    const memberJids = await ctx.e2eeHandler.getGroupParticipants(threadId);
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList(deviceUsers))
      .filter((jid) => !sameMessengerDevice(jid, selfJid));

    const groupResult = await e2eeClient.encryptGroupMessageApplication(
      threadId, selfJid, messageApp, newMessageId,
    );

    const participantNodes: Buffer[] = [];
    for (const deviceJid of deviceJids) {
      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          const bundle = await ctx.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }
        const payload = sameMessengerUser(deviceJid, selfJid)
          ? groupResult.selfDevicePayload
          : groupResult.devicePayload;
        const skdmEnc = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: skdmEnc.type }, skdmEnc.ciphertext),
        ]));
      } catch (err) {
        logger.error("sendE2EERevokeAction", `Failed to distribute revoke SKDM to ${deviceJid}:`, err);
      }
    }

    const phash = buildParticipantListHash(deviceJids);
    const msgNode = encodeNode("message", { to: threadId, type: "text", id: newMessageId, phash, edit: editAttr }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
      encodeNode("enc", { v: "3", type: "skmsg", "decrypt-fail": "hide" }, groupResult.groupCiphertext),
    ]);
    await e2eeSocket.sendFrame(marshalBinary(msgNode));
    logger.info("sendE2EERevokeAction", `E2EE group revoke sent for message ${messageId} in ${threadId}`);
  } else {
    const devicePayload = e2eeClient.buildMessageTransport({ messageApp });
    const selfDevicePayload = e2eeClient.buildMessageTransport({
      messageApp,
      dsm: { destinationJid: toJid, phash: "" },
    });

    const participantNodes: Buffer[] = [];
    const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList([toJid, toBareMessengerJid(selfJid)]));

    for (const deviceJid of deviceJids) {
      if (sameMessengerDevice(deviceJid, selfJid)) continue;
      try {
        if (!(await e2eeClient.hasSession(deviceJid))) {
          const bundle = await ctx.e2eeHandler.getPreKeyBundle(deviceJid);
          await e2eeClient.establishSession(deviceJid, bundle);
        }
        const payload = sameMessengerUser(deviceJid, selfJid)
          ? selfDevicePayload
          : devicePayload;
        const encrypted = await e2eeClient.encryptDevicePayload(deviceJid, selfJid, payload);
        participantNodes.push(encodeNode("to", { jid: deviceJid }, [
          encodeNode("enc", { v: "3", type: encrypted.type, "decrypt-fail": "hide" }, encrypted.ciphertext),
        ]));
      } catch (err) {
        logger.error("sendE2EERevokeAction", `Failed to encrypt revoke to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "text", id: newMessageId, edit: editAttr }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
    ]);
    await e2eeSocket.sendFrame(marshalBinary(msgNode));
    logger.info("sendE2EERevokeAction", `E2EE DM revoke sent for message ${messageId} in ${threadId}`);
  }
}
