import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderEventListener } from '../listeners/order-event.listener';
import type { NotificationService } from '../notification.service';
import type { RedisService } from '../../redis/redis.service';

const makeNotificationService = () => ({
  createForMerchants: vi.fn().mockResolvedValue(undefined),
});

const makeRedis = (overrides: {
  hget?: string | null;
  messages?: Array<{ id: string; data: Record<string, string> }>;
} = {}) => ({
  hget: vi.fn().mockResolvedValue(overrides.hget ?? '0'),
  hset: vi.fn().mockResolvedValue(1),
  xreadMessages: vi.fn().mockResolvedValue(overrides.messages ?? []),
});

const makeOrderCreatedMsg = (id = '1-0') => ({
  id,
  data: {
    eventType: 'order.created',
    payload: JSON.stringify({ orderId: 'ord-1', totalCents: 4999, currency: 'INR' }),
  },
});

describe('OrderEventListener', () => {
  let notificationService: ReturnType<typeof makeNotificationService>;
  let redis: ReturnType<typeof makeRedis>;
  let listener: OrderEventListener;

  beforeEach(() => {
    notificationService = makeNotificationService();
    redis = makeRedis();
    listener = new OrderEventListener(
      notificationService as unknown as NotificationService,
      redis as unknown as RedisService,
    );
  });

  it('does nothing when xread returns no messages', async () => {
    redis.xreadMessages.mockResolvedValue([]);
    await listener.pollOrderStream();
    expect(notificationService.createForMerchants).not.toHaveBeenCalled();
    expect(redis.hset).not.toHaveBeenCalled();
  });

  it('skips non-order.created events without creating notifications', async () => {
    redis.xreadMessages.mockResolvedValue([
      { id: '1-0', data: { eventType: 'order.shipped', payload: '{}' } },
    ]);
    await listener.pollOrderStream();
    expect(notificationService.createForMerchants).not.toHaveBeenCalled();
  });

  it('creates merchant notifications for order.created events', async () => {
    redis.xreadMessages.mockResolvedValue([makeOrderCreatedMsg()]);
    await listener.pollOrderStream();
    expect(notificationService.createForMerchants).toHaveBeenCalledWith('order.created', {
      orderId: 'ord-1',
      totalCents: 4999,
      currency: 'INR',
    });
  });

  it('updates the stream cursor to the last processed message id', async () => {
    redis.xreadMessages.mockResolvedValue([
      makeOrderCreatedMsg('2-1'),
      makeOrderCreatedMsg('2-2'),
    ]);
    await listener.pollOrderStream();
    expect(redis.hset).toHaveBeenCalledWith(
      'notifications:stream_cursor',
      'events:order',
      '2-2',
    );
  });

  it('uses stored cursor from Redis for the next read', async () => {
    redis.hget.mockResolvedValue('5-0');
    redis.xreadMessages.mockResolvedValue([]);
    await listener.pollOrderStream();
    expect(redis.xreadMessages).toHaveBeenCalledWith('events:order', '5-0', 50);
  });

  it('defaults cursor to "0" when Redis returns null', async () => {
    redis.hget.mockResolvedValue(null);
    redis.xreadMessages.mockResolvedValue([]);
    await listener.pollOrderStream();
    expect(redis.xreadMessages).toHaveBeenCalledWith('events:order', '0', 50);
  });
});
