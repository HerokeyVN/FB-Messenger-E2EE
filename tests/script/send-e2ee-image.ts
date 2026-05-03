import { dirname, join, basename } from "node:path";
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

const DEFAULT_TARGET_JID = "100042415119261.0@msgr";
const DEFAULT_IMAGE_PATH = join(ROOT_DIR, "tests/data/1x1.png");

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

  const targetJid = process.env.TEST_E2EE_IMAGE_JID ?? DEFAULT_TARGET_JID;
  const imagePath = process.env.TEST_E2EE_IMAGE_PATH ?? DEFAULT_IMAGE_PATH;
  const caption = process.env.TEST_E2EE_IMAGE_CAPTION || undefined;
  const mimeType = process.env.TEST_E2EE_IMAGE_MIME ?? "image/png";

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-e2ee-image", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }
  if (!existsSync(imagePath)) {
    console.error("send-e2ee-image", `Missing image file at ${imagePath}`);
    process.exit(1);
  }
  if (!process.env.FB_E2EE_MEDIA_UPLOAD_AUTH) {
    console.log(
      "send-e2ee-image",
      "FB_E2EE_MEDIA_UPLOAD_AUTH is not set; media upload auth will be requested from media_conn.",
    );
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-e2ee-image", "Client error:", event.data.message);
    if (event.type === "e2ee_connected") console.log("send-e2ee-image", "E2EE connected.");
  });

  try {
    console.log("send-e2ee-image", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-e2ee-image", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-e2ee-image", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    const data = readFileSync(imagePath);
    console.log("send-e2ee-image", `Sending ${basename(imagePath)} (${data.length} bytes) to ${targetJid}...`);

    const result = await client.sendImage({
      threadId: targetJid,
      data,
      fileName: basename(imagePath),
      mimeType,
      caption,
    });

    console.log("send-e2ee-image", `Send completed: ${JSON.stringify(result)}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-e2ee-image", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-e2ee-image", "Fatal:", err);
  process.exit(1);
});
