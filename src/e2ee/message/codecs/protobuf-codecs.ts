import * as protobuf from "protobufjs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// Protobuf Decoders (using protobufjs for simplicity)

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const root = new ((protobuf as any).default?.Root || protobuf.Root)();
root.resolvePath = (origin: string, target: string) => {
  return join(__dirname, "../proto", target);
};
root.loadSync([
  "WACommon.proto",
  "MessageTransport.proto",
  "MessageApplication.proto",
  "ConsumerApplication.proto",
  "ArmadilloApplication.proto",
  "ArmadilloICDC.proto"
]);

const MsgTransportType = root.lookupType("waMsgTransport.MessageTransport");
const MsgApplicationType = root.lookupType("WAMsgApplication.MessageApplication");
const ConsumerAppType = root.lookupType("waConsumerApplication.ConsumerApplication");
const ArmadilloAppType = root.lookupType("waArmadilloApplication.Armadillo");
const ICDCIdentityListType = root.lookupType("waArmadilloICDC.ICDCIdentityList");
const SignedICDCIdentityListType = root.lookupType("waArmadilloICDC.SignedICDCIdentityList");

export function decodeMessageTransport(buffer: Buffer): any {
  const msg = MsgTransportType.decode(buffer);
  return MsgTransportType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}

export function decodeMessageApplication(buffer: Buffer): any {
  const msg = MsgApplicationType.decode(buffer);
  return MsgApplicationType.toObject(msg, { longs: Number, enums: String, bytes: Buffer });
}

export function decodeConsumerApplication(buffer: Buffer): any {
  const msg = ConsumerAppType.decode(buffer);
  return ConsumerAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}

export function decodeArmadillo(buffer: Buffer): any {
  const msg = ArmadilloAppType.decode(buffer);
  return ArmadilloAppType.toObject(msg, { longs: String, enums: String, bytes: Buffer });
}

export function encodeICDCIdentityList(data: {
  seq: number;
  timestamp: number;
  devices: Buffer[];
  signingDeviceIndex: number;
}): Buffer {
  const msg = ICDCIdentityListType.create(data);
  return Buffer.from(ICDCIdentityListType.encode(msg).finish());
}

export function encodeSignedICDCIdentityList(data: {
  details: Buffer;
  signature: Buffer;
}): Buffer {
  const msg = SignedICDCIdentityListType.create(data);
  return Buffer.from(SignedICDCIdentityListType.encode(msg).finish());
}

export function decodeICDCFetchResponse(buffer: Buffer): any {
  // Not a proto, but we might need it
}
