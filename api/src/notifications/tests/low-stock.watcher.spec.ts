import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LowStockWatcher } from '../watchers/low-stock.watcher';
import type { PrismaService } from '../../prisma/prisma.service';
import type { NotificationService } from '../notification.service';
import type { RedisService } from '../../redis/redis.service';

const makeVariant = (id: string, sku: string, stock: number, title = 'Blue Mug') => ({
  id,
  sku,
  stock,
  product: { title },
});

const makePrisma = (variants: object[] = []) => ({
  productVariant: {
    findMany: vi.fn().mockResolvedValue(variants),
  },
});

const makeNotificationService = () => ({
  buildLowStockLabel: vi.fn().mockReturnValue('Blue Mug (SKU-1) — 2 left'),
  createForMerchants: vi.fn().mockResolvedValue(undefined),
});

const makeRedis = (alreadyNotified: string[] = []) => ({
  smembers: vi.fn().mockResolvedValue(alreadyNotified),
  sadd: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
});

describe('LowStockWatcher', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let notificationService: ReturnType<typeof makeNotificationService>;
  let redis: ReturnType<typeof makeRedis>;
  let watcher: LowStockWatcher;

  beforeEach(() => {
    prisma = makePrisma();
    notificationService = makeNotificationService();
    redis = makeRedis();
    watcher = new LowStockWatcher(
      prisma as unknown as PrismaService,
      notificationService as unknown as NotificationService,
      redis as unknown as RedisService,
    );
  });

  it('does nothing when no low-stock variants are found', async () => {
    await watcher.checkLowStock();
    expect(notificationService.createForMerchants).not.toHaveBeenCalled();
    expect(redis.sadd).not.toHaveBeenCalled();
  });

  it('skips variants that are already in the notified Redis SET', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-1', 'SKU-1', 2),
    ]);
    redis.smembers.mockResolvedValue(['var-1']);
    await watcher.checkLowStock();
    expect(notificationService.createForMerchants).not.toHaveBeenCalled();
  });

  it('creates merchant notification for newly low-stock variants', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-1', 'SKU-1', 2),
    ]);
    redis.smembers.mockResolvedValue([]);
    notificationService.buildLowStockLabel.mockReturnValue('Blue Mug (SKU-1) — 2 left');
    await watcher.checkLowStock();
    expect(notificationService.createForMerchants).toHaveBeenCalledWith(
      'low_stock',
      expect.objectContaining({ variantIds: ['var-1'], count: 1 }),
    );
  });

  it('batches multiple new variants into a single notification', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-1', 'SKU-1', 2),
      makeVariant('var-2', 'SKU-2', 1),
    ]);
    redis.smembers.mockResolvedValue([]);
    notificationService.buildLowStockLabel.mockReturnValue('2 SKUs are running low');
    await watcher.checkLowStock();
    expect(notificationService.createForMerchants).toHaveBeenCalledTimes(1);
    expect(notificationService.buildLowStockLabel).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'var-1' }),
        expect.objectContaining({ id: 'var-2' }),
      ]),
    );
  });

  it('adds newly notified variantIds to the Redis SET', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-3', 'SKU-3', 3),
    ]);
    redis.smembers.mockResolvedValue([]);
    await watcher.checkLowStock();
    expect(redis.sadd).toHaveBeenCalledWith('notifications:low_stock_notified', 'var-3');
  });

  it('sets 120 second TTL on the notified SET after SADD', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-4', 'SKU-4', 1),
    ]);
    redis.smembers.mockResolvedValue([]);
    await watcher.checkLowStock();
    expect(redis.expire).toHaveBeenCalledWith('notifications:low_stock_notified', 120);
  });

  it('only notifies for new variants when some are already notified', async () => {
    prisma.productVariant.findMany.mockResolvedValue([
      makeVariant('var-1', 'SKU-1', 2),
      makeVariant('var-2', 'SKU-2', 1),
    ]);
    redis.smembers.mockResolvedValue(['var-1']);
    await watcher.checkLowStock();
    expect(notificationService.buildLowStockLabel).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'var-2' })]),
    );
    expect(notificationService.buildLowStockLabel).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ id: 'var-1' })]),
    );
  });
});
