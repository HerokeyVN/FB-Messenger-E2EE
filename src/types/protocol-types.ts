/**
 * Protocol-specific Type Definitions
 */

export interface E2EEMessagePayload {
  kind?: "text" | "image" | "video" | "audio" | "document" | "sticker" | "reaction" | "edit" | "revoke" | "unknown";
  type?: "text" | "media" | "decryption_failed";
  senderJid: string;
  senderId?: string;
  senderDeviceId?: number;
  chatJid?: string;
  messageId: string;
  timestampMs: number;
  text?: string;
  isArmadillo?: boolean;
  error?: string;
}

export interface DecryptedConsumerApplication {
  payload?: {
    type: string;
    data: number[];
  };
  version?: number;
}

export interface DecryptedArmadillo {
  payload?: {
    type: string;
    data: number[];
  };
}

export interface DecryptedMessageApplication {
  payload?: {
    subProtocol?: {
      consumerMessage?: DecryptedConsumerApplication;
      armadillo?: DecryptedArmadillo;
      futureProof?: string;
    };
  };
  metadata?: any;
}
