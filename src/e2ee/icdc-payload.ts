import { ProtoWriter } from "./message-builder.ts";

export interface ICDCIdentityListOptions {
  seq: number;
  timestamp: number;
  devices: Uint8Array[];
  signingDeviceIndex: number;
}

export function encodeICDCIdentityList(opts: ICDCIdentityListOptions): Buffer {
  const w = new ProtoWriter();
  w.varint(1, opts.seq);
  w.uint64_varint(2, BigInt(opts.timestamp));
  for (const device of opts.devices) {
    w.bytes(3, Buffer.from(device));
  }
  w.varint(4, opts.signingDeviceIndex);
  return w.build();
}

export interface SignedICDCIdentityListOptions {
  details: Buffer;
  signature: Buffer;
}

export function encodeSignedICDCIdentityList(opts: SignedICDCIdentityListOptions): Buffer {
  const w = new ProtoWriter();
  w.bytes(1, opts.details);
  w.bytes(2, opts.signature);
  return w.build();
}
