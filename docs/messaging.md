# E2EE Messaging API

This section covers the core messaging APIs for sending and interacting with text messages in E2EE threads. 

> [!WARNING]
> All send APIs in this library require:
> 1. `await client.connect()`
> 2. `await client.connectE2EE(deviceStorePath, userId)`
> 3. An E2EE-capable thread identifier (e.g., `1234567890`, `1234567890.0@msgr`, or `180...@g.us`).

---

## E2EE Thread Identifiers (JIDs)

E2EE operations rely on specific Jabber IDs (JIDs). You can usually use the standard Facebook User ID (for DMs) or the Group ID (for groups), and the library will automatically format it.

- **DMs:** Numeric user ID (e.g., `1000123456789`) or `@msgr` JID (`1000123456789.0@msgr`).
- **Groups:** Group JID (`123456789012345@g.us`).

---

## `sendMessage(input)`

Sends an E2EE text message. There is no plaintext fallback; this goes strictly through the Signal Protocol/Noise websocket.

```typescript
const sent = await client.sendMessage({
  threadId: "1234567890.0@msgr",
  text: "Hello, secure world!",
  replyToMessageId: "optional-message-id",
});

console.log("Message sent with ID:", sent.messageId);
```

**SendMessageInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | Numeric user ID, `@msgr` JID, or group JID. |
| `text` | `string` | Message body. |
| `replyToMessageId` | `string` | Optional replied message ID. |

---

## `sendReaction(input)`

Sends an E2EE reaction (emoji) to a specific message.

> [!IMPORTANT]
> For group messages sent by someone else, you **must** pass the `senderJid` so the target `MessageKey` is encoded correctly.

```typescript
await client.sendReaction({
  threadId: "1805602490133470@g.us",
  messageId: "7456658723671758234",
  senderJid: "100042415119261.145@msgr",
  reaction: "👍",
});
```

**SendReactionInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | Target thread identifier. |
| `messageId` | `string` | The ID of the message to react to. |
| `senderJid` | `string` | Optional. The device JID of the person who sent the message you are reacting to (required for groups). |
| `reaction` | `string` | The emoji string. Send an empty string `""` to remove a reaction. |

---

## `unsendMessage(input)`

Un-sends (revokes) an E2EE message you previously sent.

```typescript
await client.unsendMessage({ 
  messageId: "7456658723671758234", 
  threadId: "1234567890.0@msgr" 
});
```

**UnsendMessageInput**

| Field | Type | Description |
|---|---|---|
| `messageId` | `string` | The exact 15+ digit message ID to revoke. |
| `threadId` | `string` | Highly recommended target thread identifier to ensure the E2EE client knows the destination JID. |
| `fromMe` | `boolean` | Optional flag indicating if the message was sent by you (defaults to `true`). |

---

## `editMessage(input)`

Edits the text of an E2EE message you previously sent.

```typescript
// 1. Send the original message
const sent = await client.sendMessage({ threadId: "1234567890.0@msgr", text: "oops" });
const messageId = sent.messageId as string;

// 2. Edit it later
await client.editMessage({
  threadId: "1234567890.0@msgr",
  messageId,
  newText: "corrected message",
});
```

**E2EEEditMessageInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | The thread ID containing the message. |
| `messageId` | `string` | The message ID to edit. |
| `newText` | `string` | The replacement text content. |

---

## `sendTyping(input)`

Sends E2EE chatstate (`composing` / `paused`) over the Noise socket. This shows the typing bubble to the other user.

```typescript
// Start typing
await client.sendTyping({ threadId: "1234567890.0@msgr", isTyping: true });

// Wait 5 seconds...
await new Promise(resolve => setTimeout(resolve, 5000));

// Stop typing
await client.sendTyping({ threadId: "1234567890.0@msgr", isTyping: false });
```
