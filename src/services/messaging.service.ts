import type { FCAApi } from "fca-unofficial";

import type { MarkReadInput, SendMessageInput, SendReactionInput, TypingInput } from "../models/messaging.ts";
import { FacebookGatewayService } from "./facebook-gateway.service.ts";

export class MessagingService {
  public constructor(private readonly gateway: FacebookGatewayService) {}

  public async sendText(api: FCAApi, input: SendMessageInput): Promise<Record<string, unknown>> {
    return this.gateway.sendMessage(api, input.threadId, input.text, input.replyToMessageId);
  }

  public async react(api: FCAApi, input: SendReactionInput): Promise<void> {
    await this.gateway.sendReaction(api, input.messageId, input.reaction);
  }

  public async unsend(api: FCAApi, messageId: string): Promise<void> {
    await this.gateway.unsendMessage(api, messageId);
  }

  public async sendTyping(api: FCAApi, input: TypingInput): Promise<void> {
    await this.gateway.sendTyping(api, input.threadId, input.isTyping);
  }

  public async markAsRead(api: FCAApi, input: MarkReadInput): Promise<void> {
    await this.gateway.markAsRead(api, input.threadId);
  }
}
