import { extname } from "node:path";

const MIME_BY_EXT: Record<string, string> = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg; codecs=opus",
  ".opus": "audio/ogg; codecs=opus",
  ".wav": "audio/wav",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".json": "application/json",
  ".csv": "text/csv",
  ".zip": "application/zip",
};

export type FileMediaKind = "image" | "video" | "audio" | "file";

/**
 * Infer a MIME type from a filename/path extension.
 *
 * This intentionally avoids async/content sniffing so public send APIs can make
 * mimeType optional without adding filesystem reads or external dependencies.
 */
export function inferMimeTypeFromFileName(fileName: string, fallback = "application/octet-stream"): string {
  const ext = extname(fileName).toLowerCase();
  return MIME_BY_EXT[ext] ?? fallback;
}

export function inferFileMediaKindFromMimeType(mimeType: string): FileMediaKind {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
}
