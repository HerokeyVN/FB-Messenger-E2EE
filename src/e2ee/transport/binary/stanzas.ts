import { encodeNode, marshal } from "./encoder.ts";

const UNIFIED_OFFSET_MS = 3 * 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildUnifiedSessionId(
  nowMs: number = Date.now(),
  serverOffsetMs: number = 0,
): string {
  const unifiedTs = nowMs + serverOffsetMs + UNIFIED_OFFSET_MS;
  return String(unifiedTs % WEEK_MS);
}

export function encodePresenceAvailable(passive?: string): Buffer {
  const attrs: Record<string, string> = { type: "available" };
  if (passive !== undefined) attrs.passive = passive;
  return marshal(encodeNode("presence", attrs));
}

export function encodePrimingNode(sessionId: string): Buffer {
  const unifiedSession = encodeNode("unified_session", { id: sessionId });
  const offlineNode = encodeNode("offline", {});
  const accountSync = encodeNode("dirty", { type: "account_sync" });
  return marshal(encodeNode("ib", {}, [unifiedSession, offlineNode, accountSync]));
}

export function encodeKeepAlive(id: string): Buffer {
  return marshal(encodeNode("iq", {
    id: id,
    to: "s.whatsapp.net",
    type: "get",
    xmlns: "w:p",
  }));
}

export function encodeSetPassive(id: string, passive: boolean): Buffer {
  return marshal(encodeNode("iq", {
    id: id,
    to: "s.whatsapp.net",
    type: "set",
    xmlns: "passive",
  }, [
    encodeNode(passive ? "passive" : "active", {})
  ]));
}


export function encodeIQ(attrs: Record<string, string>, children?: any): Buffer {
  return marshal(encodeNode("iq", attrs, children));
}

export interface PreKeyNodeData {
  id: number;
  pubKey: Buffer;
  signature?: Buffer;
}

export function encodePreKeyUpload(
  registrationId: number,
  identityPub: Buffer,
  signedPreKey: PreKeyNodeData,
  preKeys: PreKeyNodeData[]
): Buffer {
  const regBuf = Buffer.alloc(4);
  regBuf.writeUInt32BE(registrationId);

  const children = [
    encodeNode("registration", {}, regBuf),
    encodeNode("type", {}, Buffer.from([0x05])),
    encodeNode("identity", {}, identityPub),
    encodeNode("list", {}, preKeys.map(pk => encodePreKeyNode(pk, "key"))),
    encodePreKeyNode(signedPreKey, "skey")
  ];

  return encodeIQ({
    id: `pk-${Date.now()}`,
    to: "s.whatsapp.net",
    type: "set",
    xmlns: "encrypt",
  }, children);
}

function encodePreKeyNode(pk: PreKeyNodeData, tag: string): Buffer {
  const idBuf = Buffer.alloc(4);
  idBuf.writeUInt32BE(pk.id);

  const children = [
    encodeNode("id", {}, idBuf.subarray(1)), // 3-byte ID
    encodeNode("value", {}, pk.pubKey)
  ];

  if (pk.signature) {
    children.push(encodeNode("signature", {}, pk.signature));
  }

  return encodeNode(tag, {}, children);
}
