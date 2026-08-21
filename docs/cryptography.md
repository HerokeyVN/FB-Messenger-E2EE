# Cryptography & Key Maintenance

Unlike plaintext messaging, Messenger E2EE requires persistent cryptographic keys to establish and maintain secure Signal Protocol sessions.

---

## The Device Store

`device-store.json` contains your long-lived E2EE device identity and cryptographic state. **You must keep it persistent between restarts.**

> [!CAUTION]
> Do **not** delete the entire device store just because listening stops or fails. Deleting it forces a brand-new device registration, causing you to lose all existing sessions and sender keys. Instead, prefer reconnecting and letting the automatic prekey maintenance refill server-side prekeys.

### Important Fields in the Device Store

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

---

## Automatic Prekey Maintenance

Signal Protocol requires "one-time prekeys" to establish new sessions asynchronously. FME automatically monitors and replenishes these keys on the server.

The controller checks the server-side one-time prekey count immediately after E2EE connect, and then periodically thereafter.

| Env | Default | Description |
|---|---:|---|
| `FB_E2EE_PREKEY_SYNC_INTERVAL_MS` | `1800000` | Periodic prekey sync interval in milliseconds. Set `0` to disable. |
| `FB_E2EE_PREKEY_MIN_COUNT` | `5` | Minimum server prekey count before refill. |
| `FB_E2EE_PREKEY_UPLOAD_COUNT` | `50` | Number of fresh prekeys uploaded per refill. |

> [!NOTE]
> This refresh **does not** change the registered device identity. It only generates and uploads fresh one-time prekeys (and a current signed prekey) under the existing device identity.

---

## Group Sender-Key Distribution (SKDM) Caveat

In group chats, Messenger uses the Sender Key protocol. A group `skmsg` (Sender Key Message) requires a matching local `sender_keys` record to decrypt.

**What happens if a key is missing?**
1. If the local sender key for a group/sender is truly missing, the client cannot derive it locally.
2. On retryable decrypt failures, the receive path automatically sends a `receipt type="retry"` to the sender.
3. This receipt asks the sender to re-transmit a Sender-Key Distribution Message (SKDM) containing the necessary key material.
4. When a fresh SKDM arrives, FME processes it and stores the new key in the `DeviceStore` automatically.

**What happens when *you* send a message?**
For messages sent by this client, a short in-memory retry cache stores the encrypted app payload and franking tag. 
If someone else's device requests a retry from you, FME answers the `receipt type="retry"` with a targeted retry message and a fresh SKDM, without needing to re-register your device.
