# FME - FB Messenger E2EE Documentation

This document provides a comprehensive API reference and usage guide for the `FME - FB Messenger E2EE` library.

---

## Core: FBClient

The `FBClient` class is the main entry point for the library.

### Constructor

```typescript
new FBClient(options: ClientOptions)
```

**ClientOptions:**
- `appStatePath`: Path to your Facebook AppState JSON file.
- `sessionStorePath`: (Optional) Path to store DGW session data.
- `platform`: (Optional) `"facebook"` or `"messenger"`.

---

## Lifecycle Management

### `connect()`
Initializes the base Facebook bridge and establishes the initial connection.
- **Returns:** `Promise<{ userId: string }>`

### `connectE2EE(deviceStorePath: string, userId: string)`
Enables End-to-End Encryption support. Must be called after `connect()`.
- **Arguments:**
  - `deviceStorePath`: Path to the Signal Protocol device store JSON.
  - `userId`: Your Facebook User ID.

### `disconnect()`
Gracefully shuts down all socket connections (DGW and MQTT).

---

## Messaging

### `sendMessage(input: SendMessageInput)`
Sends a text message. Automatically handles E2EE if the thread is encrypted.
- **Input Object:**
  - `body`: Message text.
  - `threadID`: Target User ID or Group ID.
  - `replyToMessageID`: (Optional) ID of message to reply to.

### `sendReaction(input: SendReactionInput)`
Sends a reaction to a specific message.
- **Input Object:**
  - `reaction`: Emoji string.
  - `messageID`: Target message ID.

### `unsendMessage(messageId: string)`
Un-sends (deletes for everyone) a message you previously sent.

### `sendTyping(input: TypingInput)`
Sends a typing indicator.
- **Input Object:**
  - `threadID`: Target thread.
  - `isTyping`: `true` to start, `false` to stop.

### `markAsRead(input: MarkReadInput)`
Marks a thread or specific message as read.

---

## Media Handling

### `sendImage` / `sendVideo` / `sendAudio` / `sendFile`
Sends media attachments.
- **Input Object:**
  - `attachment`: Buffer or ReadStream.
  - `threadID`: Target thread.

### `sendSticker(input: SendStickerInput)`
Sends a Messenger sticker by ID.

### `downloadMedia(input: DownloadMediaInput)`
Downloads raw bytes for a media attachment from a Facebook CDN URL.

---

## Thread & Group Management

### `createThread(input: CreateThreadInput)`
Creates a 1:1 thread with a user or retrieves an existing one.

### `addGroupMember(input: AddGroupMemberInput)`
Adds one or more users to a group chat.

### `removeGroupMember(input: RemoveGroupMemberInput)`
Removes a user from a group chat.

### `renameThread(input: RenameThreadInput)`
Changes the title of a group chat.

### `setGroupPhoto(input: SetGroupPhotoInput)`
Updates the group avatar/photo.

### `changeAdminStatus(input: ChangeAdminStatusInput)`
Promotes or demotes a group member's admin status.

### `muteThread(input: MuteThreadInput)`
Mutes notifications for a thread.
- `muteSeconds = -1`: Mute forever.
- `muteSeconds = 0`: Unmute.

---

## Event Handling

### `onEvent(listener: (event: MessengerEvent) => void)`
Listen for all incoming events.

### `onEvent(type: K, listener: (data: MessengerEventMap[K]) => void)`
Listen for specific event types (e.g., `"message"`, `"reaction"`, `"presence"`).

**Common Events:**
- `message`: New message received.
- `reaction`: New reaction added.
- `typ`: Typing status update.
- `presence`: User online/offline status.

---

## E2EE Technical Details

This library implements the **Signal Protocol** for Messenger's E2EE layer.

### Key Components:
- **Noise Handshake**: Used to establish the initial secure tunnel with the DGW.
- **PreKey Management**: Automatically handles the generation and uploading of Signal PreKeys.
- **DGW Socket**: Manages recursive payload unwrapping for LightSpeed messages.

### Requirements:
- A valid `appState` (cookies).
- A persistent `device-store.json` to maintain Signal session state across restarts.

---

## Support

For bugs and feature requests, please open an issue in the repository.
