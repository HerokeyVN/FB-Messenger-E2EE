# Getting Started & Lifecycle

This guide covers the installation, initialization, and connection lifecycles of the `FBClient` inside `fb-messenger-e2ee`.

---

## Installation

```bash
npm install fb-messenger-e2ee
# or
bun add fb-messenger-e2ee
```

---

## The `FBClient`

`FBClient` is the main public entry point for E2EE operations.

### Constructor

```typescript
import { FBClient } from "fb-messenger-e2ee";

const client = new FBClient(options: ClientOptions);
```

**ClientOptions**

| Option | Type | Description |
|---|---|---|
| `appStatePath` | `string` | Path to Facebook appState JSON (contains the active login cookies/session data). |
| `appState` | `any[] \| string` | Optional in-memory appState/cookies alternative (cookies string or array). |
| `sessionStorePath` | `string` | Optional path for login/session metadata used by E2EE bootstrap. |
| `platform` | `"facebook" \| "messenger"` | Login platform hint. Defaults to `"facebook"`. |

---

## Connection Lifecycle

E2EE messaging requires a two-step connection process.

### 1. `connect()`

Initializes the minimal auth bridge required for appState auth and CAT (Crypto Auth Token) bootstrap. It stores session metadata when configured. 
> [!NOTE]
> `connect()` does **not** expose or start plaintext/non-E2EE messaging or listening. It solely handles the authentication handshake necessary for E2EE.

```typescript
const { userId } = await client.connect();
```

**Returns:** `Promise<{ userId: string }>`

### 2. `connectE2EE(deviceStorePath, userId)`

Enables the E2EE Noise/Signal stream. **Must be called after `connect()`.**

```typescript
// deviceStorePath is a path to a JSON file (e.g., "./device-store.json")
await client.connectE2EE("./device-store.json", userId);
```

**What happens during `connectE2EE`?**
1. **Device Store:** Loads the existing `DeviceStore` if `deviceStorePath` exists; otherwise, it creates one.
2. **ICDC Registration:** Registers through ICDC only when the store has no `jid_device` yet.
3. **Noise Handshake:** Performs the Noise handshake with the Messenger E2EE websocket.
4. **Priming:** Sends presence, priming, and passive-state nodes to the server.
5. **Key Sync:** Runs startup prekey sync and begins periodic prekey maintenance.
6. **DGW (Optional):** Connects DGW if DGW environment settings are enabled.

### 3. `disconnect()`

Gracefully stops heartbeats, periodic prekey maintenance, DGW/E2EE sockets, and the internal auth bridge.

```typescript
await client.disconnect();
```

---

## Environment Variables

FME respects the following environment variables to control its behavior:

| Env | Default | Description |
|---|---|---|
| `FB_APPSTATE_PATH` | `./data/appstate.json` | AppState/cookies path used by env helpers/examples. |
| `FB_SESSION_STORE_PATH` | `./data/session.json` | Non-E2EE session metadata path. |
| `FB_PLATFORM` | `facebook` | Platform hint. |
| `DEBUG` / `NODE_ENV=development` | off | Enables debug logger output. |
| `FB_DGW_ENABLE` | unset | Enables optional DGW connection when set to `1`. |
