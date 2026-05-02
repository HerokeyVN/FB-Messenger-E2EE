import { createHash } from "node:crypto";

export interface ParsedMessengerJid {
  user: string;
  device: number;
  server: string;
}

export function parseMessengerJid(jid: string): ParsedMessengerJid {
  const [userPart = jid, server = ""] = jid.split("@");
  const colonIdx = userPart.indexOf(":");
  const dotIdx = userPart.indexOf(".");
  const userEnd = dotIdx !== -1 ? dotIdx : (colonIdx !== -1 ? colonIdx : userPart.length);
  const user = userPart.slice(0, userEnd) || userPart;
  const rawDevice = colonIdx !== -1
    ? userPart.slice(colonIdx + 1)
    : (dotIdx !== -1 ? userPart.slice(dotIdx + 1) : "0");
  return { user, device: Number(rawDevice) || 0, server };
}

export function toBareMessengerJid(jid: string): string {
  const parsed = parseMessengerJid(jid);
  return parsed.server === "msgr" ? `${parsed.user}.0@msgr` : jid;
}

export function normalizeDMThreadToJid(threadId: string): string {
  const jid = threadId.includes("@")
    ? threadId
    : (threadId.includes(".") || threadId.includes(":") ? `${threadId}@msgr` : `${threadId}.0@msgr`);
  return toBareMessengerJid(jid);
}

export function sameMessengerUser(a: string, b: string): boolean {
  const pa = parseMessengerJid(a);
  const pb = parseMessengerJid(b);
  return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user;
}

export function sameMessengerDevice(a: string, b: string): boolean {
  const pa = parseMessengerJid(a);
  const pb = parseMessengerJid(b);
  return pa.server === "msgr" && pb.server === "msgr" && pa.user === pb.user && pa.device === pb.device;
}

export function uniqueJids(jids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const jid of jids) {
    if (!jid) continue;
    const parsed = parseMessengerJid(jid);
    const key = parsed.server === "msgr" ? `${parsed.user}:${parsed.device}@${parsed.server}` : jid;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(jid);
  }
  return out;
}

export function toADString(jid: string): string {
  const [userPart = "", server = ""] = jid.split("@");
  if (server === "msgr") {
    const parsed = parseMessengerJid(jid);
    if (!parsed.user) return jid;
    return `${parsed.user}.0:${parsed.device}@${server}`;
  }

  const [userAndAgent = "", devicePart = ""] = userPart.split(":");
  const [user = "", rawAgentPart = ""] = userAndAgent.split(".");
  const rawAgent = rawAgentPart ? Number(rawAgentPart) : 0;
  const device = devicePart ? Number(devicePart) : 0;
  if (!user) return jid;
  return `${user}.${rawAgent}:${device}@${server}`;
}

export function buildParticipantListHash(participants: string[]): string {
  const sorted = [...participants].map((jid) => toADString(jid)).sort();
  const hash = createHash("sha256").update(sorted.join("")).digest();
  return `2:${hash.subarray(0, 6).toString("base64").replace(/=+$/, "")}`;
}
