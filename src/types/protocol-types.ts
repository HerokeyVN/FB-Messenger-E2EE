/**
 * Protocol-specific Type Definitions
 */

export interface E2EEMessagePayload {
  type: "text" | "media" | "decryption_failed";
  senderJid: string;
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
