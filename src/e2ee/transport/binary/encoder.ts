import type { Node } from "./decoder.ts";
import { BinaryToken, DoubleTokenToIndex, TokenToIndex } from "./tokens.ts";

export function marshal(node: Node | Buffer): Buffer {
  const buf = Buffer.isBuffer(node) ? node : encodeNode(node.tag, node.attrs as Record<string, string>, node.content);
  return Buffer.concat([Buffer.from([0]), buf]); // dataType = 0 (not compressed)
}

export function encodeNode(tag: string, attrs: Record<string, string>, children?: any): Buffer {
  const hasContent = children !== undefined;
  const listSize = 1 + (Object.keys(attrs).length * 2) + (hasContent ? 1 : 0);

  const chunks: Buffer[] = [encodeListStart(listSize), encodeString(tag)];

  const JID_ATTRIBUTES = new Set(["to", "from", "jid", "participant", "recipient", "target"]);

  for (const [k, v] of Object.entries(attrs)) {
    chunks.push(encodeString(k));
    if (typeof v === "string" && (v.includes("@") || JID_ATTRIBUTES.has(k))) {
      chunks.push(encodeJID(v));
    } else {
      chunks.push(encodeString(String(v)));
    }
  }

  if (hasContent) {
    if (Array.isArray(children)) {
      chunks.push(encodeNodeList(children));
    } else if (Buffer.isBuffer(children)) {
      chunks.push(encodeStringRaw(children));
    } else {
      chunks.push(encodeString(String(children)));
    }
  }

  return Buffer.concat(chunks);
}

function encodeNodeList(nodes: Buffer[]): Buffer {
  return Buffer.concat([encodeListStart(nodes.length), ...nodes]);
}

function encodeListStart(size: number): Buffer {
  if (size === 0) return Buffer.from([BinaryToken.ListEmpty]);
  if (size < 256) return Buffer.from([BinaryToken.List8, size]);
  if (size < 65536) {
    const out = Buffer.alloc(3);
    out[0] = BinaryToken.List16;
    out.writeUInt16BE(size, 1);
    return out;
  }
  throw new Error("List too large");
}

function encodeString(val: string): Buffer {
  const token = TokenToIndex[val];
  if (typeof token === "number") return Buffer.from([token]);

  const doubleToken = DoubleTokenToIndex[val];
  if (doubleToken) {
    return Buffer.from([BinaryToken.Dictionary0 + doubleToken.dict, doubleToken.index]);
  }

  return encodeStringRaw(Buffer.from(val));
}

function encodeStringRaw(buf: Buffer): Buffer {
  if (buf.length < 256) return Buffer.concat([Buffer.from([BinaryToken.Binary8, buf.length]), buf]);
  if (buf.length < 1048576) {
    const header = Buffer.alloc(4);
    header[0] = BinaryToken.Binary20;
    header[1] = (buf.length >> 16) & 0xFF;
    header[2] = (buf.length >> 8) & 0xFF;
    header[3] = buf.length & 0xFF;
    return Buffer.concat([header, buf]);
  }
  const header = Buffer.alloc(5);
  header[0] = BinaryToken.Binary32;
  header.writeUInt32BE(buf.length, 1);
  return Buffer.concat([header, buf]);
}

function encodeJID(jid: string): Buffer {
  const atIdx = jid.indexOf("@");
  if (atIdx === -1) return encodeString(jid);

  const userFull = jid.slice(0, atIdx);
  const server = jid.slice(atIdx + 1);

  if (server === "msgr") {
    let user = userFull;
    let device = 0;
    const dotIdx = userFull.indexOf(".");
    const colonIdx = userFull.indexOf(":");
    const splitIdx = dotIdx !== -1 ? dotIdx : colonIdx;

    if (splitIdx !== -1) {
      user = userFull.slice(0, splitIdx);
      device = parseInt(userFull.slice(splitIdx + 1));
    }

    const chunks = [Buffer.from([BinaryToken.FBJID]), encodeString(user)];
    const devBuf = Buffer.alloc(2);
    devBuf.writeUInt16BE(device);
    chunks.push(devBuf);
    chunks.push(encodeString(server));
    return Buffer.concat(chunks);
  }

  // Handle ADJID (for @s.whatsapp.net with devices)
  if (server === "s.whatsapp.net" && (userFull.includes(".") || userFull.includes(":"))) {
    let user = userFull;
    let agent = 0;
    let device = 0;

    // Format: user.agent:device
    const dotIdx = userFull.indexOf(".");
    const colonIdx = userFull.indexOf(":");
    if (dotIdx !== -1 && colonIdx !== -1) {
      user = userFull.slice(0, dotIdx);
      agent = parseInt(userFull.slice(dotIdx + 1, colonIdx));
      device = parseInt(userFull.slice(colonIdx + 1));
    } else if (dotIdx !== -1) {
      user = userFull.slice(0, dotIdx);
      device = parseInt(userFull.slice(dotIdx + 1));
    }

    return Buffer.concat([
      Buffer.from([BinaryToken.ADJID, agent, device]),
      encodeString(user)
    ]);
  }

  // JIDPair: user@server (usually for g.us)
  const chunks: Uint8Array[] = [Buffer.from([BinaryToken.JIDPair])];
  if (userFull) {
    chunks.push(encodeString(userFull));
  } else {
    chunks.push(Buffer.from([BinaryToken.ListEmpty]));
  }
  chunks.push(encodeString(server));
  return Buffer.concat(chunks);
}
