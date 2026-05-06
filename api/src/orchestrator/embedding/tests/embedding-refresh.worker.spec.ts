import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmbeddingRefreshWorker, buildTextBlob } from '../embedding-refresh.worker';
import type { PrismaService } from '../../../prisma/prisma.service';
import type { RedisService } from '../../../redis/redis.service';
import type { EmbeddingService } from '../embedding.service';
import type { ProductSearchIndexService } from '../../agents/product/product-search-index.service';

const makePrisma = () => ({
  product: {
    findUnique: vi.fn().mockResolvedValue({
      id: 'p-1',
      title: 'Blue Mug',
      description: 'A nice mug',
      category: { name: 'Drinkware' },
      variants: [{ attributes: { color: 'blue', size: 'medium' } }],
    }),
  },
});
const makeRedis = (overrides: { hget?: string | null; messages?: Array<{ id: string; data: Record<string, string> }> } = {}) => ({
  hget: vi.fn().mockResolvedValue(overrides.hget ?? '0'),
  hset: vi.fn().mockResolvedValue(1),
  xreadMessages: vi.fn().mockResolvedValue(overrides.messages ?? []),
});
const makeEmbedding = () => ({ embed: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)) });
const makeSearchIndex = () => ({ upsert: vi.fn().mockResolvedValue(undefined) });

const productCreatedMsg = (id = '1-0', productId = 'p-1') => ({
  id,
  data: { eventType: 'product.created', payload: JSON.stringify({ productId }) },
});

describe('EmbeddingRefreshWorker', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let redis: ReturnType<typeof makeRedis>;
  let embedding: ReturnType<typeof makeEmbedding>;
  let searchIndex: ReturnType<typeof makeSearchIndex>;
  let worker: EmbeddingRefreshWorker;

  beforeEach(() => {
    prisma = makePrisma();
    redis = makeRedis();
    embedding = makeEmbedding();
    searchIndex = makeSearchIndex();
    worker = new EmbeddingRefreshWorker(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
      embedding as unknown as EmbeddingService,
      searchIndex as unknown as ProductSearchIndexService,
    );
  });

  it('does nothing when stream is empty', async () => {
    await worker.pollProductStream();
    expect(embedding.embed).not.toHaveBeenCalled();
    expect(redis.hset).not.toHaveBeenCalled();
  });

  it('processes a product.created event end-to-end', async () => {
    redis.xreadMessages.mockResolvedValue([productCreatedMsg('1-0', 'p-1')]);
    await worker.pollProductStream();
    expect(embedding.embed).toHaveBeenCalled();
    expect(searchIndex.upsert).toHaveBeenCalledWith('p-1', expect.any(Array), expect.any(String));
    expect(redis.hset).toHaveBeenCalledWith('embedding:stream_cursor', 'events:product', '1-0');
  });

  it('skips events with non-product types but advances cursor', async () => {
    redis.xreadMessages.mockResolvedValue([
      { id: '2-0', data: { eventType: 'order.created', payload: '{}' } },
    ]);
    await worker.pollProductStream();
    expect(embedding.embed).not.toHaveBeenCalled();
    expect(redis.hset).toHaveBeenCalledWith('embedding:stream_cursor', 'events:product', '2-0');
  });

  it('cursor stays when embedding throws (event will redeliver)', async () => {
    redis.xreadMessages.mockResolvedValue([productCreatedMsg('3-0', 'p-1')]);
    embedding.embed.mockRejectedValue(new Error('rate limited'));
    await worker.pollProductStream();
    expect(redis.hset).not.toHaveBeenCalled();
  });

  it('skips when product not found and advances cursor', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    redis.xreadMessages.mockResolvedValue([productCreatedMsg('4-0', 'missing-id')]);
    await worker.pollProductStream();
    expect(searchIndex.upsert).not.toHaveBeenCalled();
    expect(redis.hset).toHaveBeenCalledWith('embedding:stream_cursor', 'events:product', '4-0');
  });

  it('uses stored cursor for next read', async () => {
    redis.hget.mockResolvedValue('100-5');
    await worker.pollProductStream();
    expect(redis.xreadMessages).toHaveBeenCalledWith('events:product', '100-5', expect.any(Number));
  });
});

describe('buildTextBlob', () => {
  it('concatenates title, description, category, attributes', () => {
    const blob = buildTextBlob({
      id: 'p-1',
      title: 'Blue Mug',
      description: 'Ceramic',
      category: { name: 'Drinkware' },
      variants: [{ attributes: { color: 'blue', size: 'medium' } }],
    });
    expect(blob).toContain('Blue Mug');
    expect(blob).toContain('Ceramic');
    expect(blob).toContain('Drinkware');
    expect(blob).toContain('color:blue');
  });

  it('omits null description and missing category cleanly', () => {
    const blob = buildTextBlob({
      id: 'p-2',
      title: 'X',
      description: null,
      category: null,
      variants: [],
    });
    expect(blob).toBe('X');
  });
});
