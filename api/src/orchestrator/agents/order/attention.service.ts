import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface AttentionItem {
  category: 'unfulfilled_order' | 'low_stock' | 'pending_refund';
  entityId: string;
  label: string;
  urgencyScore: number;
  metadata: Record<string, unknown>;
}

const LOW_STOCK_THRESHOLD = 10;
const UNFULFILLED_HOURS = 24;

@Injectable()
export class AttentionService {
  private readonly logger = new Logger(AttentionService.name);

  constructor(private readonly prisma: PrismaService) {}

  async summarize(): Promise<AttentionItem[]> {
    const cutoff = new Date(Date.now() - UNFULFILLED_HOURS * 60 * 60 * 1000);

    const [unfulfilled, lowStock, pendingRefunds] = await Promise.all([
      this.prisma.order.findMany({
        where: { status: { in: ['pending', 'confirmed'] }, placedAt: { lt: cutoff } },
        orderBy: { placedAt: 'asc' },
        take: 20,
        select: { id: true, status: true, placedAt: true, totalCents: true, currency: true },
      }),
      this.prisma.productVariant.findMany({
        where: { stock: { lt: LOW_STOCK_THRESHOLD }, product: { status: 'active' } },
        orderBy: { stock: 'asc' },
        take: 20,
        select: { id: true, sku: true, stock: true, product: { select: { title: true } } },
      }),
      this.prisma.order.findMany({
        where: { status: 'refunded' },
        orderBy: { lastStatusChangeAt: 'asc' },
        take: 20,
        select: { id: true, status: true, lastStatusChangeAt: true, totalCents: true, currency: true },
      }),
    ]);

    const items: AttentionItem[] = [];

    // Pending refunds — highest urgency (90 base)
    for (const order of pendingRefunds) {
      items.push({
        category: 'pending_refund',
        entityId: order.id,
        label: `Order refund pending — ₹${(order.totalCents / 100).toFixed(2)}`,
        urgencyScore: 90,
        metadata: { lastStatusChangeAt: order.lastStatusChangeAt, totalCents: order.totalCents },
      });
    }

    // Unfulfilled orders >24 h — urgency scales with age
    for (const order of unfulfilled) {
      const ageHours = (Date.now() - order.placedAt.getTime()) / (1000 * 60 * 60);
      const urgencyScore = Math.min(85, 60 + Math.floor(ageHours / 24) * 5);
      items.push({
        category: 'unfulfilled_order',
        entityId: order.id,
        label: `Order unfulfilled for ${Math.floor(ageHours)} h — ₹${(order.totalCents / 100).toFixed(2)}`,
        urgencyScore,
        metadata: { placedAt: order.placedAt, ageHours: Math.floor(ageHours), status: order.status },
      });
    }

    // Low-stock variants — urgency scales with stock level
    for (const variant of lowStock) {
      const urgencyScore = Math.max(20, 50 - variant.stock * 4);
      items.push({
        category: 'low_stock',
        entityId: variant.id,
        label: `${(variant.product as { title: string }).title} (SKU: ${variant.sku}) — ${variant.stock} left`,
        urgencyScore,
        metadata: { sku: variant.sku, stock: variant.stock },
      });
    }

    items.sort((a, b) => b.urgencyScore - a.urgencyScore);

    this.logger.log({ event: 'tool.call', tool: 'merchant_attention', itemCount: items.length });
    return items;
  }
}
