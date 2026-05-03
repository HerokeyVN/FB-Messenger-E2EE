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

// Defaults from the sample e2ee_message in the request.
const DEFAULT_THREAD_ID = "1805602490133470@g.us";
const DEFAULT_MESSAGE_ID = "7456658723671758234";
const DEFAULT_TARGET_SENDER_JID = "100042415119261.145@msgr";
const DEFAULT_REACTION = "👍";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
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

async function main() {
  loadEnvFile(ENV_PATH);

  const threadId = process.env.TEST_E2EE_REACTION_THREAD_ID ?? DEFAULT_THREAD_ID;
  const messageId = process.env.TEST_E2EE_REACTION_MESSAGE_ID ?? DEFAULT_MESSAGE_ID;
  const senderJid = process.env.TEST_E2EE_REACTION_SENDER_JID ?? DEFAULT_TARGET_SENDER_JID;
  const reaction = process.env.TEST_E2EE_REACTION_EMOJI ?? DEFAULT_REACTION;

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-e2ee-reaction", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-e2ee-reaction", "Client error:", event.data.message);
    if (event.type === "e2ee_connected") console.log("send-e2ee-reaction", "E2EE connected.");
  });

  try {
    console.log("send-e2ee-reaction", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-e2ee-reaction", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-e2ee-reaction", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    console.log(
      "send-e2ee-reaction",
      `Reacting to message=${messageId} in ${threadId}, targetSender=${senderJid}, emoji=${reaction}`,
    );

    await client.sendReaction({
      threadId,
      messageId,
      senderJid,
      reaction,
    });

    console.log("send-e2ee-reaction", "Reaction send completed.");
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-e2ee-reaction", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-e2ee-reaction", "Fatal:", err);
  process.exit(1);
});
