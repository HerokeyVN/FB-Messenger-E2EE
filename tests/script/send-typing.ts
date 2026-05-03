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
const DEFAULT_TYPING_DURATION_MS = 5_000;

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

async function main() {
  loadEnvFile(ENV_PATH);

  const threadId = process.env.TEST_TYPING_THREAD_ID
    ?? process.env.TEST_E2EE_UNSEND_THREAD_ID
    ?? process.env.TEST_E2EE_MEDIA_JID
    ?? DEFAULT_THREAD_ID;
  const durationMs = Number(process.env.TEST_TYPING_DURATION_MS ?? String(DEFAULT_TYPING_DURATION_MS));

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-typing", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-typing", "Client error:", event.data.message);
    if (event.type === "ready") console.log("send-typing", "Client ready.");
  });

  try {
    console.log("send-typing", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-typing", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-typing", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    console.log("send-typing", `sendTyping true to ${threadId}`);
    await client.sendTyping({ threadId, isTyping: true });

    console.log("send-typing", `Waiting ${durationMs}ms...`);
    await sleep(durationMs);

    console.log("send-typing", `sendTyping false to ${threadId}`);
    await client.sendTyping({ threadId, isTyping: false });

    console.log("send-typing", "Typing test completed.");
    await sleep(500);
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-typing", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-typing", "Fatal:", err);
  process.exit(1);
});
