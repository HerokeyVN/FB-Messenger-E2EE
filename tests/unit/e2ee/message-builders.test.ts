import { describe, it, expect } from "@jest/globals";
import {
  decodeConsumerApplication,
  decodeImageTransport,
  decodeVideoTransport,
  decodeAudioTransport,
  decodeDocumentTransport,
  decodeStickerTransport,
  decodeMessageApplication,
  decodeMessageTransport,
  encodeClientPayload,
  encodeMessageApplication,
  encodeMessageTransport,
  encodeEditMessage,
  encodeReactionMessage,
  encodeTextMessage,
  encodeImageMessage,
  encodeVideoMessage,
  encodeAudioMessage,
  encodeDocumentMessage,
  encodeStickerMessage,
  encodeRevokeMessage,
  FB_CONSUMER_MESSAGE_VERSION,
  FB_MESSAGE_APPLICATION_VERSION,
} from "../../../src/e2ee/message/message-builder.ts";

describe("message builders", () => {
  it("encodes text consumer applications", () => {
    const decoded = decodeConsumerApplication(encodeTextMessage("hello"));

    expect(decoded.payload.content.messageText.text).toBe("hello");
  });

  it("encodes reaction consumer applications", () => {
    const decoded = decodeConsumerApplication(encodeReactionMessage("mid.1", "👍"));

    expect(decoded.payload.content.reactionMessage.text).toBe("👍");
    expect(decoded.payload.content.reactionMessage.key.ID).toBe("mid.1");
  });

  it("encodes E2EE group reaction message keys with remote JID and participant", () => {
    const decoded = decodeConsumerApplication(encodeReactionMessage("7456658723671758234", "👍", {
      remoteJid: "1805602490133470@g.us",
      fromMe: false,
      participant: "100042415119261.0@msgr",
      senderTimestampMs: 1777805979855,
    }));

    const reaction = decoded.payload.content.reactionMessage;
    expect(reaction.text).toBe("👍");
    expect(reaction.senderTimestampMS).toBe("1777805979855");
    expect(reaction.key).toMatchObject({
      remoteJID: "1805602490133470@g.us",
      fromMe: false,
      ID: "7456658723671758234",
      participant: "100042415119261.0@msgr",
    });
  });

  it("encodes edit consumer applications", () => {
    const decoded = decodeConsumerApplication(encodeEditMessage("mid.1", "new text"));

    expect(decoded.payload.content.editMessage.key.ID).toBe("mid.1");
    expect(decoded.payload.content.editMessage.message.text).toBe("new text");
  });



  const media = {
    mimeType: "image/png",
    fileSHA256: Buffer.alloc(32, 1),
    fileLength: 12345,
    mediaKey: Buffer.alloc(32, 2),
    fileEncSHA256: Buffer.alloc(32, 3),
    directPath: "/mms/direct-path",
    caption: "hello media",
    width: 640,
    height: 480,
    seconds: 9,
    ptt: true,
    fileName: "file.pdf",
    objectId: "object-123",
    mediaKeyTimestamp: 1710000000,
  };

  it("encodes image messages using the image oneof and nested WAMediaTransport", () => {
    const decoded = decodeConsumerApplication(encodeImageMessage(media));
    const image = decoded.payload.content.imageMessage;
    const transport = decodeImageTransport(image.image.payload);
    const common = transport.integral.transport;

    expect(image.caption.text).toBe("hello media");
    expect(image.image.version).toBe(1);
    expect(common.integral.fileSHA256).toEqual(media.fileSHA256);
    expect(common.integral.mediaKey).toEqual(media.mediaKey);
    expect(common.integral.fileEncSHA256).toEqual(media.fileEncSHA256);
    expect(common.integral.directPath).toBe(media.directPath);
    expect(common.integral.mediaKeyTimestamp).toBe(media.mediaKeyTimestamp);
    expect(common.ancillary.mimetype).toBe("image/png");
    expect(common.ancillary.fileLength).toBe(media.fileLength);
    expect(common.ancillary.objectID).toBe("object-123");
    expect(common.ancillary.thumbnail).toMatchObject({ thumbnailWidth: 640, thumbnailHeight: 480 });
    expect(transport.ancillary).toMatchObject({ width: 640, height: 480 });
    expect(decoded.payload.content.contactMessage).toBeUndefined();
  });

  it("encodes video messages using the video oneof, not contactMessage", () => {
    const decoded = decodeConsumerApplication(encodeVideoMessage({ ...media, mimeType: "video/mp4" }));
    const video = decoded.payload.content.videoMessage;
    const transport = decodeVideoTransport(video.video.payload);
    const common = transport.integral.transport;

    expect(video.caption.text).toBe("hello media");
    expect(video.video.version).toBe(1);
    expect(common.ancillary.mimetype).toBe("video/mp4");
    expect(transport.ancillary).toMatchObject({ width: 640, height: 480, seconds: 9, gifPlayback: false });
    expect(decoded.payload.content.contactMessage).toBeUndefined();
  });

  it("encodes audio messages using the audio oneof with PTT metadata", () => {
    const decoded = decodeConsumerApplication(encodeAudioMessage({ ...media, mimeType: "audio/ogg" }));
    const audio = decoded.payload.content.audioMessage;
    const transport = decodeAudioTransport(audio.audio.payload);
    const common = transport.integral.transport;

    expect(audio.PTT).toBe(true);
    expect(audio.audio.version).toBe(1);
    expect(common.ancillary.mimetype).toBe("audio/ogg");
    expect(transport.ancillary.seconds).toBe(9);
    expect(decoded.payload.content.locationMessage).toBeUndefined();
  });

  it("encodes document messages using the document oneof with filename", () => {
    const decoded = decodeConsumerApplication(encodeDocumentMessage({ ...media, mimeType: "application/pdf" }));
    const document = decoded.payload.content.documentMessage;
    const transport = decodeDocumentTransport(document.document.payload);
    const common = transport.integral.transport;

    expect(document.fileName).toBe("file.pdf");
    expect(document.document.version).toBe(1);
    expect(common.ancillary.mimetype).toBe("application/pdf");
    expect(common.ancillary.objectID).toBe("object-123");
    expect(decoded.payload.content.extendedTextMessage).toBeUndefined();
  });

  it("encodes sticker messages using the sticker oneof", () => {
    const decoded = decodeConsumerApplication(encodeStickerMessage({ ...media, mimeType: "image/webp", caption: undefined }));
    const sticker = decoded.payload.content.stickerMessage;
    const transport = decodeStickerTransport(sticker.sticker.payload);
    const common = transport.integral.transport;

    expect(sticker.sticker.version).toBe(1);
    expect(common.ancillary.mimetype).toBe("image/webp");
    expect(transport.ancillary).toMatchObject({ width: 640, height: 480 });
    expect(decoded.payload.content.statusTextMessage).toBeUndefined();
  });

  it("encodes revoke messages as application data with a valid message key", () => {
    const decoded = decodeConsumerApplication(encodeRevokeMessage("mid.remove", {
      remoteJid: "180@g.us",
      fromMe: true,
    }));

    expect(decoded.payload.applicationData.revoke.key.remoteJID).toBe("180@g.us");
    expect(decoded.payload.applicationData.revoke.key.ID).toBe("mid.remove");
    expect(decoded.payload.applicationData.revoke.key.fromMe).toBe(true);
  });

  it("wraps consumer bytes in MessageApplication with franking metadata and quote", () => {
    const consumer = encodeTextMessage("quoted");
    const { messageApp, frankingKey, frankingTag } = encodeMessageApplication(consumer, {
      id: "mid.quote",
      senderJid: "100.1@msgr",
    });
    const decoded = decodeMessageApplication(messageApp);

    expect(decoded.payload.subProtocol.consumerMessage.version).toBe(FB_CONSUMER_MESSAGE_VERSION);
    expect(decoded.payload.subProtocol.consumerMessage.payload).toEqual(consumer);
    expect(decoded.metadata.frankingKey).toEqual(frankingKey);
    expect(frankingKey.length).toBe(32);
    expect(frankingTag.length).toBe(32);
    expect(decoded.metadata.quotedMessage.stanzaID).toBe("mid.quote");
    expect(decoded.metadata.quotedMessage.remoteJID).toBe("100.1@msgr");
  });

  it("encodes MessageTransport with app payload, DSM, SKDM, and backup directive", () => {
    const messageApp = Buffer.from("message-app");
    const skdmBytes = Buffer.from("skdm");
    const decoded = decodeMessageTransport(encodeMessageTransport({
      messageApp,
      padding: Buffer.from([1]),
      dsm: { destinationJid: "200.0@msgr", phash: "hash" },
      skdm: { groupId: "180@g.us", skdmBytes },
      backupDirective: { messageId: "mid.1", actionType: "REMOVE" },
    }));

    expect(decoded.payload.applicationPayload.payload).toEqual(messageApp);
    expect(decoded.payload.applicationPayload.version).toBe(FB_MESSAGE_APPLICATION_VERSION);
    expect(decoded.protocol.integral.padding).toEqual(Buffer.from([1]));
    expect(decoded.protocol.integral.DSM).toMatchObject({ destinationJID: "200.0@msgr", phash: "hash" });
    expect(decoded.protocol.ancillary.skdm.groupID).toBe("180@g.us");
    expect(decoded.protocol.ancillary.skdm.axolotlSenderKeyDistributionMessage).toEqual(skdmBytes);
    expect(decoded.protocol.ancillary.backupDirective).toMatchObject({ messageID: "mid.1", actionType: "DELETE" });
  });

  it("encodes SKDM-only transports without application payload", () => {
    const decoded = decodeMessageTransport(encodeMessageTransport({
      padding: Buffer.from([2]),
      skdm: { groupId: "180@g.us", skdmBytes: Buffer.from("skdm") },
    }));

    expect(decoded.payload).toBeUndefined();
    expect(decoded.protocol.integral.padding).toEqual(Buffer.from([2]));
    expect(decoded.protocol.ancillary.skdm.groupID).toBe("180@g.us");
  });

  it("encodes client payload with username, device ID, CAT, user agent, and pull flag", () => {
    const payload = encodeClientPayload({
      username: 123456789n,
      deviceId: 42,
      fbCatBase64: "cat-token",
      fbUserAgent: Buffer.from("ua"),
    });

    expect(payload).toContain(42);
    expect(payload.includes(Buffer.from("cat-token"))).toBe(true);
    expect(payload.includes(Buffer.from("ua"))).toBe(true);
    expect([...payload.slice(-3)]).toEqual([0x88, 0x02, 0x01]); // field 33 bool header + true
  });
});
