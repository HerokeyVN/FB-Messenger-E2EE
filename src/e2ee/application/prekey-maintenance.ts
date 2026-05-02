import { now } from "../../utils/fca-utils.ts";
import { logger } from "../../utils/logger.ts";
import { MIN_PREKEY_COUNT, WANTED_PREKEY_COUNT } from "../signal/prekey-manager.ts";

export interface PreKeyMaintenanceOptions {
  getSocket: () => unknown | null;
  getStore: () => unknown | null;
  getServerPreKeyCount: () => Promise<number>;
  uploadPreKeys: (count: number) => Promise<void>;
}

/** Periodically tops up one-time prekeys without rotating the registered device. */
export class PreKeyMaintenance {
  private interval?: ReturnType<typeof setInterval>;

  constructor(private readonly opts: PreKeyMaintenanceOptions) {}

  start(): void {
    this.stop();
    const intervalMs = Number(process.env.FB_E2EE_PREKEY_SYNC_INTERVAL_MS ?? "1800000");
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) return;

    this.interval = setInterval(() => {
      void this.sync("periodic").catch((err) => {
        logger.error("PreKeyMaintenance", "Periodic prekey sync failed:", err);
      });
    }, intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  async sync(reason: string): Promise<void> {
    if (!this.opts.getSocket() || !this.opts.getStore()) return;

    const minCount = Number(process.env.FB_E2EE_PREKEY_MIN_COUNT ?? String(MIN_PREKEY_COUNT));
    const uploadCount = Number(process.env.FB_E2EE_PREKEY_UPLOAD_COUNT ?? String(WANTED_PREKEY_COUNT));

    try {
      const serverCount = await this.opts.getServerPreKeyCount();
      logger.info("PreKeyMaintenance", `E2EE prekey sync (${reason}): server has ${serverCount} prekeys`);

      if (serverCount < minCount) {
        await this.opts.uploadPreKeys(uploadCount);
        logger.info("PreKeyMaintenance", `Uploaded ${uploadCount} E2EE prekeys without changing registered device`);
      }
    } catch (err) {
      logger.error("PreKeyMaintenance", `Prekey sync failed (${reason}) at ${now()}:`, err);
    }
  }
}
