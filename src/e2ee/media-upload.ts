/**
 * E2EE Media Upload - HTTP upload to rupload.facebook.com
 * Reference: whatsmeow/upload.go rawUpload()
 */

import { createHash } from "node:crypto";

import type { MediaUploadConfig, MediaUploadResult, MmsTypeStr } from "../models/media.ts";
export type { MediaUploadConfig, MediaUploadResult, MmsTypeStr };

/**
 * Upload encrypted media bytes to Facebook's upload CDN.
 * Mirrors whatsmeow/upload.go rawUpload() with MessengerConfig path.
 */
export async function uploadMedia(
  config: MediaUploadConfig,
  data: Buffer,
  fileEncSHA256: Buffer,
  mmsType: MmsTypeStr,
): Promise<MediaUploadResult> {
  const token = fileEncSHA256.toString("base64url");
  const uploadUrl = `https://${config.host}/wa-msgr/mms/${mmsType}/${token}?auth=${encodeURIComponent(config.auth)}&token=${encodeURIComponent(token)}`;

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

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    throw new Error(`Media upload failed: HTTP ${resp.status} - ${body}`);
  }

  const json = await resp.json() as Record<string, string>;
  return {
    url: json.url ?? "",
    directPath: json.direct_path ?? "",
    handle: json.handle ?? "",
    objectId: json.object_id ?? "",
  };
}
