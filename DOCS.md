# FME - FB Messenger E2EE Documentation

This document provides API reference and operational notes for the `FME - FB Messenger E2EE` library.

---

## Core: `FBClient`

`FBClient` is the main public entry point.

### Constructor

```typescript
new FBClient(options: ClientOptions)
```

**ClientOptions**

| Option | Type | Description |
|---|---|---|
| `appStatePath` | `string` | Path to Facebook appState/cookies JSON. |
| `appState` | `any[] \| string` | Optional in-memory appState alternative. |
| `sessionStorePath` | `string` | Optional path for login/session metadata used by E2EE bootstrap. |
| `platform` | `"facebook" \| "messenger"` | Login platform hint. Defaults to `"facebook"`. |

---

## Lifecycle

### `connect()`

Initializes the minimal `fca-unofficial` login bridge required for appState auth/CAT bootstrap and stores session metadata when configured. It does **not** expose or start plaintext/non-E2EE messaging/listening.

```typescript
const { userId } = await client.connect();
```

Returns `Promise<{ userId: string }>`.

### `connectE2EE(deviceStorePath: string, userId: string)`

Enables the E2EE Noise/Signal stream. Must be called after `connect()`.

```typescript
await client.connectE2EE("./device-store.json", userId);
```

Behavior:

1. Loads the existing `DeviceStore` if `deviceStorePath` exists, otherwise creates one.
2. Registers through ICDC only when the store has no `jid_device` yet.
3. Performs the Noise handshake with the E2EE websocket.
4. Sends presence/priming/passive-state nodes.
5. Runs startup prekey sync and starts periodic prekey maintenance.
6. Optionally connects DGW if DGW env settings are enabled.

### `disconnect()`

Stops heartbeats, periodic prekey maintenance, DGW/E2EE sockets, and the internal auth bridge.

---

## Device Store & Key Maintenance

`device-store.json` is the long-lived E2EE device identity and cryptographic state. Keep it persistent between restarts.

### Important fields

| Field | Purpose | Rotate automatically? |
|---|---|---|
| `noise_key_priv` | Noise handshake private key | No |
| `identity_key_priv` | Signal identity private key | No |
| `registration_id` | Signal registration ID | No |
| `adv_secret_key` | Messenger/WA companion secret | No |
| `facebook_uuid` | ICDC device UUID | No |
| `jid_user`, `jid_device` | Registered Messenger E2EE device JID | No |
| `pre_keys` | Local one-time prekey records | Yes, by upload/refill |
| `signed_pre_keys` / `signed_pre_key_id` | Signed prekey records | Yes, when uploading fresh prekeys |
| `sessions` | Signal sessions with devices | Updated by libsignal |
| `sender_keys` | Group sender-key state from SKDM | Updated when SKDM is received |

Do **not** delete the entire device store just because listening stops. Deleting it forces new device registration and loses sessions/sender keys. Prefer reconnecting and letting the prekey maintenance refill server-side prekeys.

### Automatic prekey maintenance

The controller checks server-side one-time prekey count after E2EE connect and then periodically.

| Env | Default | Description |
|---|---:|---|
| `FB_E2EE_PREKEY_SYNC_INTERVAL_MS` | `1800000` | Periodic prekey sync interval in milliseconds. Set `0` to disable. |
| `FB_E2EE_PREKEY_MIN_COUNT` | `5` | Minimum server prekey count before refill. |
| `FB_E2EE_PREKEY_UPLOAD_COUNT` | `50` | Number of fresh prekeys uploaded per refill. |

This refresh does not change the registered device identity. It only generates/uploads fresh one-time prekeys and a current signed prekey under the existing identity.

### Group sender-key caveat

A group `skmsg` needs a matching local `sender_keys` record. If the local sender key for a group/sender is truly missing, the client cannot derive it locally. On retryable decrypt failures, the receive path sends a `receipt type="retry"` with registration/key material to ask the sender/server to resend enough data to rebuild the session/SKDM. When a fresh SKDM arrives, it is processed and stored automatically. For messages sent by this client, a short in-memory retry cache stores the encrypted app payload/franking tag so incoming retry receipts can be answered with a targeted retry message and fresh SKDM without re-registering the device.

---

## E2EE-only public API

This package no longer delegates plaintext/non-E2EE actions to `fca-unofficial`.
Use this package for Messenger E2EE only; use `fca-unofficial` directly in your app for classic/non-E2EE messaging, thread management, history, polls, etc.

All send APIs require:

1. `await client.connect()`
2. `await client.connectE2EE(deviceStorePath, userId)`
3. an E2EE-capable thread identifier (`1234567890`, `1234567890.0@msgr`, or `180...@g.us`)

### `sendMessage(input: SendMessageInput)`

Sends an E2EE text message. There is no plaintext FCA fallback.

```typescript
const sent = await client.sendMessage({
  threadId: "1234567890.0@msgr",
  text: "hello",
  replyToMessageId: "optional-message-id",
});
console.log(sent.messageId);
```

**SendMessageInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | Numeric user ID, `@msgr` JID, or group JID. |
| `text` | `string` | Message body. |
| `replyToMessageId` | `string` | Optional replied message ID. |

### `sendReaction(input: SendReactionInput)`

Sends an E2EE reaction. For group messages from someone else, pass `senderJid` so the target `MessageKey` is encoded correctly.

```typescript
await client.sendReaction({
  threadId: "1805602490133470@g.us",
  messageId: "7456658723671758234",
  senderJid: "100042415119261.145@msgr",
  reaction: "👍",
});
```

### `unsendMessage(messageId: string, threadId?: string)`

Un-sends/revokes an E2EE message you previously sent. Pass `threadId` unless the original send result is still in the short outbound cache.

```typescript
await client.unsendMessage(sent.messageId, "1234567890.0@msgr");
```

### `sendTyping(input: TypingInput)`

Sends E2EE chatstate (`composing` / `paused`) over the Noise socket.

```typescript
await client.sendTyping({ threadId: "1234567890.0@msgr", isTyping: true });
await new Promise(resolve => setTimeout(resolve, 5000));
await client.sendTyping({ threadId: "1234567890.0@msgr", isTyping: false });
```

---

## E2EE Media Handling

### `sendImage` / `sendVideo` / `sendAudio` / `sendFile`

These helpers encrypt, upload, and send E2EE media for one-to-one Messenger E2EE chats. MIME type is inferred from `fileName` when omitted. Group E2EE media send is not implemented yet.

```typescript
await client.sendImage({
  threadId: "1234567890.0@msgr",
  data: imageBuffer,
  fileName: "image.jpg",
  caption: "optional caption",
});
```

---

## Event Handling

### Catch-all listener

```typescript
client.onEvent((event) => {
  console.log(event.type, event.data);
});
```

### Typed listener

```typescript
client.onEvent("e2ee_message", (msg) => {
  console.log(msg.threadId, msg.chatJid, msg.senderJid, msg.kind, msg.text);
});
```

### E2EE message event shape

`e2ee_message` uses `type + data` like other events, but `data` separates conversation identity from sender device identity:

```typescript
{
  type: "e2ee_message",
  data: {
    id: "7456191609143713633",
    threadId: "100042415119261",
    chatJid: "100042415119261.0@msgr",
    senderJid: "100042415119261.160@msgr",
    senderId: "100042415119261",
    senderDeviceId: 160,
    isGroup: false,
    kind: "text",
    text: "Hehe",
    timestampMs: 1777694609888,
  },
}
```

For group messages, `threadId` and `chatJid` stay as the group JID, while `senderJid` remains the actual sender device JID. Optional fields such as `attachments`, `mentions`, and `replyTo` are omitted when empty.

Common event types:

- `message`
- `messageEdit`
- `reaction`
- `typing`
- `message_unsend`
- `read_receipt`
- `presence`
- `e2ee_connected`
- `e2ee_message`
- `e2ee_reaction`
- `e2ee_receipt`
- `disconnected`
- `reconnected`
- `ready`
- `raw`
- `error`

`error` is also routed through the catch-all `event` channel. The internal emitter avoids Node's unhandled `error` event crash when no typed error listener is registered.

---

## E2EE Technical Details

### Internal module layout

- `src/e2ee/application`: `E2EEClient`, retry manager, prekey maintenance, outbound retry cache, fanout/JID helpers.
- `src/e2ee/store`: `DeviceStore`, JSON schema/migration helpers, file repository.
- `src/e2ee/transport`: Noise socket/handshake, WA-binary encoder/decoder/stanzas, optional DGW socket.
- `src/e2ee/signal`: Signal sessions, prekeys, sender-key group cipher helpers.
- `src/e2ee/message`: `ProtoWriter`, client/consumer/application/transport builders, protobuf codecs/schemas.
- `src/e2ee/media` and `src/e2ee/facebook`: media crypto/upload and Facebook-specific protocol helpers.

Legacy `src/e2ee/*.ts` shim files still re-export the new modules for compatibility.

### Receive path

1. `FacebookE2EESocket` decrypts Noise frames.
2. `ClientController` unmarshals WA-binary nodes.
3. `E2EEHandler` ACKs, processes participant SKDM/direct participant payloads, decrypts `msg` / `pkmsg` / `skmsg`, decodes protobuf payloads, and emits normalized events.
4. Retryable decrypt failures emit an `error` event and send an E2EE retry receipt rather than terminating the listener loop.

### Send path

- DM: build MessageTransport, establish/fetch sessions when needed, fan out encrypted device payloads.
- Group: fetch participants/devices, build group `skmsg`, distribute `skdm` to devices through `<participants>`, include `phash`, `franking`, and `trace` nodes.
- Outgoing E2EE payloads are cached briefly by `OutboundMessageCache`; `E2EERetryManager` uses that cache to respond to `receipt type="retry"` without re-registering the device.

### Requirements

- A valid `appState` / cookies file.
- A persistent device store JSON.
- No plaintext fallback for E2EE send failures.

---

## Environment Variables

| Env | Default | Description |
|---|---|---|
| `FB_APPSTATE_PATH` | `./data/appstate.json` | AppState/cookies path used by env helpers/examples. |
| `FB_SESSION_STORE_PATH` | `./data/session.json` | Non-E2EE session metadata path. |
| `FB_PLATFORM` | `facebook` | Platform hint. |
| `DEBUG` / `NODE_ENV=development` | off | Enables debug logger output. |
| `FB_E2EE_PREKEY_SYNC_INTERVAL_MS` | `1800000` | Periodic E2EE prekey sync interval. |
| `FB_E2EE_PREKEY_MIN_COUNT` | `5` | Minimum server prekey count before refill. |
| `FB_E2EE_PREKEY_UPLOAD_COUNT` | `50` | Fresh prekeys uploaded per refill. |
| `FB_DGW_ENABLE` | unset | Enables optional DGW connection when set to `1`. |

---

## Manual Scripts

```bash
bun run tests/script/echo-e2ee.ts
```

The echo script keeps the process alive by default. Set `ECHO_EXIT_AFTER_MS` to auto-exit for short manual tests.

---

## Support

For bugs and feature requests, please open an issue in the repository.
