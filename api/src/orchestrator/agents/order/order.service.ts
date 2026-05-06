import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditLogService } from '../../../audit/audit-log.service';
import { VALID_ORDER_TRANSITIONS } from './order.tools';

export interface BulkStatusResult {
  succeeded: string[];
  failed: Array<{ orderId: string; error: string }>;
}

export interface OrderForTracking {
  id: string;
  status: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  placedAt: Date;
  lastStatusChangeAt: Date;
  returnRequestedAt: Date | null;
}

export interface TrackingEvent {
  label: string;
  timestamp: string;
  detail?: string;
}

export interface TrackingResult {
  orderId: string;
  status: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  events: TrackingEvent[];
}

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async list(filters: { status?: string; dateFrom?: string; dateTo?: string; limit?: number } = {}) {
    const where: Record<string, unknown> = {};
    if (filters.status) where['status'] = filters.status;
    if (filters.dateFrom || filters.dateTo) {
      where['placedAt'] = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lte: new Date(filters.dateTo) } : {}),
      };
    }
    return this.prisma.order.findMany({
      where,
      include: { items: { include: { variant: { include: { product: true } } } }, user: true },
      orderBy: { placedAt: 'desc' },
      take: filters.limit ?? 20,
    });
  }

  async getById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } }, user: true },
    });
  }

  async updateStatus(orderId: string, newStatus: string, actorId: string, actorRole: string) {
    const before = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!before) throw new Error('order.not_found');

    const allowed = VALID_ORDER_TRANSITIONS[before.status] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new Error(`order.invalid_transition: ${before.status} → ${newStatus}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus, lastStatusChangeAt: new Date() },
      });
      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'status_change',
        entity: 'order',
        entityId: orderId,
        before: { status: before.status },
        after: { status: newStatus },
      });
      if (newStatus === 'shipped') {
        await tx.agentEvent.create({
          data: {
            eventType: 'order.shipped',
            payload: { orderId, trackingNumber: order.trackingNumber } as Prisma.InputJsonValue,
            emittedByModule: 'OrderService',
          },
        });
      }
      this.logger.log({ event: 'tool.call', tool: 'order_update_status', orderId, status: newStatus, actorId, success: true });
      return order;
    });
  }

  async updateStatusBulk(
    orderIds: string[],
    newStatus: string,
    trackingData: Record<string, string> | undefined,
    carrier: string | undefined,
    actorId: string,
    actorRole: string,
  ): Promise<BulkStatusResult> {
    const succeeded: string[] = [];
    const failed: Array<{ orderId: string; error: string }> = [];

    for (const orderId of orderIds.slice(0, 50)) {
      try {
        if (newStatus === 'shipped' && trackingData?.[orderId] && carrier) {
          await this.addTracking(orderId, trackingData[orderId], carrier, actorId, actorRole);
        } else {
          await this.updateStatus(orderId, newStatus, actorId, actorRole);
        }
        succeeded.push(orderId);
      } catch (err) {
        const error = err instanceof Error ? err.message : 'unknown_error';
        failed.push({ orderId, error });
        this.logger.warn({ event: 'tool.call', tool: 'order_update_status_bulk', orderId, error, actorId });
      }
    }

    this.logger.log({ event: 'tool.call', tool: 'order_update_status_bulk', attempted: orderIds.length, succeeded: succeeded.length, failed: failed.length, actorId });
    return { succeeded, failed };
  }

  async addTracking(orderId: string, trackingNumber: string, carrier: string, actorId: string, actorRole: string) {
    const before = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!before) throw new Error('order.not_found');

    const newStatus = before.status === 'confirmed' ? 'shipped' : before.status;
    if (newStatus !== 'shipped') {
      throw new Error(`order.invalid_transition: cannot add tracking to ${before.status} order`);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: { trackingNumber, trackingCarrier: carrier, status: newStatus, lastStatusChangeAt: new Date() },
      });
      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole,
        action: 'add_tracking',
        entity: 'order',
        entityId: orderId,
        before: { trackingNumber: before.trackingNumber, status: before.status },
        after: { trackingNumber, trackingCarrier: carrier, status: newStatus },
      });
      if (newStatus === 'shipped') {
        await tx.agentEvent.create({
          data: {
            eventType: 'order.shipped',
            payload: { orderId, trackingNumber } as Prisma.InputJsonValue,
            emittedByModule: 'OrderService',
          },
        });
      }
      this.logger.log({ event: 'tool.call', tool: 'order_add_tracking', orderId, actorId, success: true });
      return order;
    });
  }

  async cancel(orderId: string, actorId: string, actorRole: string) {
    return this.updateStatus(orderId, 'cancelled', actorId, actorRole);
  }

  async refund(orderId: string, _reason: string | undefined, actorId: string, actorRole: string) {
    return this.updateStatus(orderId, 'refunded', actorId, actorRole);
  }

  async getTracking(actorId: string, orderId?: string): Promise<TrackingResult | null> {
    const order = await (orderId
      ? this.prisma.order.findFirst({ where: { id: orderId, userId: actorId } })
      : this.prisma.order.findFirst({
          where: { userId: actorId },
          orderBy: { placedAt: 'desc' },
        }));
    if (!order) return null;
    const events = OrderService.buildTrackingEvents(order as OrderForTracking);
    return {
      orderId: order.id,
      status: order.status,
      trackingNumber: order.trackingNumber,
      trackingCarrier: order.trackingCarrier,
      events,
    };
  }

  static buildTrackingEvents(order: OrderForTracking): TrackingEvent[] {
    const events: TrackingEvent[] = [
      { label: 'Placed', timestamp: order.placedAt.toISOString() },
    ];
    const status = order.status;
    const ts = order.lastStatusChangeAt.toISOString();

    if (status === 'cancelled') {
      events.push({ label: 'Cancelled', timestamp: ts });
      return events;
    }

    const passedConfirmed = ['confirmed', 'shipped', 'delivered', 'return_requested', 'refunded'].includes(status);
    if (passedConfirmed && order.placedAt.getTime() !== order.lastStatusChangeAt.getTime()) {
      events.push({ label: 'Confirmed', timestamp: status === 'confirmed' ? ts : order.placedAt.toISOString() });
    } else if (status === 'confirmed') {
      events.push({ label: 'Confirmed', timestamp: ts });
    }

    if (['shipped', 'delivered', 'return_requested', 'refunded'].includes(status)) {
      const detail = order.trackingNumber
        ? `${order.trackingCarrier ?? 'Carrier'} — ${order.trackingNumber}`
        : undefined;
      events.push({ label: 'Shipped', timestamp: status === 'shipped' ? ts : order.placedAt.toISOString(), ...(detail && { detail }) });
    }

    if (['delivered', 'return_requested', 'refunded'].includes(status)) {
      events.push({ label: 'Delivered', timestamp: status === 'delivered' ? ts : order.placedAt.toISOString() });
    }

    if (status === 'return_requested' && order.returnRequestedAt) {
      events.push({ label: 'Return requested', timestamp: order.returnRequestedAt.toISOString() });
    }

    if (status === 'refunded') {
      events.push({ label: 'Refunded', timestamp: ts });
    }

    return events;
  }

  async startReturn(actorId: string, orderId: string, reason: string) {
    if (!reason || reason.trim().length < 5) {
      throw new Error('order_return.reason_required');
    }
    const before = await this.prisma.order.findFirst({ where: { id: orderId, userId: actorId } });
    if (!before) throw new Error('order.not_found');

    if (before.status === 'return_requested') {
      this.logger.log({ event: 'tool.call', tool: 'order_start_return', orderId, actorId, idempotent: true });
      return before;
    }
    if (before.status !== 'delivered') {
      throw new Error(`order_return.invalid_status: ${before.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'return_requested',
          returnReason: reason.trim(),
          returnRequestedAt: new Date(),
          lastStatusChangeAt: new Date(),
        },
      });
      await this.auditLog.insert(tx, {
        actorUserId: actorId,
        actorRole: 'shopper',
        action: 'return_requested',
        entity: 'order',
        entityId: orderId,
        before: { status: before.status },
        after: { status: 'return_requested', returnReason: reason.trim() },
      });
      await tx.agentEvent.create({
        data: {
          eventType: 'order.return_requested',
          payload: { orderId, userId: actorId } as Prisma.InputJsonValue,
          emittedByModule: 'OrderService',
        },
      });
      this.logger.log({ event: 'order.return_requested', orderId, userId: actorId });
      return order;
    });
  }
}
