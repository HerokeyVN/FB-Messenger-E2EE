# FME - FB Messenger E2EE

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black.svg)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**FME - FB Messenger E2EE** is a high-performance, modular TypeScript library designed to bring robust **End-to-End Encryption (E2EE)** to Facebook Messenger. Built on top of the next-generation **Direct Gateway (DGW)** architecture and the **Signal Protocol**, it provides a premium developer experience for building secure messaging tools.

---

## Key Features

- **Native E2EE**: Full implementation of the Signal Protocol for Messenger's end-to-end encrypted chats.
- **DGW Architecture**: Native support for Facebook's LightSpeed/DGW socket protocol.
- **Modular Design**: Clean MVC-inspired architecture with specialized handlers for Events, DGW, and E2EE.
- **Type Safety**: First-class TypeScript support with strict typing for all protocol models.
- **High Performance**: Optimized for speed and low memory footprint using `bun` and `libsignal-client`.
- **Extensible**: Easily add new features or custom handlers to the modular core.

---

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Encryption**: [@signalapp/libsignal-client](https://github.com/signalapp/libsignal-client)
- **Protocol**: [ProtobufJS](https://github.com/protobufjs/protobuf.js)
- **Base Bridge**: [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial)

---

## Getting Started

### 1. Installation

```bash
bun add fme-fb-messenger-e2ee
```

### 2. Basic Usage

```typescript
import { FBClient } from "fme-fb-messenger-e2ee";

const client = new FBClient({
  appStatePath: "./appstate.json",
  sessionStorePath: "./session.json", // Optional
  platform: "facebook"
});

// 1. Connect to Facebook
await client.connect();

// 2. Enable E2EE (Required for encrypted chats)
await client.connectE2EE("./device-store.json", client.userId);

// 3. Listen for events
client.onEvent("message", (event) => {
  console.log(`Received message from ${event.senderID}: ${event.body}`);
  
  if (event.isGroup) {
    console.log(`Group: ${event.threadID}`);
  }
});

// 4. Send an E2EE message
await client.sendMessage({
  body: "Hello from the secure side!",
  threadID: "1234567890"
});
```

---

## Project Structure

```text
src/
├── controllers/    # Orchestration logic (ClientController)
├── core/           # Main entry point (FBClient)
├── e2ee/           # Signal Protocol & DGW Handlers
├── models/         # TypeScript interfaces & domain models
├── services/       # Business logic (Auth, Messaging, Media)
├── repositories/   # Data persistence (Session, Device Store)
└── utils/          # Protocol helpers (Noise, WA-Binary)
```

---

## Testing

The project uses [Jest](https://jestjs.io/) for unit testing.

```bash
# Run all tests
bun test

# Run with experimental VM modules (Required for ESM)
NODE_OPTIONS='--experimental-vm-modules' npx jest
```

---

## Documentation

For full API reference, check the [DOCS.md](./DOCS.md) file.

---

## Acknowledgements

Special thanks to the [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) team for the foundational bridge work.

---

## License

MIT © [VangBanLaNhat](https://github.com/VangBanLaNhat)
