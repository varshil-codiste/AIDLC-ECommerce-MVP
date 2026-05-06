import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import type { WidgetIntent } from '../types/orchestrator.types';

const TTL_SECONDS = 300;

export interface PendingConfirmation {
  userId: string;
  originalIntent: WidgetIntent;
  agentName: string;
  conversationId: string;
}

@Injectable()
export class ConfirmationService {
  private readonly logger = new Logger(ConfirmationService.name);

  constructor(private readonly redis: RedisService) {}

  async store(intentId: string, payload: PendingConfirmation): Promise<void> {
    await this.redis.setex(`confirm:${intentId}`, TTL_SECONDS, JSON.stringify(payload));
  }

  async retrieve(intentId: string): Promise<PendingConfirmation | null> {
    const raw = await this.redis.get(`confirm:${intentId}`);
    if (!raw) return null;
    return JSON.parse(raw) as PendingConfirmation;
  }

  async consume(intentId: string): Promise<PendingConfirmation | null> {
    const payload = await this.retrieve(intentId);
    if (payload) {
      await this.redis.del(`confirm:${intentId}`);
    }
    return payload;
  }

  async cancel(intentId: string): Promise<void> {
    await this.redis.del(`confirm:${intentId}`);
    this.logger.log({ event: 'confirmation.cancelled', intentId });
  }
}
