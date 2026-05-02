import { inflateSync } from "node:zlib";
import { BinaryToken, DoubleByteTokens, SingleByteTokens } from "./tokens.ts";

export interface Node {
  tag: string;
  attrs: Record<string, any>;
  content?: any;
}

export class BinaryDecoder {
  private data: Buffer;
  private index: number = 0;

  constructor(data: Buffer) {
    this.data = data;
  }

  readByte(): number {
    if (this.index >= this.data.length) throw new Error("EOF");
    const val = this.data[this.index++];
    if (val === undefined) throw new Error("EOF");
    return val;
  }

  readInt8(): number { return this.readByte(); }

  readInt16(): number {
    const val = this.data.readUInt16BE(this.index);
    this.index += 2;
    return val;
  }

  readInt20(): number {
    const b1 = this.data[this.index];
    const b2 = this.data[this.index + 1];
    const b3 = this.data[this.index + 2];
    if (b1 === undefined || b2 === undefined || b3 === undefined) throw new Error("EOF");
    const val = ((b1 & 15) << 16) + (b2 << 8) + b3;
    this.index += 3;
    return val;
  }

  readInt32(): number {
    const val = this.data.readUInt32BE(this.index);
    this.index += 4;
    return val;
  }

  readListSize(tag: number): number {
    switch (tag) {
      case BinaryToken.ListEmpty: return 0;
      case BinaryToken.List8: return this.readInt8();
      case BinaryToken.List16: return this.readInt16();
      default: throw new Error("Invalid list size tag: " + tag);
    }
  }

  readString(tag: number): string {
    if (tag >= 1 && tag < SingleByteTokens.length) {
      return SingleByteTokens[tag] || "";
    }
    switch (tag) {
      case BinaryToken.Dictionary0:
      case BinaryToken.Dictionary1:
      case BinaryToken.Dictionary2:
      case BinaryToken.Dictionary3:
        const dictIdx = tag - BinaryToken.Dictionary0;
        const innerIdx = this.readInt8();
        const dict = DoubleByteTokens[dictIdx];
        if (!dict) throw new Error("Invalid dictionary index: " + dictIdx);
        return dict[innerIdx] || "";
      case BinaryToken.Binary8: return this.readRaw(this.readInt8()).toString();
      case BinaryToken.Binary20: return this.readRaw(this.readInt20()).toString();
      case BinaryToken.Binary32: return this.readRaw(this.readInt32()).toString();
      case BinaryToken.Nibble8:
      case BinaryToken.Hex8:
        return this.readPacked8(tag);
      default: throw new Error("Invalid string tag: " + tag);
    }
  }

  readRaw(len: number): Buffer {
    if (this.index + len > this.data.length) {
      throw new Error(`BinaryReader: Read out of bounds (index=${this.index}, len=${len}, dataLen=${this.data.length})`);
    }
    const val = this.data.subarray(this.index, this.index + len);
    this.index += len;
    return val;
  }

  readPacked8(tag: number): string {
    const startByte = this.readByte();
    const len = startByte & 127;
    let res = "";
    for (let i = 0; i < len; i++) {
      const b = this.readByte();
      res += this.unpackByte(tag, (b & 0xF0) >> 4);
      res += this.unpackByte(tag, b & 0x0F);
    }
    if (startByte >> 7 !== 0 && tag === BinaryToken.Hex8) res = res.slice(0, -1);
    return res;
  }

  unpackByte(tag: number, val: number): string {
    if (tag === BinaryToken.Nibble8) {
      if (val < 10) return String.fromCharCode(48 + val);
      if (val === 10) return "-";
      if (val === 11) return ".";
      if (val === 15) return "";
    } else if (tag === BinaryToken.Hex8) {
      if (val < 10) return String.fromCharCode(48 + val);
      if (val < 16) return String.fromCharCode(65 + val - 10);
    }
    return "";
  }

  readNode(): Node {
    const listSize = this.readListSize(this.readByte());
    const tag = this.readString(this.readByte());
    const attrs: Record<string, any> = {};
    const attrCount = (listSize - 1) >> 1;
    for (let i = 0; i < attrCount; i++) {
      const key = this.readString(this.readByte());
      const val = this.read(true);
      attrs[key] = val;
    }
    let content: any;
    if (listSize % 2 === 0) {
      content = this.read(false);
    }
    return { tag, attrs, content };
  }

  read(asString: boolean): any {
    const tag = this.readByte();
    if (tag === BinaryToken.ListEmpty) return null;
    if (tag === BinaryToken.List8 || tag === BinaryToken.List16) {
      const size = this.readListSize(tag);
      const res: Node[] = [];
      for (let i = 0; i < size; i++) res.push(this.readNode());
      return res;
    }
    if (tag === BinaryToken.Binary8) return this.readBytesOrString(this.readInt8(), asString);
    if (tag === BinaryToken.Binary20) return this.readBytesOrString(this.readInt20(), asString);
    if (tag === BinaryToken.Binary32) return this.readBytesOrString(this.readInt32(), asString);
    if (tag === BinaryToken.JIDPair) {
      const user = this.read(true);
      const server = this.read(true);
      return (user ? user + "@" : "") + server;
    }
    if (tag === BinaryToken.FBJID) {
      const user = this.read(true);
      const device = this.readInt16();
      const server = this.read(true);
      return `${user}.${device}@${server}`;
    }
    if (tag === BinaryToken.ADJID) {
      const agent = this.readByte();
      const device = this.readByte();
      const user = this.read(true);
      return `${user}.${agent}:${device}@s.whatsapp.net`;
    }
    return this.readString(tag);
  }

  readBytesOrString(len: number, asString: boolean): any {
    const raw = this.readRaw(len);
    return asString ? raw.toString() : raw;
  }
}

export function unmarshal(data: Buffer): Node {
  if (data.length === 0) throw new Error("Empty data in unmarshal");
  const dataType = data[0];
  let body = data.subarray(1);
  if (dataType !== undefined && (dataType & 2)) {
    body = inflateSync(body);
  }
  return new BinaryDecoder(body).readNode();
}
