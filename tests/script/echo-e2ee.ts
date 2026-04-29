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
    console.error(`echo-e2ee`, `Missing appstate file at ${APPSTATE_PATH}`);
    process.exit(1);
  }

  console.log("[echo-e2ee`, `Initializing FBClient...");
  const client = new FBClient({
    appStatePath: APPSTATE_PATH,
    sessionStorePath: SESSION_PATH,
  });

  client.onEvent(async (event) => {
    // Log all events for debugging
    // console.log(`echo-e2ee`, `Event ${event.type.replace(/_/g, " ")}:`, JSON.stringify(event.data, null, 2));

    // Auto-echo for messages
    if (event.type === "e2ee_message") {
      const msg = event.data;

      console.log(`echo-e2ee`, `Echoing message to ${msg.threadId}: "${msg.text}"`);
    }
  });

  try {
    console.log(`echo-e2ee`, `Connecting to Messenger...`);
    const { userId } = await client.connect();
    console.log(`echo-e2ee`, `Connected as User ID: ${userId}`);

    const userDevicePath = join(process.cwd(), `device-${userId}.json`);
    const finalDevicePath = existsSync(userDevicePath) ? userDevicePath : DEVICE_PATH;

    console.log(`echo-e2ee`, `Connecting E2EE stream using: ${finalDevicePath}`);
    await client.connectE2EE(finalDevicePath, userId);
    console.log(`echo-e2ee`, `E2EE Stream active. Waiting for messages...`);
    setTimeout(() => {
      process.exit(0);
    }, 30000)

    // Keep process alive
    process.on("SIGINT", async () => {
      console.log("\n[echo-e2ee`, `Shutting down...");
      await client.disconnect();
      process.exit(0);
    });

  } catch (err) {
    console.error("[echo-e2ee`, `Startup failed:", err);
    await client.disconnect().catch(() => { });
    process.exit(1);
  }
}

main().catch(console.error);
