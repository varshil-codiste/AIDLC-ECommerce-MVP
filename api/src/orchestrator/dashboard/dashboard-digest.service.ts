import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { WidgetPayload } from '../types/orchestrator.types';

@Injectable()
export class DashboardDigestService {
  private readonly logger = new Logger(DashboardDigestService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildDigest(): Promise<WidgetPayload> {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [ordersResult, lowStockProducts, newCustomers] = await Promise.all([
        this.prisma.order
          .aggregate({
            where: { placedAt: { gte: todayStart } },
            _count: { _all: true },
            _sum: { totalCents: true },
          })
          .catch(() => ({ _count: { _all: 0 }, _sum: { totalCents: 0 } })),
        this.prisma.productVariant.count({ where: { stock: { lt: 10 } } }).catch(() => 0),
        this.prisma.customer.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
      ]);

      return {
        type: 'dashboard_digest',
        data: {
          metrics: {
            ordersToday: ordersResult._count._all,
            revenueTodayCents: ordersResult._sum.totalCents ?? 0,
            lowStockAlerts: lowStockProducts,
            newCustomersToday: newCustomers,
          },
        },
      };
    } catch (err) {
      this.logger.error({ event: 'dashboard.digest.failed', err });
      throw err;
    }
  }
}
