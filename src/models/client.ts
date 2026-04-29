import type { MessengerEvent, Platform } from "./domain.ts";

export interface ClientOptions {
  appStatePath: string;
  sessionStorePath: string;
  platform?: Platform;
}

export interface SessionData {
  userId: string;
  appState: Array<{ key: string; value: string }>;
  platform: Platform;
  updatedAt: number;
}

export interface SessionRepository {
  read(path: string): Promise<SessionData | null>;
  write(path: string, session: SessionData): Promise<void>;
}

export type MessengerEventMap = {
  [E in MessengerEvent as E["type"]]: E["data"];
} & {
  event: MessengerEvent;
};
