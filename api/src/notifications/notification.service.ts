import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface LowStockVariant {
  id: string;
  sku: string;
  stock: number;
  productTitle: string;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(recipientUserId: string, type: string, payload: Record<string, unknown>) {
    return this.prisma.notification.create({
      data: { recipientUserId, type, payload: payload as Prisma.InputJsonValue },
    });
  }

  async createForMerchants(type: string, payload: Record<string, unknown>) {
    const merchants = await this.prisma.user.findMany({
      where: { role: 'merchant' },
      select: { id: true },
    });
    if (merchants.length === 0) return;
    const jsonPayload = payload as Prisma.InputJsonValue;
    await this.prisma.notification.createMany({
      data: merchants.map((u) => ({ recipientUserId: u.id, type, payload: jsonPayload })),
    });
    this.logger.log({ event: 'notification.created', type, recipientCount: merchants.length });
  }

  async list(recipientUserId: string, limit = 50) {
    const notifications = await this.prisma.notification.findMany({
      where: { recipientUserId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 50),
    });
    const unreadCount = await this.prisma.notification.count({
      where: { recipientUserId, readAt: null },
    });
    return { notifications, unreadCount };
  }

  async markRead(notificationId: string, recipientUserId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientUserId },
    });
    if (!existing || existing.readAt) return;
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(recipientUserId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientUserId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  buildLowStockLabel(variants: LowStockVariant[]): string {
    if (variants.length === 1) {
      const v = variants[0];
      return `${v.productTitle} (${v.sku}) — ${v.stock} left`;
    }
    return `${variants.length} SKUs are running low`;
  }
}
