# FME - FB Messenger E2EE

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**FME - FB Messenger E2EE** is a TypeScript/Bun toolkit for connecting to Facebook Messenger with support for standard Messenger events and Messenger E2EE flows built on Noise, WA-binary, protobuf, and the Signal Protocol.

---

## Key Features

- **Native E2EE path**: Signal Protocol sessions, prekeys, sender keys, Noise socket frames, and WA-binary nodes for encrypted Messenger chats.
- **Group sender-key support**: group `skmsg` decrypt/encrypt plus participant fanout of sender-key distribution messages (`skdm`).
- **Device persistence**: JSON-backed `DeviceStore` keeps Noise keys, Signal identity, sessions, prekeys, signed prekeys, and sender keys across restarts.
- **Automatic prekey maintenance**: replenishes server-side one-time prekeys without deleting or re-registering the E2EE device.
- **Typed events**: catch-all and typed event subscriptions for normal Messenger events, E2EE messages, receipts, reactions, errors, and raw frames.
- **DGW support**: optional Direct Gateway / LightSpeed socket helpers.

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) / Node-compatible APIs
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Encryption**: [@signalapp/libsignal-client](https://github.com/signalapp/libsignal-client)
- **Protocol**: ProtobufJS + manual WA-binary/protobuf encoders
- **Base Bridge**: [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) for non-E2EE login/listen/send only

---

## Getting Started

### 1. Installation

```bash
bun install
```

### 2. Basic Usage

```typescript
import { FBClient } from "fb-messenger-e2ee";

const client = new FBClient({
  appStatePath: "./appstate.json",
  sessionStorePath: "./session.json",
  platform: "facebook",
});

const { userId } = await client.connect();

// Keep this file. It is the registered E2EE device identity and Signal state.
await client.connectE2EE("./device-store.json", userId);

client.onEvent((event) => {
  if (event.type === "e2ee_connected") {
    console.log("E2EE stream is ready");
  }

  if (event.type === "e2ee_message") {
    console.log(`[E2EE] ${event.data.senderJid}: ${event.data.text}`);
  }

  if (event.type === "error") {
    console.error("Client error:", event.data.message);
  }
});

await client.sendMessage({
  threadId: "1234567890", // user ID, *.@msgr JID, or group JID
  text: "Hello from the secure side!",
});
```

---

## Device Store & Key Maintenance

`connectE2EE(deviceStorePath, userId)` loads or creates a persistent device store. Do **not** delete it as a normal recovery step:

- Deleting it generates a new Noise key, Signal identity, registration ID, `facebook_uuid`, and device registration.
- Keeping it lets the same registered E2EE device continue using existing sessions and sender keys.
- The client now refreshes one-time prekeys automatically and does not need a new device registration for normal prekey exhaustion.

Configurable environment variables:

| Env | Default | Purpose |
|---|---:|---|
| `FB_E2EE_PREKEY_SYNC_INTERVAL_MS` | `1800000` | Periodic prekey check interval. Set `0` to disable. |
| `FB_E2EE_PREKEY_MIN_COUNT` | `5` | Upload more prekeys when server count falls below this. |
| `FB_E2EE_PREKEY_UPLOAD_COUNT` | `50` | Number of fresh one-time prekeys to upload per refill. |

Group decrypt note: if local `sender_keys` for a group/sender are truly missing, old group messages may still fail with `missing sender key state` until the sender/group distributes a fresh SKDM to this device. That is different from prekey exhaustion.

---

## Project Structure

```text
src/
├── controllers/    # Orchestration logic (ClientController, handlers)
├── core/           # Public FBClient facade
├── e2ee/           # Signal, Noise, WA-binary, protobuf, media crypto
├── models/         # TypeScript interfaces & domain models
├── services/       # Auth, FCA gateway, messaging, media, ICDC, E2EE facade
├── repositories/   # Session persistence
└── utils/          # Logger and conversion helpers
```

---

## Testing

```bash
npm run typecheck
npm test -- --runInBand
```

Manual echo script:

```bash
bun run tests/script/echo-e2ee.ts
```

---

## Documentation

For the API reference and operational notes, see [DOCS.md](./DOCS.md).
For architecture notes, see [`.agents/ARCHITECTURE.md`](./.agents/ARCHITECTURE.md).

---

## Acknowledgements

Special thanks to the [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) team for the foundational bridge work.

---

## License

MIT © [VangBanLaNhat](https://github.com/VangBanLaNhat)
