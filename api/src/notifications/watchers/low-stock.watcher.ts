import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { NotificationService, type LowStockVariant } from '../notification.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

const LOW_STOCK_THRESHOLD = 5;
const NOTIFIED_SET_KEY = 'notifications:low_stock_notified';
const NOTIFIED_TTL_SECONDS = 120;

@Injectable()
export class LowStockWatcher {
  private readonly logger = new Logger(LowStockWatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly redis: RedisService,
  ) {}

  @Interval(60_000)
  async checkLowStock(): Promise<void> {
    const variants = await this.prisma.productVariant.findMany({
      where: { stock: { lt: LOW_STOCK_THRESHOLD }, product: { status: 'active' } },
      select: { id: true, sku: true, stock: true, product: { select: { title: true } } },
      orderBy: { stock: 'asc' },
      take: 50,
    });

    if (variants.length === 0) return;

    const alreadyNotified = await this.redis.smembers(NOTIFIED_SET_KEY);
    const notifiedSet = new Set(alreadyNotified);

    const newVariants: LowStockVariant[] = variants
      .filter((v) => !notifiedSet.has(v.id))
      .map((v) => ({
        id: v.id,
        sku: v.sku,
        stock: v.stock,
        productTitle: (v.product as { title: string }).title,
      }));

    this.logger.log({
      event: 'notification.low_stock',
      newCount: newVariants.length,
      skippedCount: variants.length - newVariants.length,
    });

    if (newVariants.length === 0) return;

    const label = this.notificationService.buildLowStockLabel(newVariants);
    await this.notificationService.createForMerchants('low_stock', {
      label,
      variantIds: newVariants.map((v) => v.id),
      count: newVariants.length,
    });

    await this.redis.sadd(NOTIFIED_SET_KEY, ...newVariants.map((v) => v.id));
    await this.redis.expire(NOTIFIED_SET_KEY, NOTIFIED_TTL_SECONDS);
  }
}
