/**
 * Internal/dev barrel for E2EE implementation details.
 *
 * Public consumers should prefer `src/e2ee/index.ts` or the package root.
 * This file intentionally exposes lower-level protocol modules for tests,
 * debugging, and advanced integrations.
 */

export * from "./application/e2ee-client.ts";
export * from "./application/fanout-planner.ts";
export * from "./application/outbound-message-cache.ts";
export * from "./application/prekey-maintenance.ts";
export * from "./application/retry-manager.ts";
export * from "./store/device-json.ts";
export * from "./store/device-repository.ts";
export * from "./store/device-store.ts";
export * from "./transport/binary/wa-binary.ts";
export * from "./transport/dgw/dgw-socket.ts";
export * from "./transport/noise/noise-handshake.ts";
export * from "./transport/noise/noise-socket.ts";
export * from "./signal/prekey-manager.ts";
export * from "./signal/signal-manager.ts";
export * from "./message/message-builder.ts";
export * from "./media/media-crypto.ts";
export * from "./media/media-upload.ts";
export * from "./facebook/facebook-protocol-utils.ts";
export { encodeICDCIdentityList as encodeFacebookICDCIdentityList, encodeSignedICDCIdentityList as encodeFacebookSignedICDCIdentityList } from "./facebook/icdc-payload.ts";
