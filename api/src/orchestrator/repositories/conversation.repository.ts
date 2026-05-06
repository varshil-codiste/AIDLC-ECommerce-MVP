import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ContextSlice } from '../types/orchestrator.types';
import type { UserRole } from '../../auth/types/jwt-payload.type';

const CONTEXT_WINDOW = 20;

@Injectable()
export class ConversationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findOrCreate(userId: string, role: UserRole, conversationId?: string) {
    if (conversationId) {
      const existing = await this.prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });
      if (existing) return existing;
    }
    return this.prisma.conversation.create({
      data: { userId, userRole: role },
    });
  }

  async isFirstTurn(conversationId: string): Promise<boolean> {
    const count = await this.prisma.message.count({ where: { conversationId } });
    return count === 0;
  }

  async saveUserMessage(conversationId: string, userId: string, content: string): Promise<string> {
    const msg = await this.prisma.message.create({
      data: { conversationId, sender: userId, senderRole: 'user', content },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    });
    return msg.id;
  }

  async saveAssistantMessage(
    conversationId: string,
    content: string,
    opts: {
      widgetType?: string;
      widgetPayload?: object;
      tokensIn?: number;
      tokensOut?: number;
      costUsd?: number;
      traceId?: string;
    } = {},
  ): Promise<string> {
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        sender: 'assistant',
        senderRole: 'assistant',
        content,
        widgetType: opts.widgetType,
        widgetPayload: opts.widgetPayload ? (opts.widgetPayload as object) : undefined,
        tokensIn: opts.tokensIn,
        tokensOut: opts.tokensOut,
        costUsd: opts.costUsd,
        traceId: opts.traceId,
      },
    });
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { lastActivityAt: new Date() },
    });
    return msg.id;
  }

  async getPriorContext(conversationId: string): Promise<ContextSlice[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: CONTEXT_WINDOW,
      select: { senderRole: true, content: true },
    });
    return messages
      .filter((m) => m.senderRole === 'user' || m.senderRole === 'assistant')
      .map((m) => ({ role: m.senderRole as 'user' | 'assistant', content: m.content ?? '' }));
  }
}
