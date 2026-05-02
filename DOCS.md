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
| `sessionStorePath` | `string` | Optional path for non-E2EE session metadata. |
| `platform` | `"facebook" \| "messenger"` | Login platform hint. Defaults to `"facebook"`. |

---

## Lifecycle

### `connect()`

Initializes the `fca-unofficial` bridge, configures the non-E2EE API, stores session metadata when configured, and starts the normal Messenger listener.

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

Stops heartbeats, periodic prekey maintenance, DGW/E2EE sockets, and the FCA listener.

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

A group `skmsg` needs a matching local `sender_keys` record. If the local sender key for a group/sender is truly missing, the client cannot derive it locally. It must receive a fresh SKDM from the sender/group. The receive path processes SKDM from participant nodes and stores sender-key records automatically.

---

## Messaging

### `sendMessage(input: SendMessageInput)`

Sends a text message. When E2EE is connected and the thread ID looks like an E2EE user/group JID, the controller routes through the E2EE path; otherwise it uses FCA.

```typescript
await client.sendMessage({
  threadId: "1234567890",
  text: "hello",
  replyToMessageId: "optional-message-id",
});
```

**SendMessageInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | User ID, `@msgr` JID, or group JID. |
| `text` | `string` | Message body. |
| `replyToMessageId` | `string` | Optional replied message ID. |

E2EE failures are not downgraded to plaintext FCA sends.

### `sendReaction(input: SendReactionInput)`

```typescript
await client.sendReaction({
  threadId: "1234567890",
  messageId: "mid...",
  reaction: "👍",
});
```

### `unsendMessage(messageId: string)`

Un-sends a message you previously sent.

### `sendTyping(input: TypingInput)`

```typescript
await client.sendTyping({ threadId: "1234567890", isTyping: true });
```

### `markAsRead(input: MarkReadInput)`

```typescript
await client.markAsRead({ threadId: "1234567890" });
```

---

## Media Handling

### `sendImage` / `sendVideo` / `sendAudio` / `sendFile`

```typescript
await client.sendImage({
  threadId: "1234567890",
  data: imageBuffer,
  fileName: "image.jpg",
  mimeType: "image/jpeg",
  caption: "optional caption",
});
```

Current note: E2EE media send is still incomplete in the architecture notes; plain media helpers delegate to the existing media service.

### `sendSticker(input: SendStickerInput)`

```typescript
await client.sendSticker({ threadId: "1234567890", stickerId: 123 });
```

### `downloadMedia(input: DownloadMediaInput)`

Downloads raw bytes from a Facebook CDN URL.

```typescript
const bytes = await client.downloadMedia({ url });
```

---

## Thread & Group Management

- `createThread(input: { userId: string })`
- `addGroupMember(input)`
- `removeGroupMember(input)`
- `renameThread(input: { threadId: string; newName: string })`
- `setGroupPhoto(input)`
- `changeAdminStatus(input)`
- `muteThread(input: { threadId: string; muteSeconds: number })`
- `deleteThread(input: { threadId: string })`
- `searchUsers(input: { query: string })`
- `getUserInfo(input: { userId: string })`
- `getThreadList(input)`
- `getThreadHistory(input)`
- `forwardAttachment(input)`
- `createPoll(input)`
- `editMessage(input)`
- `getFriendsList()`

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
  console.log(msg.chatJid, msg.senderJid, msg.text);
});
```

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

### Receive path

1. `FacebookE2EESocket` decrypts Noise frames.
2. `ClientController` unmarshals WA-binary nodes.
3. `E2EEHandler` ACKs, processes participant SKDM, decrypts `msg` / `pkmsg` / `skmsg`, decodes protobuf payloads, and emits normalized events.
4. Decrypt failures emit an `error` event rather than terminating the listener loop.

### Send path

- DM: build MessageTransport, establish/fetch sessions when needed, fan out encrypted device payloads.
- Group: fetch participants/devices, build group `skmsg`, distribute `skdm` to devices through `<participants>`, include `phash`, `franking`, and `trace` nodes.

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
