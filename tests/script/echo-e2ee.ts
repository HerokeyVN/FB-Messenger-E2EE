import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { FBClient } from "../../src/index.ts";
import type { E2EEMessage, MessengerEvent } from "../../src/models/domain.ts";

const APPSTATE_PATH = join(process.cwd(), "tests/appstate.json");
const SESSION_PATH = join(process.cwd(), "tests/session.json");
const DEVICE_PATH = join(process.cwd(), "tests/device.json");
const ENV_PATH = join(process.cwd(), "tests/.env");
const DEFAULT_ECHO_CACHE_TTL_MS = 60_000;

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

function messageKey(msg: E2EEMessage): string {
  return msg.id || `${msg.chatJid}:${msg.senderJid}:${msg.timestampMs}:${msg.text}`;
}

function echoSignature(threadId: string, text: string): string {
  return `${threadId}\u0000${text}`;
}

function isTextEchoable(msg: E2EEMessage): boolean {
  return typeof msg.text === "string" && msg.text.trim().length > 0;
}

async function main() {
  loadEnvFile(ENV_PATH);

  if (!existsSync(APPSTATE_PATH)) {
    console.error("echo-e2ee", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  console.log("echo-e2ee", "Initializing FBClient...");
  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  let selfUserId = "";
  const seenMessageIds = new Set<string>();
  const ownEchoes = new Map<string, number>();
  const echoPrefix = process.env.ECHO_PREFIX ?? "";
  const echoCacheTtlMs = Number(process.env.ECHO_CACHE_TTL_MS ?? String(DEFAULT_ECHO_CACHE_TTL_MS));

  const pruneOwnEchoes = () => {
    const now = Date.now();
    for (const [key, expiresAt] of ownEchoes) {
      if (expiresAt <= now) ownEchoes.delete(key);
    }
  };

  client.onEvent(async (event: MessengerEvent) => {
    try {
      if (event.type === "e2ee_connected") {
        console.log("echo-e2ee", "E2EE connected. Echo is ready.");
        return;
      }

      if (event.type === "error") {
        console.error("echo-e2ee", "Client error:", event.data.message);
        return;
      }

      if (event.type !== "e2ee_message") return;

      pruneOwnEchoes();

      console.log(event);
      const msg = event.data;
      const key = messageKey(msg);
      if (seenMessageIds.has(key)) return;
      seenMessageIds.add(key);

      if (!isTextEchoable(msg)) {
        console.log("echo-e2ee", `Skip non-text/empty E2EE message ${msg.id || "<no-id>"}`);
        return;
      }

      const threadId = msg.chatJid || msg.threadId;
      if (!threadId) {
        console.warn("echo-e2ee", `Skip message ${msg.id || "<no-id>"}: missing thread id`);
        return;
      }

      const senderUserId = parseMessengerUserId(msg.senderId || msg.senderJid);
      const echoText = `${echoPrefix}${msg.text}`;
      const sig = echoSignature(threadId, msg.text);

      // If our own echo is delivered back to this client, consume it and stop.
      // This allows echoing messages sent from another device of the same account,
      // while avoiding infinite echo loops.
      if (senderUserId === selfUserId && ownEchoes.has(sig)) {
        ownEchoes.delete(sig);
        console.log("echo-e2ee", `Skip own echoed message in ${threadId}: "${msg.text}"`);
        return;
      }

      console.log("echo-e2ee", `Echo ${msg.id || "<no-id>"} from ${msg.senderJid} to ${threadId}: "${msg.text}"`);
      await client.sendMessage({ threadId, text: echoText });
      ownEchoes.set(echoSignature(threadId, echoText), Date.now() + echoCacheTtlMs);
    } catch (err) {
      console.error("echo-e2ee", "Echo failed:", err);
    }
  });

  try {
    console.log("echo-e2ee", "Connecting to Messenger...");
    const { userId } = await client.connect();
    selfUserId = parseMessengerUserId(userId);
    console.log("echo-e2ee", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(process.cwd(), `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("echo-e2ee", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);
    console.log("echo-e2ee", "E2EE stream active. Waiting for messages...");

    const exitAfterMs = Number(process.env.ECHO_EXIT_AFTER_MS ?? "0");
    if (exitAfterMs > 0) {
      setTimeout(() => {
        console.log("echo-e2ee", `Exit after ${exitAfterMs}ms`);
        process.exit(0);
      }, exitAfterMs);
    }

    const shutdown = async () => {
      console.log("\necho-e2ee", "Shutting down...");
      await client.disconnect().catch(() => {});
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (err) {
    console.error("echo-e2ee", "Startup failed:", err);
    await client.disconnect().catch(() => {});
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("echo-e2ee", "Fatal:", err);
  process.exit(1);
});
