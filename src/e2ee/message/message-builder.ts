/**
 * Message layer public barrel.
 *
 * Keep imports here stable while implementations live under proto/, builders/,
 * and codecs/. The top-level compatibility shim re-exports this barrel.
 */

export type { MediaFields, MessageTransportOptions } from "../../models/e2ee.ts";
export * from "./constants.ts";
export { ProtoWriter } from "./proto/proto-writer.ts";
export * from "./builders/client-payload.ts";
export * from "./builders/consumer-application.ts";
export * from "./builders/message-application.ts";
export * from "./builders/message-transport.ts";
export * from "./codecs/protobuf-codecs.ts";
