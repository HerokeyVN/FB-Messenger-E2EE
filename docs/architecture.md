# Architecture & Technical Details

This document outlines the internal architecture of `fb-messenger-e2ee`. It is intended for developers who wish to contribute to the library or deeply understand how it interfaces with Facebook's E2EE infrastructure.

---

## Internal Module Layout

The public package entry point is `src/index.ts`, which exports `FBClient`, selected services, and public TypeScript models. The runtime is layered so the user-facing facade stays small while action modules and E2EE internals handle the protocol-heavy work.

```text
src/
├── actions/         # Domain operation implementations
│   ├── media/       # Media send/download actions
│   ├── messaging/   # Message, reaction, typing, read, and listen actions
│   ├── thread/      # Thread/group management actions
│   └── user/        # User lookup and friend-list actions
├── config/          # Environment helpers
├── controllers/     # Runtime orchestration, socket handlers, event mapping
├── core/            # FBClient facade and ActionContext contract
├── e2ee/            # Noise, Signal, WA-binary, protobuf, media crypto internals
├── models/          # Public and internal domain models
├── repositories/    # Session persistence
├── services/        # Auth/CAT bridge, gateway, ICDC, E2EE, media, thread services
├── types/           # Advanced utility types and external module declarations
└── utils/           # Logger and conversion helpers
```

### Runtime Layers

- **`core/`** exposes `FBClient`, wires dependencies, and defines `ActionContext`, the narrow state/service interface actions use.
- **`controllers/`** owns connected runtime state: FCA API instance, E2EE socket, DGW socket, active `DeviceStore`, upload config, event mapping, retry manager, and prekey maintenance.
- **`actions/`** contains operation-level behavior. Messaging, media, thread, and user actions receive `ActionContext` instead of reaching directly into controller internals.
- **`services/`** wraps external/platform concerns such as appState login, Facebook gateway calls, media upload config, ICDC registration, and the E2EE facade.
- **`models/` and `types/`** hold the public API shapes and shared TypeScript utility/external declarations.

### E2EE Internals

The `src/e2ee/` subtree is split by protocol responsibility:

- **`application/`**: `E2EEClient`, retry manager, prekey maintenance loop, outbound retry cache, and JID fanout helpers.
- **`store/`**: `DeviceStore`, JSON schema migration helpers, and file repository logic for persisting cryptographic state.
- **`transport/`**: Noise socket handshake, WA-binary encoder/decoder, WA stanza management, and optional DGW socket.
- **`signal/`**: Bridge to `@signalapp/libsignal-client` for Signal sessions, prekeys, and sender-key group cipher helpers.
- **`message/`**: `ProtoWriter`, client/consumer/application transport builders, and protobuf codecs/schemas for text, reactions, edits, media metadata, etc.
- **`media/` and `facebook/`**: Media crypto/upload logic and Facebook-specific protocol helpers such as SKMSG, SKDM, and ICDC.

Legacy `src/e2ee/*.ts` shim files still re-export the split modules for backward compatibility with older integrations.

---

## Data Flows

### The Receive Path

When a message arrives over the websocket, it undergoes a complex decryption and decoding pipeline:

1. **Noise Decryption:** `FacebookE2EESocket` decrypts incoming Noise frames.
2. **WA-Binary Unmarshalling:** `ClientController` unmarshals the decrypted payload into WA-binary nodes.
3. **Routing:** `E2EEHandler` ACKs and routes the message.
4. **Processing & Decrypting:** `E2EEHandler` processes participant SKDM (Sender Key Distribution Messages) or direct participant payloads. It then decrypts the underlying `msg`, `pkmsg` (PreKey Message), or `skmsg` (Sender Key Message).
5. **Decoding Protobufs:** The decrypted bytes are passed to the protobuf decoders to extract text, media metadata, reactions, etc.
6. **Emission:** Normalized events (like `e2ee_message`) are emitted to the public API.

**Failure Handling:** If decryption fails (e.g., missing keys), a retryable error occurs. FME emits an `error` event and immediately sends an E2EE retry receipt (`receipt type="retry"`) back to the sender, rather than terminating the listener loop.

### The Send Path

Sending messages branches depending on the target type:

**Direct Messages (DMs):**
- Build a `MessageTransport`.
- Establish or fetch Signal sessions with the target device(s).
- Fan out encrypted device payloads (encrypt the message for each of the recipient's registered devices).

**Groups:**
- Fetch the list of group participants and their active devices.
- Build a group `skmsg`.
- Distribute the `skdm` (Sender Key) to devices through the `<participants>` node.
- Include `phash`, `franking`, and `trace` nodes required by Messenger.

**Action Dispatch:**
Public `FBClient` methods delegate to `ClientController`, which builds an `ActionContext` and calls the relevant domain action. Actions use services and E2EE internals through that context, then hand encoded frames to the active E2EE socket.

**Outbound Caching:**
Outgoing E2EE payloads are briefly cached by the `OutboundMessageCache`. If the recipient fails to decrypt the message, they will send a `receipt type="retry"`. The `E2EERetryManager` uses this cache to immediately respond with a re-encrypted message to the requesting device without requiring the sender to regenerate the payload.
