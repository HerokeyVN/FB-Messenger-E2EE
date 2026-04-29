/**
 * E2EE Client - Layer orchestrator
 *
 * Ties together all E2EE layers:
 *   - DeviceStore (key persistence)
 *   - Signal Manager (DM + Group encryption)
 *   - Message Builder (protobuf)
 *   - Media Crypto (AES-CBC + HMAC + HKDF)
 *   - Media Upload (HTTP)
 *   - Noise Handshake (transport) - used by connection layer
 *
 * This replaces the stub E2EEService for actual E2EE message handling.
 */

import type { DeviceStore } from "./device-store.ts";
import type { MediaTypeKey } from "./media-crypto.ts";
import { encryptMedia, decryptMedia } from "./media-crypto.ts";
import {
  encryptDM,
  decryptDM,
  decryptDMPreKey,
  encryptGroup,
  decryptGroup,
  createSenderKeyDistributionMessage,
  processSKDM,
  establishSession,
  jidToAddress,
} from "./signal-manager.ts";
import type {
  E2EEDecryptMediaOptions,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EESendTextOptions,
  E2EESendTextResult,
  EncryptionResult,
  MediaFields,
} from "../models/e2ee.ts";
export type {
  E2EEDecryptMediaOptions,
  E2EEEncryptMediaOptions,
  E2EEEncryptMediaResult,
  E2EESendTextOptions,
  E2EESendTextResult,
  EncryptionResult,
  MediaFields,
};
import {
  encodeMessageApplication,
  encodeMessageTransport,
  MessageBuilder,
  encodeTextMessage,
  encodeImageMessage,
  encodeVideoMessage,
  encodeAudioMessage,
  encodeDocumentMessage,
  encodeStickerMessage,
  encodeReactionMessage,
  encodeEditMessage,
  encodeRevokeMessage,
} from "./message-builder.ts";
import type { RawPreKeyBundle } from "../models/e2ee.ts";
import type { MediaUploadConfig, MmsTypeStr } from "../models/media.ts";
import { uploadMedia } from "./media-upload.ts";
import { MmsType } from "./media-crypto.ts";

// Types


// E2EEClient

export class E2EEClient {
  private store: DeviceStore;

  constructor(store: DeviceStore) {
    this.store = store;
  }

  // Session management

  /** Establish a session with a contact using their prekey bundle (X3DH). */
  async establishSession(recipientJid: string, bundle: RawPreKeyBundle): Promise<void> {
    const addr = jidToAddress(recipientJid);
    await establishSession(this.store, addr, bundle);
  }

  async processSenderKeyDistribution(
    senderJid: string,
    skdmBytes: Buffer,
    groupJid?: string,
  ): Promise<void> {
    await processSKDM(this.store, senderJid, skdmBytes, groupJid);
  }

  // Message encrypt (DM)

  /**
   * Build and encrypt a DM text message for Signal transport.
   * Returns the plaintext MessageTransport bytes and frankingTag.
   */
  async encryptDMText(opts: E2EESendTextOptions): Promise<Extract<EncryptionResult, { type: "dm" }>> {
    const builder = new MessageBuilder().setText(opts.text);
    if (opts.replyToId && opts.replyToSenderJid) {
      builder.setReply(opts.replyToId, opts.replyToSenderJid);
    }
    const consumerApp = builder.build();
    const { messageApp, frankingTag } = encodeMessageApplication(consumerApp, builder.getReply());
    const transport = encodeMessageTransport({ messageApp });

    const recipientAddr = jidToAddress(opts.toJid);
    const selfAddr = jidToAddress(opts.selfJid);
    const encrypted = await encryptDM(this.store, recipientAddr, selfAddr, transport);

    return {
      type: "dm",
      encrypted: { type: encrypted.type, ciphertext: Buffer.from(encrypted.ciphertext) },
      frankingTag,
    };
  }

  /** Build and encrypt a group text message. */
  async encryptGroupText(
    groupJid: string,
    selfJid: string,
    text: string,
    replyToId?: string,
    replyToSenderJid?: string
  ): Promise<Extract<EncryptionResult, { type: "group" }>> {
    const builder = new MessageBuilder().setText(text);
    if (replyToId && replyToSenderJid) {
      builder.setReply(replyToId, replyToSenderJid);
    }
    const consumerApp = builder.build();
    const { messageApp, frankingTag } = encodeMessageApplication(consumerApp, builder.getReply());

    const { skdm, distributionId } = await createSenderKeyDistributionMessage(this.store, groupJid, selfJid);

    const transport = encodeMessageTransport({
      messageApp,
      skdm: { groupId: groupJid, skdmBytes: Buffer.from(skdm.serialize()) },
    });

    const groupCiphertext = await encryptGroup(this.store, groupJid, selfJid, transport);

    return {
      type: "group",
      groupCiphertext: Buffer.from(groupCiphertext),
      skdm: {
        groupId: groupJid,
        skdmBytes: Buffer.from(skdm.serialize()),
        distributionId,
      },
      frankingTag,
    };
  }

  // Message decrypt

  /** Decrypt a DM Signal message (type = "msg"). Returns raw MessageTransport bytes. */
  async decryptDMMessage(senderJid: string, ciphertext: Buffer): Promise<Buffer> {
    const addr = jidToAddress(senderJid);
    return decryptDM(this.store, addr, ciphertext);
  }

  /** Decrypt a DM PreKeySignalMessage (first message from sender). */
  async decryptDMPreKeyMessage(senderJid: string, selfJid: string, ciphertext: Buffer): Promise<Buffer> {
    const senderAddr = jidToAddress(senderJid);
    const selfAddr = jidToAddress(selfJid);
    return decryptDMPreKey(this.store, senderAddr, selfAddr, ciphertext);
  }

  async decryptGroupMessage(
    senderJid: string,
    ciphertext: Buffer,
    groupJid?: string,
  ): Promise<Buffer> {
    return decryptGroup(this.store, senderJid, ciphertext, groupJid);
  }

  // Media

  /** Encrypt media bytes for upload. Returns crypto fields + uploadable buffer. */
  encryptMedia(data: Buffer, type: MediaTypeKey) {
    return encryptMedia(data, type);
  }

  /** Decrypt downloaded E2EE media. */
  decryptMedia(opts: E2EEDecryptMediaOptions): Buffer {
    return decryptMedia(opts);
  }

  /**
   * Encrypt + upload media in one step.
   * Returns all fields needed to build a ConsumerApplication media message.
   */
  async encryptAndUploadMedia(
    uploadConfig: MediaUploadConfig,
    data: Buffer,
    type: MediaTypeKey,
    mimeType: string,
  ): Promise<E2EEEncryptMediaResult> {
    const mmsTypeStr = MmsType[type] as MmsTypeStr;
    const encrypted = encryptMedia(data, type);
    const uploaded = await uploadMedia(uploadConfig, encrypted.dataToUpload, encrypted.fileEncSHA256, mmsTypeStr);

    return {
      mediaKey: encrypted.mediaKey,
      fileSHA256: encrypted.fileSHA256,
      fileEncSHA256: encrypted.fileEncSHA256,
      fileLength: encrypted.fileLength,
      directPath: uploaded.directPath,
      mediaFields: {
        mimeType,
        fileSHA256: encrypted.fileSHA256,
        fileLength: encrypted.fileLength,
        mediaKey: encrypted.mediaKey,
        fileEncSHA256: encrypted.fileEncSHA256,
        directPath: uploaded.directPath,
      },
    };
  }

  // Message builder helpers (passthrough)

  buildTextMessage = encodeTextMessage;
  buildImageMessage = encodeImageMessage;
  buildVideoMessage = encodeVideoMessage;
  buildAudioMessage = encodeAudioMessage;
  buildDocumentMessage = encodeDocumentMessage;
  buildStickerMessage = encodeStickerMessage;
  buildReactionMessage = encodeReactionMessage;
  buildEditMessage = encodeEditMessage;
  buildRevokeMessage = encodeRevokeMessage;
  buildMessageApplication = encodeMessageApplication;
  buildMessageTransport = encodeMessageTransport;
}
