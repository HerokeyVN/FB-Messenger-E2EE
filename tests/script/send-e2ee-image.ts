import { basename, dirname, extname, isAbsolute, join } from "node:path";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
const DEFAULT_DATA_DIR = join(ROOT_DIR, "tests/data");
const DEFAULT_SEND_DELAY_MS = 2_000;

const MIME_BY_EXT: Record<string, string> = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg; codecs=opus",
  ".opus": "audio/ogg; codecs=opus",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".zip": "application/zip",
};

type SendKind = "image" | "video" | "audio" | "file";

interface TestMediaFile {
  path: string;
  name: string;
  mimeType: string;
  kind: SendKind;
}

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

function parseDelayMs(value: string | undefined): number {
  if (!value) return DEFAULT_SEND_DELAY_MS;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_SEND_DELAY_MS;
}

function resolvePath(pathOrRelative: string): string {
  return isAbsolute(pathOrRelative) ? pathOrRelative : join(ROOT_DIR, pathOrRelative);
}

function inferMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  return MIME_BY_EXT[ext] ?? "application/octet-stream";
}

function inferSendKind(mimeType: string): SendKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}

function toTestMediaFile(filePath: string, mimeOverride?: string): TestMediaFile {
  const mimeType = mimeOverride || inferMimeType(filePath);
  return {
    path: filePath,
    name: basename(filePath),
    mimeType,
    kind: inferSendKind(mimeType),
  };
}

function listDataFiles(dataDir: string): TestMediaFile[] {
  if (!existsSync(dataDir)) {
    throw new Error(`Missing data directory at ${dataDir}`);
  }

  return readdirSync(dataDir)
    .map((name) => join(dataDir, name))
    .filter((filePath) => statSync(filePath).isFile())
    .sort((a, b) => basename(a).localeCompare(basename(b)))
    .map((filePath) => toTestMediaFile(filePath));
}

function getFilesToSend(): TestMediaFile[] {
  const pathList = process.env.TEST_E2EE_MEDIA_PATHS
    ?.split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  if (pathList && pathList.length > 0) {
    return pathList.map((value) => toTestMediaFile(resolvePath(value)));
  }

  // Backward-compatible single-file mode for the old image-only script.
  if (process.env.TEST_E2EE_IMAGE_PATH) {
    return [toTestMediaFile(resolvePath(process.env.TEST_E2EE_IMAGE_PATH), process.env.TEST_E2EE_IMAGE_MIME)];
  }

  const dataDir = resolvePath(process.env.TEST_E2EE_MEDIA_DIR ?? DEFAULT_DATA_DIR);
  return listDataFiles(dataDir);
}

async function sendFileByKind(
  client: FBClient,
  targetJid: string,
  file: TestMediaFile,
  caption?: string,
): Promise<Record<string, unknown>> {
  const data = readFileSync(file.path);
  const common = {
    threadId: targetJid,
    data,
    fileName: file.name,
    mimeType: file.mimeType,
    caption,
  };

  switch (file.kind) {
    case "image":
      return client.sendImage(common);
    case "video":
      return client.sendVideo(common);
    case "audio":
      return client.sendAudio({ ...common, ptt: false });
    case "file":
      return client.sendFile(common);
  }
}

async function main() {
  loadEnvFile(ENV_PATH);

  const targetJid = process.env.TEST_E2EE_MEDIA_JID ?? process.env.TEST_E2EE_IMAGE_JID ?? DEFAULT_TARGET_JID;
  const caption = (process.env.TEST_E2EE_MEDIA_CAPTION ?? process.env.TEST_E2EE_IMAGE_CAPTION) || undefined;
  const delayMs = parseDelayMs(process.env.TEST_E2EE_MEDIA_DELAY_MS);
  const files = getFilesToSend();

  if (!existsSync(APPSTATE_PATH)) {
    console.error("send-e2ee-media", `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }
  for (const file of files) {
    if (!existsSync(file.path)) {
      console.error("send-e2ee-media", `Missing test data file at ${file.path}`);
      process.exit(1);
    }
  }
  if (files.length === 0) {
    console.error("send-e2ee-media", "No files found to send.");
    process.exit(1);
  }
  if (!process.env.FB_E2EE_MEDIA_UPLOAD_AUTH) {
    console.log(
      "send-e2ee-media",
      "FB_E2EE_MEDIA_UPLOAD_AUTH is not set; media upload auth will be requested from media_conn.",
    );
  }

  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent((event: MessengerEvent) => {
    if (event.type === "error") console.error("send-e2ee-media", "Client error:", event.data.message);
    if (event.type === "e2ee_connected") console.log("send-e2ee-media", "E2EE connected.");
  });

  try {
    console.log("send-e2ee-media", "Connecting to Messenger...");
    const { userId } = await client.connect();
    const selfUserId = parseMessengerUserId(userId);
    console.log("send-e2ee-media", `Connected as User ID: ${selfUserId}`);

    const userDevicePath = join(ROOT_DIR, `device-${selfUserId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log("send-e2ee-media", `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, selfUserId);

    console.log(
      "send-e2ee-media",
      `Sending ${files.length} file(s) to ${targetJid}; delay=${delayMs}ms: ${files.map((file) => file.name).join(", ")}`,
    );

    for (const [index, file] of files.entries()) {
      const size = statSync(file.path).size;
      console.log(
        "send-e2ee-media",
        `[${index + 1}/${files.length}] Sending ${file.name} (${file.kind}, ${file.mimeType}, ${size} bytes)...`,
      );

      const result = await sendFileByKind(client, targetJid, file, caption);
      console.log("send-e2ee-media", `[${index + 1}/${files.length}] Send completed: ${JSON.stringify(result)}`);

      if (index < files.length - 1 && delayMs > 0) {
        console.log("send-e2ee-media", `Waiting ${delayMs}ms before next file...`);
        await sleep(delayMs);
      }
    }

    await sleep(1_000);
    await client.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("send-e2ee-media", "Error:", err);
    await client.disconnect().catch(() => undefined);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("send-e2ee-media", "Fatal:", err);
  process.exit(1);
});
