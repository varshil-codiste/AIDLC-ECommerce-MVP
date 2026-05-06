import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmationService } from '../confirmation/confirmation.service';
import type { RedisService } from '../../redis/redis.service';

const makeRedis = () => ({
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
});

describe('ConfirmationService', () => {
  let service: ConfirmationService;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    redis = makeRedis();
    service = new ConfirmationService(redis as unknown as RedisService);
  });

  it('stores a pending confirmation in Redis with 300s TTL', async () => {
    const payload = {
      userId: 'u1',
      originalIntent: { intent: 'cart.clear' as const },
      agentName: 'cart',
      conversationId: 'c1',
    };
    await service.store('intent-1', payload);
    expect(redis.setex).toHaveBeenCalledWith('confirm:intent-1', 300, JSON.stringify(payload));
  });

  it('retrieves a stored confirmation', async () => {
    const payload = {
      userId: 'u1',
      originalIntent: { intent: 'order.refund' as const },
      agentName: 'order',
      conversationId: 'c1',
    };
    redis.get.mockResolvedValue(JSON.stringify(payload));
    const result = await service.retrieve('intent-1');
    expect(result).toEqual(payload);
  });

  it('returns null when key is missing', async () => {
    redis.get.mockResolvedValue(null);
    expect(await service.retrieve('missing')).toBeNull();
  });

  it('consume deletes the key after retrieval', async () => {
    const payload = {
      userId: 'u1',
      originalIntent: { intent: 'cart.clear' as const },
      agentName: 'cart',
      conversationId: 'c1',
    };
    redis.get.mockResolvedValue(JSON.stringify(payload));
    const result = await service.consume('intent-1');
    expect(result).toEqual(payload);
    expect(redis.del).toHaveBeenCalledWith('confirm:intent-1');
  });

  it('cancel deletes the key', async () => {
    await service.cancel('intent-1');
    expect(redis.del).toHaveBeenCalledWith('confirm:intent-1');
  });
});
