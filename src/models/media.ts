export interface MediaKeys {
  iv: Buffer;
  cipherKey: Buffer;
  macKey: Buffer;
  refKey: Buffer;
}

export interface EncryptMediaResult {
  dataToUpload: Buffer;
  fileSHA256: Buffer;
  fileEncSHA256: Buffer;
  fileLength: number;
  mediaKey: Buffer;
}

export interface DecryptMediaOptions {
  data: Buffer;
  mediaKey: Buffer;
  type: any; // MediaTypeKey (avoiding circular dep for now)
  fileSHA256?: Buffer;
  fileEncSHA256?: Buffer;
}

export interface MediaUploadConfig {
  /** From server's media connection response */
  auth: string;
  /** Host to upload to - Messenger prefers the last host (rupload.facebook.com) */
  host: string;
}

export interface MediaUploadResult {
  url: string;
  directPath: string;
  handle: string;
  objectId: string;
}

export type MmsTypeStr = "image" | "video" | "ptt" | "document" | "sticker";
