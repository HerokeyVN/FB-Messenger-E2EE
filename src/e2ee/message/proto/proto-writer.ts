/** Minimal protobuf writer - only what we need */
export class ProtoWriter {
  private chunks: Buffer[] = [];

  private encodeVarint(value: number): Buffer {
    const bytes: number[] = [];
    let v = value >>> 0;
    while (v > 127) {
      bytes.push((v & 0x7f) | 0x80);
      v >>>= 7;
    }
    bytes.push(v);
    return Buffer.from(bytes);
  }

  private fieldHeader(fieldNum: number, wireType: number): Buffer {
    return this.encodeVarint((fieldNum << 3) | wireType);
  }

  /** Wire type 0 (varint) but supports bigint */
  private encodeVarintBigInt(value: bigint): Buffer {
    const bytes: number[] = [];
    let v = value;
    while (v > 127n) {
      bytes.push(Number((v & 0x7fn) | 0x80n));
      v >>= 7n;
    }
    bytes.push(Number(v));
    return Buffer.from(bytes);
  }

  /** Wire type 0 (varint) for uint64 fields */
  uint64_varint(fieldNum: number, value: bigint): this {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarintBigInt(value));
    return this;
  }

  /** Wire type 2 (length-delimited) - bytes, string, embedded message */
  bytes(fieldNum: number, data: Uint8Array): this {
    const d = Buffer.from(data);
    this.chunks.push(this.fieldHeader(fieldNum, 2));
    this.chunks.push(this.encodeVarint(d.length));
    this.chunks.push(d);
    return this;
  }

  string(fieldNum: number, value: string): this {
    return this.bytes(fieldNum, Buffer.from(value, "utf8"));
  }

  /** Wire type 0 (varint) */
  varint(fieldNum: number, value: number): this {
    this.chunks.push(this.fieldHeader(fieldNum, 0));
    this.chunks.push(this.encodeVarint(value));
    return this;
  }

  /** Wire type 0, bool */
  bool(fieldNum: number, value: boolean): this {
    return this.varint(fieldNum, value ? 1 : 0);
  }

  /** Wire type 1 (64-bit fixed) - uint64 */
  uint64(fieldNum: number, value: bigint): this {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    this.chunks.push(this.fieldHeader(fieldNum, 1));
    this.chunks.push(buf);
    return this;
  }

  build(): Buffer {
    return Buffer.concat(this.chunks);
  }
}
