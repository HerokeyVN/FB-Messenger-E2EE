import { randomUUID } from "node:crypto";
import type { ActionContext } from "../../core/action-context.ts";
import type { E2EEEditMessageInput } from "../../models/messaging.ts";
import { now } from "../../utils/fca-utils.ts";
import { normalizeDMThreadToJid, toBareMessengerJid, sameMessengerDevice, sameMessengerUser, uniqueJids } from "../../e2ee/application/fanout-planner.ts";
import { encodeNode, marshal as marshalBinary } from "../../e2ee/transport/binary/wa-binary.ts";
import { buildParticipantListHash } from "../../e2ee/application/fanout-planner.ts";
import { logger } from "../../utils/logger.ts";

export async function editMessageAction(
  ctx: ActionContext,
  input: E2EEEditMessageInput,
): Promise<void> {
  const isE2EE = ctx.isE2EEThreadId(input.threadId);
  const e2eeConnected = !!ctx.e2eeHandler && !!ctx.e2eeService.getClient();

  if (e2eeConnected && isE2EE) {
    await sendE2EEEdit(ctx, input.threadId, input.messageId, input.newText);
    return;
  }
  
  // Fallback: fca-unofficial plaintext edit (non-E2EE threads)
  await ctx.threadService.editMessage(ctx.requireApi(), {
    messageId: input.messageId,
    newText: input.newText,
  });
}

async function sendE2EEEdit(
  ctx: ActionContext,
  threadId: string,
  messageId: string,
  newText: string,
): Promise<void> {
  const e2eeSocket = ctx.requireE2EESocket();
  const e2eeClient = ctx.e2eeService.getClient();
  const selfJid = ctx.getSelfE2EEJid();
  const isGroup = threadId.includes("@g.us") || threadId.includes(".g.");

  // Edit attribute "1" for standard message edits
  const editAttr = "1";

  const toJid = isGroup ? threadId : normalizeDMThreadToJid(threadId);
  const consumerApp = e2eeClient.buildEditMessage(messageId, newText);
  const { messageApp, frankingTag } = e2eeClient.buildMessageApplication(consumerApp);
  const newMessageId = String(BigInt(Math.floor(Math.random() * 1e15)));

  if (isGroup) {
    const memberJids = await ctx.e2eeHandler.getGroupParticipants(threadId);
    const deviceUsers = uniqueJids([...memberJids, toBareMessengerJid(selfJid)]);
    const deviceJids = uniqueJids(await ctx.e2eeHandler.getDeviceList(deviceUsers))
      .filter((jid: string) => !sameMessengerDevice(jid, selfJid));

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
        logger.error("editMessageAction", `Failed to distribute edit SKDM to ${deviceJid}:`, err);
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
    logger.info("editMessageAction", `E2EE group edit sent for message ${messageId} in ${threadId}`);
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
        logger.error("editMessageAction", `Failed to encrypt edit to ${deviceJid}:`, err);
      }
    }

    const msgNode = encodeNode("message", { to: toJid, type: "text", id: newMessageId, edit: editAttr }, [
      encodeNode("participants", {}, participantNodes),
      encodeNode("franking", {}, [encodeNode("franking_tag", {}, frankingTag)]),
      encodeNode("trace", {}, [encodeNode("request_id", {}, Buffer.from(randomUUID().replace(/-/g, ""), "hex"))]),
    ]);
    await e2eeSocket.sendFrame(marshalBinary(msgNode));
    logger.info("editMessageAction", `E2EE DM edit sent for message ${messageId} to ${toJid}`);
  }
}
