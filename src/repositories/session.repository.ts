import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { SessionData, SessionRepository } from "../models/client.ts";

export class FileSessionRepository implements SessionRepository {
  public async read(path: string): Promise<SessionData | null> {
    try {
      const content = await readFile(path, "utf-8");
      return JSON.parse(content) as SessionData;
    } catch {
      return null;
    }
  }

  public async write(path: string, session: SessionData): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, JSON.stringify(session, null, 2), "utf-8");
  }
}
