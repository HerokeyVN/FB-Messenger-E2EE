import type { MediaUploadConfig, MediaUploadResult, MmsTypeStr } from "../../models/media.ts";
export type { MediaUploadConfig, MediaUploadResult, MmsTypeStr };

export function toMediaUploadToken(fileEncSHA256: Buffer): string {
  return fileEncSHA256.toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
}

/**
 * Callback to refresh media upload config (e.g., re-query media_conn).
 */
export type RefreshUploadConfigFn = () => Promise<MediaUploadConfig>;

export interface UploadMediaOptions {
  /** Optional callback to refresh auth config on 401. */
  refreshConfig?: RefreshUploadConfigFn;
  /** Max retry attempts after refresh (default 1). */
  maxRetries?: number;
}

/**
 * Upload encrypted media bytes to Facebook's upload CDN.
 * Supports retry on 401 by refreshing the upload config.
 */
export async function uploadMedia(
  config: MediaUploadConfig,
  data: Buffer,
  fileEncSHA256: Buffer,
  mmsType: MmsTypeStr,
  options?: UploadMediaOptions,
): Promise<MediaUploadResult> {
  if (!config.auth) {
    throw new Error("Missing media upload auth token; query media_conn before uploading E2EE media");
  }

  const token = toMediaUploadToken(fileEncSHA256);
  const maxRetries = options?.maxRetries ?? 1;
  let currentConfig = config;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const uploadUrl = `https://${currentConfig.host}/wa-msgr/mms/${mmsType}/${token}?auth=${encodeURIComponent(currentConfig.auth)}&token=${encodeURIComponent(token)}`;

    const resp = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(data.length),
        "Origin": "https://www.facebook.com",
        "Referer": "https://www.facebook.com/",
      },
      body: data,
    });

    if (resp.ok) {
      const json = await resp.json() as Record<string, string>;
      return {
        url: json.url ?? "",
        directPath: json.direct_path ?? "",
        handle: json.handle ?? "",
        objectId: json.object_id ?? "",
      };
    }

    // On 401, try to refresh config and retry
    if (resp.status === 401 && attempt < maxRetries && options?.refreshConfig) {
      const body = await resp.text().catch(() => "");
      console.warn(`Media upload 401 (attempt ${attempt + 1}), refreshing config...`, body.slice(0, 200));
      currentConfig = await options.refreshConfig();
      if (!currentConfig.auth) {
        throw new Error("Media upload refresh returned empty auth token");
      }
      continue;
    }

    // Non-401 or max retries exceeded
    const body = await resp.text().catch(() => "");
    throw new Error(`Media upload failed: HTTP ${resp.status} - ${body}`);
  }

  // Should not reach here, but just in case
  throw new Error("Media upload failed after retries");
}
