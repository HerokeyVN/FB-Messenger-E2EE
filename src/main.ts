import { FBClient } from "./core/client.ts";
import { loadEnv } from "./config/env.ts";

async function bootstrap(): Promise<void> {
	const env = loadEnv();

	const client = new FBClient({
		appStatePath: env.appStatePath,
		sessionStorePath: env.sessionStorePath,
		platform: env.platform,
	});

	client.onEvent(event => {
		if (event.type === "message") {
			console.log(`[message] ${event.data.senderId} -> ${event.data.threadId}: ${event.data.text}`);
			return;
		}
		if (event.type === "reaction") {
			console.log(`[reaction] ${event.data.actorId}: ${event.data.reaction}`);
			return;
		}
		if (event.type === "error") {
			console.error(`[error] ${event.data.message}`);
			return;
		}
		console.log(`[event:${event.type}]`, event.data);
	});

	const { userId } = await client.connect();
	console.log(`Connected as ${userId || "unknown-user"}`);

	// Automatically connect to E2EE
	if (userId) {
		console.log("[main] Connecting to E2EE...");
		const deviceStorePath = `device-${userId}.json`;
		await client.connectE2EE(deviceStorePath, userId);
		console.log("[main] E2EE connection sequence initiated.");
	}

}

void bootstrap().catch(error => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`Bootstrap failed: ${message}`);
	process.exitCode = 1;
});