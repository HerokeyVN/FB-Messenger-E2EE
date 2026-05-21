import { dirname, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { FBClient } from "../../src/index.ts";
import type { MessengerEvent } from "../../src/models/domain.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SCRIPT_DIR, "..", "..");

const APPSTATE_PATH = join(ROOT_DIR, "tests/appstate.json");
const SESSION_PATH = join(ROOT_DIR, "tests/session.json");
const DEVICE_PATH = join(ROOT_DIR, "tests/device.json");
const ENV_PATH = join(ROOT_DIR, "tests/.env");

const DEFAULT_THREAD_ID = "100042415119261.0@msgr";
const DEFAULT_REPLY_DELAY_MS = 2_000;

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const raw = readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseMessengerUserId(value: string): string {
  const userPart = value.split("@")[0] ?? value;
  const dotIdx = userPart.indexOf(".");
  const colonIdx = userPart.indexOf(":");
  const cuts = [dotIdx, colonIdx].filter((idx) => idx >= 0).sort((a, b) => a - b);
  const end = cuts[0] ?? userPart.length;
  return userPart.slice(0, end) || value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickMessageId(result: Record<string, unknown>): string {
  const raw = result.messageId ?? result.messageID ?? result.message_id;
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (typeof raw === "number" || typeof raw === "bigint") return String(raw);
  throw new Error(`sendMessage did not return a message id: ${JSON.stringify(result)}`);
}

async function main() {
  loadEnvFile(ENV_PATH);

  const threadId = process.env.TEST_E2EE_REPLY_THREAD_ID ?? process.env.TEST_E2EE_MEDIA_JID ?? DEFAULT_THREAD_ID;
  const delayMs = Number(process.env.TEST_E2EE_REPLY_DELAY_MS ?? String(DEFAULT_REPLY_DELAY_MS));
  const originalText = process.env.TEST_E2EE_REPLY_ORIGINAL_TEXT ?? `original message ${new Date().toISOString()}`;
  const replyText = process.env.TEST_E2EE_REPLY_TEXT ?? `reply to original — ${new Date().toISOString()}`;

  /**
   * TEST_E2EE_REPLY_TO_ID: if set, skip sending the original message and reply
   * to an already-existing message ID. Useful for iterating on a known message.
   *
   * TEST_E2EE_REPLY_SENDER_JID: the JID of whoever sent the original message.
   * - For DM threads: defaults to the peer's bare JID (derived from threadId).
   * - For group threads: MUST be set explicitly to the correct member JID,
   *   otherwise the server cannot thread the reply in the group conversation.
   */
  const explicitReplyToId = process.env.TEST_E2EE_REPLY_TO_ID;
  const explicitSenderJid = process.env.TEST_E2EE_REPLY_SENDER_JID;

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-e2ee-reply", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-e2ee-reply", "Client error:", event.data.message);
    if (event.type === "e2ee_connected") console.log("send-e2ee-reply", "E2EE connected.");
    if (event.type === "e2ee_message") console.log("send-e2ee-reply", "Received e2ee_message:", JSON.stringify(event.data));
  });

  try {
    console.log("send-e2ee-reply", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-e2ee-reply", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-e2ee-reply", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    let replyToMessageId = explicitReplyToId;

    if (!replyToMessageId) {
      // ── Step 1: send original message ────────────────────────────────────────
      console.log("send-e2ee-reply", `[Step 1] Sending original message to ${threadId}: ${JSON.stringify(originalText)}`);
      const sendResult = await client.sendMessage({ threadId, text: originalText });
      replyToMessageId = pickMessageId(sendResult);
      console.log("send-e2ee-reply", `[Step 1] Original message sent — messageId=${replyToMessageId}`);
      console.log("send-e2ee-reply", `Waiting ${delayMs}ms before sending reply...`);
      await sleep(delayMs);
    } else {
      console.log("send-e2ee-reply", `[Step 1] Skipped — using existing message ID: ${replyToMessageId}`);
    }

    // ── Step 2: send reply ───────────────────────────────────────────────────
    console.log("send-e2ee-reply", `[Step 2] Sending reply to messageId=${replyToMessageId}...`);

    const isGroup = threadId.includes("@g.us") || threadId.includes(".g.");
    if (isGroup && !explicitSenderJid) {
      console.warn(
        "send-e2ee-reply",
        "WARNING: TEST_E2EE_REPLY_SENDER_JID is not set for a group thread. " +
          "The reply may not be threaded correctly. Set TEST_E2EE_REPLY_SENDER_JID to the " +
          "member JID who sent the original message.",
      );
    }

    const replyResult = await client.sendMessage({
      threadId,
      text: replyText,
      replyToMessageId,
      replyToSenderJid: explicitSenderJid,
      // For DM threads: replyToSenderJid defaults to the peer JID inside the controller
      // when not provided, which is correct for messages the peer sent to us.
    });
    const replyMessageId = pickMessageId(replyResult);

    console.log("send-e2ee-reply", `[Step 2] Reply sent — messageId=${replyMessageId}`);
    console.log("send-e2ee-reply", "Smoke test complete! Check the Messenger thread for the reply.");

    await sleep(1_000);
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-e2ee-reply", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-e2ee-reply", "Fatal:", err);
  process.exit(1);
});
