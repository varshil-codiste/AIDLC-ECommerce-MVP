import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardDigestService } from '../dashboard/dashboard-digest.service';
import type { PrismaService } from '../../prisma/prisma.service';

const makePrisma = () => ({
  order: {
    aggregate: vi.fn().mockResolvedValue({ _count: { _all: 3 }, _sum: { totalCents: 15000 } }),
  },
  productVariant: { count: vi.fn().mockResolvedValue(2) },
  customer: { count: vi.fn().mockResolvedValue(1) },
});

describe('DashboardDigestService', () => {
  let service: DashboardDigestService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new DashboardDigestService(prisma as unknown as PrismaService);
  });

  it('builds a dashboard_digest widget with correct type', async () => {
    const widget = await service.buildDigest();
    expect(widget.type).toBe('dashboard_digest');
  });

  it('includes ordersToday, revenueTodayCents, lowStockAlerts, newCustomersToday in metrics', async () => {
    const widget = await service.buildDigest();
    const metrics = widget.data.metrics as Record<string, number>;
    expect(metrics.ordersToday).toBe(3);
    expect(metrics.revenueTodayCents).toBe(15000);
    expect(metrics.lowStockAlerts).toBe(2);
    expect(metrics.newCustomersToday).toBe(1);
  });

  it('gracefully handles DB errors with zero fallbacks (not throw)', async () => {
    prisma.order.aggregate.mockRejectedValue(new Error('DB down'));
    // Service uses .catch() fallback — returns zeros rather than throwing
    const widget = await service.buildDigest();
    const metrics = widget.data.metrics as Record<string, number>;
    expect(metrics.ordersToday).toBe(0);
    expect(metrics.revenueTodayCents).toBe(0);
  });
});
