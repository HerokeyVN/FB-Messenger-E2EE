import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { FBClient } from "../../src/index.ts";

const APPSTATE_PATH = join(process.cwd(), "tests/appstate.json");
const SESSION_PATH = join(process.cwd(), "tests/session.json");
const DEVICE_PATH = join(process.cwd(), "tests/device.json");
const ENV_PATH = join(process.cwd(), "tests/.env");

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

    const userDevicePath = join(process.cwd(), `device-${userId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    await client.connectE2EE(finalDevicePath, userId);
    console.log("test-group-send", `E2EE Stream active.`);

    const targetGroupJid = "10004241511926.145@msgr";
    const replyToId = "7455166052391167893"; // Replying to the message in the user's prompt
    const text = "Test E2EE Group Message from Antigravity";

    console.log("test-group-send", `Sending message to ${targetGroupJid}...`);
    
    await client.sendMessage({
      threadId: targetGroupJid,
      text: text,
      replyToMessageId: replyToId
    });

    console.log("test-group-send", `Message sent successfully!`);
    
    // Wait a bit for server to process
    await new Promise(r => setTimeout(r, 2000));
    
    await client.disconnect();
    process.exit(0);

  } catch (err) {
    console.error("test-group-send", `Failed:`, err);
    await client.disconnect().catch(() => { });
    process.exit(1);
  }
}

main().catch(console.error);
