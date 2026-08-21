# Media Handling

This section details how to send E2EE encrypted media (images, videos, audio, and files).

---

## Single Media Helpers

The library provides dedicated helpers to encrypt, upload, and send E2EE media for **one-to-one** Messenger E2EE chats. 

> [!WARNING]
> Group E2EE media sending is not fully implemented in standard Messenger E2EE flows yet. These APIs are primarily for Direct Messages.

MIME types are automatically inferred from the `fileName` when omitted.

### `sendImage`
```typescript
await client.sendImage({
  threadId: "1234567890.0@msgr",
  data: imageBuffer, // A Buffer containing the image bytes
  fileName: "image.jpg",
  caption: "Look at this photo!",
});
```

### `sendVideo` / `sendAudio` / `sendFile`
The signature is identical to `sendImage`, but they construct the protobuf payload with the appropriate attachment type.

```typescript
await client.sendAudio({
  threadId: "1234567890.0@msgr",
  data: audioBuffer,
  fileName: "voice_note.mp4",
  ptt: true, // Send as a Push-To-Talk voice note
});
```

---

## Multiple Media: `sendFiles`

`sendFiles` allows you to send multiple files/attachments in a single function call.

```typescript
await client.sendFiles({
  threadId: "1234567890.0@msgr",
  caption: "Here are the requested documents.",
  attachments: [
    { data: imageBuffer, fileName: "photo.jpg" },
    { data: pdfBuffer, fileName: "document.pdf" }
  ]
});
```

### Important Transport Differences

The behavior of `sendFiles` differs depending on whether the target thread is E2EE or not:

- **Non-E2EE threads**: Bundles all files into a single Messenger message containing multiple attachments. Returns a single result object.
- **E2EE threads**: The Messenger E2EE transport protocol **does not support multi-attachment payloads** in a single encrypted frame. Therefore, the attachments are sent sequentially as separate encrypted messages. 
  - Optional fields like `caption` and `replyToMessageId` are only applied to the **first** attachment.
  - Returns an array of result objects (one per attachment).

### **SendMultipleMediaInput**

| Field | Type | Description |
|---|---|---|
| `threadId` | `string` | The target thread identifier. |
| `attachments` | `SendAttachmentItem[]` | An array of attachment objects to send. |
| `caption` | `string` | Optional caption. Applied to the bundled message for non-E2EE, or to the first attachment for E2EE. |
| `replyToMessageId` | `string` | Optional message ID to reply to. |

### **SendAttachmentItem**

| Field | Type | Description |
|---|---|---|
| `data` | `Buffer` | The raw file bytes. |
| `fileName` | `string` | The filename. |
| `mimeType` | `string` | Optional MIME type (inferred from filename extension if omitted). |
| `width` | `number` | Optional width in pixels (for images/videos). |
| `height` | `number` | Optional height in pixels (for images/videos). |
| `seconds` | `number` | Optional duration in seconds (for videos/audios). |
| `ptt` | `boolean` | Optional flag indicating if audio should be sent as a voice note (push-to-talk). |
