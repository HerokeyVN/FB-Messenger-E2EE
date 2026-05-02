import { ProtoWriter } from "../proto/proto-writer.ts";

export interface ClientPayloadOptions {
  username: bigint;
  deviceId: number;
  fbCat?: Buffer;
  fbUserAgent?: Buffer;
  fbAppID?: bigint;
  fbDeviceID?: Buffer;
  fbCatBase64?: string;
}

// ClientPayload encoding (Handshake Step 3)

export function encodeClientPayload(opts: ClientPayloadOptions): Buffer {
  // AppVersion: 301.0.2
  const appVersion = new ProtoWriter()
    .varint(1, 301)
    .varint(2, 0)
    .varint(3, 2)
    .build();

  // UserAgent
  const userAgent = new ProtoWriter()
    .varint(1, 32) // Platform = BLUE_WEB (32)
    .bytes(2, appVersion)
    .string(3, "000") // mcc
    .string(4, "000") // mnc
    .string(5, "") // osVersion
    .string(6, "Linux") // manufacturer (OSName)
    .string(7, "Chrome") // device (BrowserName)
    .string(8, "") // osBuildNumber
    .varint(10, 3)    // releaseChannel = DEBUG
    .string(11, "en") // localeLanguage
    .string(12, "en") // localeCountry
    .build();

  const UserAgentStr = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";

  // ClientPayload
  let w = new ProtoWriter()
    .uint64_varint(1, opts.username) // field 1
    .bool(3, false) // field 3: passive
    .bytes(5, userAgent) // field 5
    .varint(12, 1) // field 12: connectType (WIFI_UNKNOWN)
    .varint(13, 1) // field 13: connectReason (USER_ACTIVATED)
    .varint(18, opts.deviceId) // field 18: device
    .varint(20, 1) // field 20: product (MESSENGER)
    .bytes(21, opts.fbCatBase64 ? Buffer.from(opts.fbCatBase64) : Buffer.alloc(0)) // field 21: fbCat (as base64 string bytes)
    .bytes(22, opts.fbUserAgent ?? Buffer.from(UserAgentStr)) // field 22: fbUserAgent
    .bool(33, true); // field 33: pull

  return w.build();
}
