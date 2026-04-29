import { readFile } from "node:fs/promises";

import type { AppStateCookie } from "fca-unofficial";

import type { AuthConfig } from "../models/config.ts";
import type { SessionData, SessionRepository } from "../models/client.ts";

export class AuthService {
  public constructor(private readonly sessionRepository: SessionRepository) {}

  public async readAppState(config: AuthConfig): Promise<AppStateCookie[]> {
    const raw = await readFile(config.appStatePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error("Invalid appState format: expected an array");
    }

    return parsed.map(item => {
      const cookie = item as Record<string, unknown>;
      return {
        key: String(cookie.key ?? cookie.name ?? ""),
        value: String(cookie.value ?? ""),
        domain: typeof cookie.domain === "string" ? cookie.domain : ".facebook.com",
        path: typeof cookie.path === "string" ? cookie.path : "/",
        expires:
          typeof cookie.expires === "number" && Number.isFinite(cookie.expires)
            ? cookie.expires
            : typeof cookie.expirationDate === "number" && Number.isFinite(cookie.expirationDate)
              ? cookie.expirationDate
              : Date.now() + 1000 * 60 * 60 * 24 * 365,
      };
    });
  }

  public async saveSession(path: string, session: SessionData): Promise<void> {
    await this.sessionRepository.write(path, session);
  }

  public async loadSession(path: string): Promise<SessionData | null> {
    return this.sessionRepository.read(path);
  }
}
