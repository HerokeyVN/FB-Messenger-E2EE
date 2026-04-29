import type { Platform } from "./domain.ts";

export interface AppEnv {
  appStatePath: string;
  sessionStorePath: string;
  platform: Platform;
}

export interface AuthConfig {
  appStatePath: string;
  platform: Platform;
}
