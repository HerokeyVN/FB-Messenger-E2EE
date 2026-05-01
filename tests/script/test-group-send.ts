import { dirname, join } from "path";
import { existsSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import { FBClient } from "../../src/index.ts";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = join(SCRIPT_DIR, "..", "..");

const APPSTATE_PATH = join(ROOT_DIR, "tests/appstate.json");
const SESSION_PATH = join(ROOT_DIR, "tests/session.json");
const DEVICE_PATH = join(ROOT_DIR, "tests/device.json");
const ENV_PATH = join(ROOT_DIR, "tests/.env");

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

async function main() {
  loadEnvFile(ENV_PATH);

  if (!existsSync(APPSTATE_PATH)) {
    console.error("test-group-send", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  try {
    console.log("test-group-send", `Connecting to Messenger...`);
    const { userId } = await client.connect();
    console.log("test-group-send", `Connected as User ID: ${userId}`);

    const userDevicePath = join(ROOT_DIR, `device-${userId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    await client.connectE2EE(finalDevicePath, userId);
    console.log("test-group-send", `E2EE Stream active. Waiting for messages...`);

    const targetGroupJid = process.env.TEST_GROUP_JID ?? "1805602490133470@g.us";
    const text = process.env.TEST_MESSAGE_TEXT ?? "capture sample from whatsmeow";
    const echoPromise = new Promise<void>((resolve) => {
      client.onEvent("e2ee_message", (event) => {
        const threadId = (event as any).threadId ?? (event as any).threadID;
        const messageText = (event as any).text ?? (event as any).body;
        const senderId = (event as any).senderId ?? (event as any).senderID;

        if (threadId !== targetGroupJid) return;

        console.log(
          "test-group-send",
          `Received group message in ${threadId}: "${messageText}" from ${senderId}`,
        );

        if (messageText === text) {
          console.log("test-group-send", `✅ RECEIVED echo for our message: "${messageText}"`);
          resolve();
        }
      });
    });

    console.log("test-group-send", `Sending message to ${targetGroupJid}: "${text}"`);

    const sendResult = await client.sendMessage({
      threadId: targetGroupJid,
      text: text,
    });

    console.log("test-group-send", `Message send command completed: ${JSON.stringify(sendResult)}`);
  console.log("test-group-send", `Waiting for the echoed group message to arrive...`);

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error("Message echo not received within 15s")), 15000);
    });

    await Promise.race([echoPromise, timeoutPromise]);

    console.log("test-group-send", `SUCCESS: Message verified in group.`);
    await new Promise(r => setTimeout(r, 1000));
    await client.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("test-group-send", `Error:`, err);
    await client.disconnect().catch(() => { });
    process.exit(1);
  }
}

main().catch(console.error);
