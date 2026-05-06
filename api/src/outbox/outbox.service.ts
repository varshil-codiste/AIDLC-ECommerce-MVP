import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AgentEventPayload } from './types/agent-event-payload.types';

@Injectable()
export class OutboxService {
  static buildPayload(payload: AgentEventPayload): Record<string, unknown> {
    return payload as unknown as Record<string, unknown>;
  }

  async emit(
    tx: Prisma.TransactionClient,
    eventType: AgentEventPayload['eventType'],
    payload: AgentEventPayload,
    emittedByModule: string,
  ): Promise<void> {
    await tx.agentEvent.create({
      data: {
        eventType,
        payload: OutboxService.buildPayload(payload) as Prisma.InputJsonValue,
        emittedByModule,
      },
    });
  }
}
