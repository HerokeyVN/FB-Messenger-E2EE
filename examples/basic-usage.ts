import { FBClient } from "../src/index.ts";
import { loadEnv } from "../src/config/env.ts";
import { logger } from "../src/utils/logger.ts";

async function bootstrap(): Promise<void> {
  const env = loadEnv();

  // You can pass appState directly as an array or string, 
  // or use appStatePath to let the client read it from a file.
  const client = new FBClient({
    appStatePath: env.appStatePath,
    sessionStorePath: env.sessionStorePath,
    platform: env.platform,
  });

  client.onEvent(event => {
    switch (event.type) {
      case "message":
        logger.info("example", `Message from ${event.data.senderId}: ${event.data.text}`);
        break;
      case "e2ee_message":
        logger.info("example", `[E2EE] Message from ${event.data.senderId}: ${event.data.text}`);
        break;
      case "error":
        logger.error("example", `Error: ${event.data.message}`);
        break;
      default:
        logger.debug("example", `Event: ${event.type}`, event.data);
    }
  });

  try {
    const { userId } = await client.connect();
    logger.info("example", `Successfully connected as ${userId}`);

    // Initiate E2EE connection
    const deviceStorePath = `device-${userId}.json`;
    await client.connectE2EE(deviceStorePath, userId);
    logger.info("example", "E2EE connection established.");

    // Example: Send a message after 5 seconds
    setTimeout(async () => {
      // await client.sendMessage({ threadId: "...", text: "Hello from E2EE!" });
    }, 5000);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("example", `Connection failed: ${message}`);
  }
}

void bootstrap();