import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../notification.service';
import type { PrismaService } from '../../prisma/prisma.service';

const makeNotification = (overrides: Record<string, unknown> = {}) => ({
  id: 'notif-1',
  recipientUserId: 'user-1',
  type: 'order.created',
  payload: { orderId: 'ord-1' },
  readAt: null,
  createdAt: new Date('2026-05-01T10:00:00Z'),
  ...overrides,
});

const makePrisma = () => ({
  notification: {
    create: vi.fn().mockResolvedValue(makeNotification()),
    createMany: vi.fn().mockResolvedValue({ count: 2 }),
    findMany: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue(makeNotification({ readAt: new Date() })),
    updateMany: vi.fn().mockResolvedValue({ count: 3 }),
  },
  user: {
    findMany: vi.fn().mockResolvedValue([]),
  },
});

describe('NotificationService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: NotificationService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new NotificationService(prisma as unknown as PrismaService);
  });

  it('create inserts a notification with correct fields', async () => {
    const payload = { orderId: 'ord-42' };
    await service.create('user-1', 'order.created', payload);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: { recipientUserId: 'user-1', type: 'order.created', payload },
    });
  });

  it('createForMerchants fans out to all merchants via createMany', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'merchant-1' }, { id: 'merchant-2' }]);
    await service.createForMerchants('order.created', { orderId: 'ord-1' });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        { recipientUserId: 'merchant-1', type: 'order.created', payload: { orderId: 'ord-1' } },
        { recipientUserId: 'merchant-2', type: 'order.created', payload: { orderId: 'ord-1' } },
      ],
    });
  });

  it('createForMerchants is a no-op when no merchants exist', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    await service.createForMerchants('order.created', {});
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('list returns DESC-ordered notifications and unreadCount', async () => {
    const notifications = [makeNotification({ id: 'n-2' }), makeNotification({ id: 'n-1' })];
    prisma.notification.findMany.mockResolvedValue(notifications);
    prisma.notification.count.mockResolvedValue(1);
    const result = await service.list('user-1');
    expect(result.notifications).toHaveLength(2);
    expect(result.unreadCount).toBe(1);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { createdAt: 'desc' }, take: 50 }),
    );
  });

  it('list caps take at 50 even if caller requests more', async () => {
    prisma.notification.findMany.mockResolvedValue([]);
    prisma.notification.count.mockResolvedValue(0);
    await service.list('user-1', 200);
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });

  it('markRead sets readAt when notification exists and is unread', async () => {
    prisma.notification.findFirst.mockResolvedValue(makeNotification({ readAt: null }));
    await service.markRead('notif-1', 'user-1');
    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'notif-1' } }),
    );
  });

  it('markRead is a no-op when notification belongs to different user (ownership guard)', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await service.markRead('notif-1', 'wrong-user');
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('markRead is idempotent when notification is already read', async () => {
    prisma.notification.findFirst.mockResolvedValue(makeNotification({ readAt: new Date() }));
    await service.markRead('notif-1', 'user-1');
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('markAllRead calls updateMany with readAt: null filter', async () => {
    await service.markAllRead('user-1');
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { recipientUserId: 'user-1', readAt: null } }),
    );
  });

  it('buildLowStockLabel returns specific label for single variant', () => {
    const label = service.buildLowStockLabel([
      { id: 'var-1', sku: 'SKU-A', stock: 3, productTitle: 'Blue Mug' },
    ]);
    expect(label).toBe('Blue Mug (SKU-A) — 3 left');
  });

  it('buildLowStockLabel returns plural label for multiple variants', () => {
    const label = service.buildLowStockLabel([
      { id: 'var-1', sku: 'SKU-A', stock: 2, productTitle: 'Blue Mug' },
      { id: 'var-2', sku: 'SKU-B', stock: 1, productTitle: 'Red Cup' },
      { id: 'var-3', sku: 'SKU-C', stock: 4, productTitle: 'Green Plate' },
    ]);
    expect(label).toBe('3 SKUs are running low');
  });
});
