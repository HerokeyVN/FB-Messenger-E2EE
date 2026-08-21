# Event Handling

`fb-messenger-e2ee` provides a robust event emitter that exposes all inbound data from the Noise websocket, including messages, reactions, receipts, and system events.

---

## Catch-All Listener

You can listen to all incoming events using the catch-all listener. This is useful for logging or debugging.

```typescript
client.onEvent((event) => {
  console.log(`Received event type: ${event.type}`);
  console.log(`Event payload:`, event.data);
});
```

---

## Typed Listeners

For production apps, it is recommended to bind specific logic to typed events.

```typescript
client.onEvent("e2ee_message", (msg) => {
  console.log(`New message in ${msg.threadId} from ${msg.senderJid}: ${msg.text}`);
});

client.onEvent("error", (errorEvent) => {
  console.error("Client encountered an error:", errorEvent.message);
});
```

> [!NOTE]
> The `error` event is routed through the internal event emitter. This avoids Node's default behavior of crashing the process if an unhandled `error` event occurs when no typed error listener is registered.

---

## The `e2ee_message` Shape

The most common event you will handle is `e2ee_message`. The payload explicitly separates the *conversation identity* from the *sender device identity*.

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
    text: "Hello, secure world!",
    timestampMs: 1777694609888,
  },
}
```

### Event Payload Definitions

- **`threadId`**: The canonical conversation ID.
- **`chatJid`**: For DMs, this is `user.0@msgr`. For groups, it is the group JID (`group@g.us`).
- **`senderJid`**: The actual device JID of the sender. For example, `user.160@msgr` implies it was sent from device ID 160.
- **`isGroup`**: A boolean indicating if the message was sent in a group chat. Note that for group messages, `threadId` and `chatJid` represent the group, while `senderJid` remains the specific sender's device JID.
- **`kind`**: The normalized content kind (`text`, `image`, `reaction`, `edit`, etc.).

*Optional fields such as `attachments`, `mentions`, and `replyTo` are omitted from the payload when empty.*

---

## Common Event Types

Here is a list of events you can subscribe to:

- `message` (Non-E2EE fallback message)
- `messageEdit`
- `reaction`
- `typing`
- `message_unsend`
- `read_receipt`
- `presence`
- `e2ee_connected` (Fired when the Noise handshake succeeds)
- `e2ee_message` (Fired on a decrypted E2EE message)
- `e2ee_reaction`
- `e2ee_receipt`
- `disconnected`
- `reconnected`
- `ready`
- `raw` (Fired for raw protobuf frames)
- `error`
