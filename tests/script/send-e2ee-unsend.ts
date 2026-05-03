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
const DEFAULT_UNSEND_DELAY_MS = 2_000;

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

  const threadId = process.env.TEST_E2EE_UNSEND_THREAD_ID
    ?? process.env.TEST_E2EE_MEDIA_JID
    ?? DEFAULT_THREAD_ID;
  const delayMs = Number(process.env.TEST_E2EE_UNSEND_DELAY_MS ?? String(DEFAULT_UNSEND_DELAY_MS));
  const text = process.env.TEST_E2EE_UNSEND_TEXT
    ?? `unsend smoke ${new Date().toISOString()}`;

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-e2ee-unsend", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-e2ee-unsend", "Client error:", event.data.message);
    if (event.type === "e2ee_connected") console.log("send-e2ee-unsend", "E2EE connected.");
    if (event.type === "e2ee_message") console.log("send-e2ee-unsend", "e2ee_message:", event.data);
  });

  try {
    console.log("send-e2ee-unsend", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-e2ee-unsend", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-e2ee-unsend", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    console.log("send-e2ee-unsend", `Sending test message to ${threadId}: ${JSON.stringify(text)}`);
    const sendResult = await client.sendMessage({ threadId, text });
    const messageId = pickMessageId(sendResult);
    console.log("send-e2ee-unsend", `Sent messageId=${messageId}. Waiting ${delayMs}ms before unsend...`);

    await sleep(delayMs);
    await client.unsendMessage(messageId, threadId);
    console.log("send-e2ee-unsend", `Unsend completed for messageId=${messageId}`);

    await sleep(1_000);
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-e2ee-unsend", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-e2ee-unsend", "Fatal:", err);
  process.exit(1);
});
