# FME - FB Messenger E2EE

[![npm version](https://img.shields.io/npm/v/fb-messenger-e2ee?style=flat-square)](https://www.npmjs.com/package/fb-messenger-e2ee)
[![github version](https://img.shields.io/github/package-json/v/HerokeyVN/fb-messenger-e2ee?label=github&style=flat-square)](https://github.com/HerokeyVN/fb-messenger-e2ee)
[![npm downloads](https://img.shields.io/npm/dm/fb-messenger-e2ee?style=flat-square)](https://www.npmjs.com/package/fb-messenger-e2ee)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?style=flat-square)](https://bun.sh/)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)

**FME - FB Messenger E2EE** is a TypeScript/Bun toolkit focused on Facebook Messenger E2EE flows built on Noise, WA-binary, protobuf, and the Signal Protocol. It is intentionally scoped to encrypted Messenger operations; for normal/plaintext messaging, use [`fca-unofficial`](https://github.com/VangBanLaNhat/fca-unofficial) directly.

`fb-messenger-e2ee` handles the awkward parts of Messenger E2EE: device registration, persistent cryptographic state, Signal sessions, prekeys, sender keys, encrypted media, and binary transport over a Noise websocket.

---

## Documentation Index

This README gives you the full fast path. The deeper docs split each area into a focused reference:

1. **[Getting Started & Lifecycle](./docs/getting-started.md)**: Installation, `FBClient` initialization, and connection lifecycles (`connect` vs `connectE2EE`).
2. **[Cryptography & Key Maintenance](./docs/cryptography.md)**: `DeviceStore`, prekey maintenance, and Group Sender-Key Distribution Messages (SKDM).
3. **[Messaging API](./docs/messaging.md)**: Sending E2EE text messages, reactions, edits, typing events, and revokes.
4. **[Media Handling](./docs/media.md)**: Encrypting and sending images, videos, audio, and documents over E2EE.
5. **[Event Handling](./docs/events.md)**: Listening to real-time `e2ee_message`, `reaction`, `receipt`, and error events.
6. **[Internal Architecture](./docs/architecture.md)**: Internal modules and receive/send data paths.

---

## Key Features

- **Native E2EE path**: Signal Protocol sessions, prekeys, sender keys, Noise socket frames, and WA-binary nodes for encrypted Messenger chats.
- **Group sender-key support**: Group `skmsg` decrypt/encrypt plus participant fanout of sender-key distribution messages (`skdm`).
- **Device persistence**: JSON-backed `DeviceStore` keeps Noise keys, Signal identity, sessions, prekeys, signed prekeys, and sender keys across restarts.
- **Automatic prekey maintenance**: Replenishes server-side one-time prekeys without deleting or re-registering the E2EE device.
- **Typed E2EE events**: Catch-all and typed event subscriptions for E2EE messages, receipts, reactions, errors, and raw frames.
- **Encrypted media helpers**: Send images, videos, audio, documents, and multi-file batches through the E2EE path.
- **DGW support**: Optional Direct Gateway / LightSpeed socket helpers.

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/) / Node-compatible APIs
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Build output**: ESM and CommonJS bundles via `tsup`
- **Encryption**: [@signalapp/libsignal-client](https://github.com/signalapp/libsignal-client)
- **Protocol**: ProtobufJS + manual WA-binary/protobuf encoders
- **Transport**: WebSocket + Messenger E2EE Noise frames
- **Auth bootstrap bridge**: [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) is used internally only for appState login/CAT bootstrap.

---

## Getting Started

### 1. Install

```bash
npm install fb-messenger-e2ee
# or
bun add fb-messenger-e2ee
```

### 2. Import

ESM / TypeScript / modern Node.js:

```typescript
import { FBClient } from "fb-messenger-e2ee";
```

CommonJS:

```javascript
const { FBClient } = require("fb-messenger-e2ee");
```

### 3. Connect and Send an E2EE Message

```typescript
import { FBClient } from "fb-messenger-e2ee";

const client = new FBClient({
  // Path to Facebook appState JSON. This contains active login cookies/session data.
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
    console.log(`[E2EE] ${event.data.threadId} ${event.data.senderJid}: ${event.data.text}`);
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

The normal lifecycle is:

1. `connect()` authenticates enough of the Facebook session to obtain the E2EE bootstrap material.
2. `connectE2EE(deviceStorePath, userId)` starts the encrypted Noise/Signal stream.
3. Send messages or listen for E2EE events.
4. `disconnect()` when the process should shut down cleanly.

---

## Device Store & Key Maintenance

`connectE2EE(deviceStorePath, userId)` loads or creates a persistent device store. Do **not** delete it as a normal recovery step.

The device store contains long-lived E2EE identity and cryptographic state:

| Field | Purpose |
|---|---|
| `noise_key_priv` | Noise handshake private key |
| `identity_key_priv` | Signal identity private key |
| `registration_id` | Signal registration ID |
| `adv_secret_key` | Messenger/WA companion secret |
| `facebook_uuid` | ICDC device UUID |
| `jid_user`, `jid_device` | Registered Messenger E2EE device JID |
| `pre_keys` | Local one-time prekey records |
| `signed_pre_keys` / `signed_pre_key_id` | Signed prekey records |
| `sessions` | Signal sessions with other devices |
| `sender_keys` | Group sender-key state from SKDM |

Deleting the store generates a new Noise key, Signal identity, registration ID, `facebook_uuid`, and device registration. Keeping it lets the same registered E2EE device continue using existing sessions and sender keys.

Prekey maintenance is automatic and does not require deleting or re-registering the E2EE device:

| Env | Default | Purpose |
|---|---:|---|
| `FB_E2EE_PREKEY_SYNC_INTERVAL_MS` | `1800000` | Periodic prekey check interval in milliseconds. Set `0` to disable. |
| `FB_E2EE_PREKEY_MIN_COUNT` | `5` | Upload more prekeys when server count falls below this. |
| `FB_E2EE_PREKEY_UPLOAD_COUNT` | `50` | Number of fresh one-time prekeys to upload per refill. |

Group decrypt note: if local `sender_keys` for a group/sender are truly missing, the client cannot derive that key locally. On retryable decrypt failures it sends an E2EE retry receipt to request a resend/SKDM from the sender/server. The send path also keeps a short in-memory retry cache so incoming `receipt type="retry"` requests for recently sent messages can be re-encrypted directly to the requesting device.

---

## Event Identity Model

E2EE events separate the conversation identity from the sender device identity:

- `threadId`: Stable conversation ID. For DMs this is the bare Facebook user ID; for groups it is the group JID.
- `chatJid`: Canonical E2EE chat JID. For DMs this is `user.0@msgr`; for groups it is `group@g.us`.
- `senderJid`: Device-specific sender JID such as `user.160@msgr`.
- `senderDeviceId`: Numeric Messenger E2EE device ID when available.
- `kind`: Normalized content kind (`text`, `image`, `reaction`, `edit`, etc.). Empty optional fields are omitted from the event payload.

---

## Project Structure

```text
src/
├── actions/         # Public operation implementations grouped by domain
│   ├── media/       # Media send/download actions
│   ├── messaging/   # Message, reaction, typing, read, and listen actions
│   ├── thread/      # Thread/group management actions
│   └── user/        # User lookup and friend-list actions
├── config/          # Environment helpers
├── controllers/     # Runtime orchestration, socket handlers, event mapping
├── core/            # Public FBClient facade and ActionContext contract
├── e2ee/
│   ├── application/ # E2EEClient, retry/prekey/cache/fanout runtime helpers
│   ├── facebook/    # Facebook-specific SKMSG/SKDM/ICDC helpers
│   ├── media/       # Media crypto/upload primitives
│   ├── message/     # Protobuf writer/builders/codecs/schemas
│   ├── signal/      # Signal sessions, prekeys, sender keys
│   ├── store/       # DeviceStore plus JSON migration/repository
│   └── transport/   # Noise, WA-binary, DGW sockets
├── models/          # TypeScript interfaces and domain models
├── repositories/    # Session persistence
├── services/        # Auth/CAT bridge, gateway, ICDC, E2EE, media, thread services
├── types/           # Advanced utility types and external module declarations
└── utils/           # Logger and conversion helpers
```

The high-level flow is:

```text
FBClient
  -> ClientController
  -> ActionContext + domain actions
  -> services/controllers
  -> e2ee internals
  -> Messenger Noise/DGW/FCA gateways
```

---

## Build & Development

Install dependencies:

```bash
npm install
# or
bun install
```

Generate ESM and CommonJS bundles in `dist/`:

```bash
npm run build
# or
bun run build
```

Run TypeScript checking:

```bash
npm run typecheck
```

Run the Jest test suite:

```bash
npm test -- --runInBand
```

Run the manual E2EE echo script:

```bash
bun run tests/script/echo-e2ee.ts
```

The echo script is intended for manual account/session validation. It requires usable Facebook appState/session inputs and may keep the process alive while listening.

---

## Package Contents

The npm package publishes:

- `dist/`: ESM, CommonJS, source maps, and declaration files.
- `proto/`: Protocol definitions and protobuf writer support files.
- `README.md` and `docs/`: GitHub/npm documentation.
- `LICENSE`: AGPL-3.0-or-later license text.

---

## License

Licensed under the [GNU Affero General Public License v3.0](./LICENSE).
