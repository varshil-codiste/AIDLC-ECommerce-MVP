import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttentionService } from '../attention.service';
import type { PrismaService } from '../../../../prisma/prisma.service';

const now = Date.now();

const makeUnfulfilledOrder = (ageHours = 30) => ({
  id: `ord-uf-${ageHours}`,
  status: 'confirmed',
  placedAt: new Date(now - ageHours * 60 * 60 * 1000),
  totalCents: 5000,
  currency: 'INR',
  lastStatusChangeAt: new Date(),
});

const makeRefundedOrder = () => ({
  id: 'ord-ref-1',
  status: 'refunded',
  lastStatusChangeAt: new Date(now - 2 * 60 * 60 * 1000),
  totalCents: 8000,
  currency: 'INR',
});

const makeLowStockVariant = (stock = 5) => ({
  id: `var-ls-${stock}`,
  sku: `SKU-${stock}`,
  stock,
  product: { title: 'Blue Mug' },
});

const makePrisma = (overrides: {
  unfulfilled?: object[];
  lowStock?: object[];
  refunds?: object[];
} = {}) => ({
  order: {
    findMany: vi.fn().mockImplementation(({ where }) => {
      if (where?.status === 'refunded') return Promise.resolve(overrides.refunds ?? []);
      return Promise.resolve(overrides.unfulfilled ?? []);
    }),
  },
  productVariant: {
    findMany: vi.fn().mockResolvedValue(overrides.lowStock ?? []),
  },
});

describe('AttentionService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: AttentionService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AttentionService(prisma as unknown as PrismaService);
  });

  it('returns empty array when no items need attention', async () => {
    const result = await service.summarize();
    expect(result).toEqual([]);
  });

  it('calls all three parallel Prisma queries', async () => {
    await service.summarize();
    expect(prisma.order.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.productVariant.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns pending_refund items ranked first (score 90)', async () => {
    const prismaWithData = makePrisma({
      refunds: [makeRefundedOrder()],
      unfulfilled: [makeUnfulfilledOrder(30)],
    });
    const svc = new AttentionService(prismaWithData as unknown as PrismaService);
    const items = await svc.summarize();
    expect(items[0].category).toBe('pending_refund');
    expect(items[0].urgencyScore).toBe(90);
  });

  it('returns items sorted by urgencyScore descending', async () => {
    const prismaWithData = makePrisma({
      refunds: [makeRefundedOrder()],
      unfulfilled: [makeUnfulfilledOrder(25)],
      lowStock: [makeLowStockVariant(5)],
    });
    const svc = new AttentionService(prismaWithData as unknown as PrismaService);
    const items = await svc.summarize();
    for (let i = 0; i < items.length - 1; i++) {
      expect(items[i].urgencyScore).toBeGreaterThanOrEqual(items[i + 1].urgencyScore);
    }
  });

  it('unfulfilled order urgency caps at 85', async () => {
    // 200 hours old → 60 + floor(200/24)*5 = 60 + 8*5 = 100 → capped at 85
    const prismaWithData = makePrisma({ unfulfilled: [makeUnfulfilledOrder(200)] });
    const svc = new AttentionService(prismaWithData as unknown as PrismaService);
    const items = await svc.summarize();
    const uf = items.find((i) => i.category === 'unfulfilled_order');
    expect(uf?.urgencyScore).toBe(85);
  });

  it('low_stock urgency score never falls below 20', async () => {
    // stock=9 → 50 - 9*4 = 14 → floored at 20
    const prismaWithData = makePrisma({ lowStock: [makeLowStockVariant(9)] });
    const svc = new AttentionService(prismaWithData as unknown as PrismaService);
    const items = await svc.summarize();
    const ls = items.find((i) => i.category === 'low_stock');
    expect(ls?.urgencyScore).toBeGreaterThanOrEqual(20);
  });

  it('includes entityId and label for each item category', async () => {
    const prismaWithData = makePrisma({
      refunds: [makeRefundedOrder()],
      unfulfilled: [makeUnfulfilledOrder(26)],
      lowStock: [makeLowStockVariant(3)],
    });
    const svc = new AttentionService(prismaWithData as unknown as PrismaService);
    const items = await svc.summarize();
    for (const item of items) {
      expect(item.entityId).toBeTruthy();
      expect(item.label).toBeTruthy();
    }
  });
});
