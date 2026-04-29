import { resolve } from "node:path";

import type { AppEnv } from "../models/config.ts";

export function loadEnv(): AppEnv {
  const appStatePath = process.env.FB_APPSTATE_PATH ?? "./data/appstate.json";
  const sessionStorePath = process.env.FB_SESSION_STORE_PATH ?? "./data/session.json";
  const platform = (process.env.FB_PLATFORM ?? "facebook") as "facebook" | "messenger";

  return {
    appStatePath: resolve(appStatePath),
    sessionStorePath: resolve(sessionStorePath),
    platform,
  };
}
