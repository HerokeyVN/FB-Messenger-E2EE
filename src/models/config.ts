import type { Platform } from "./domain.ts";

export interface AppEnv {
  appStatePath?: string;
  appState?: any[] | string;
  sessionStorePath?: string;
  platform: Platform;
}

export interface AuthConfig {
  appStatePath?: string;
  appState?: any[] | string;
  platform: Platform;
}
