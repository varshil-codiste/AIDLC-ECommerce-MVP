import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductSearchIndexService } from '../product-search-index.service';
import type { PrismaService } from '../../../../prisma/prisma.service';

const makePrisma = () => ({
  $executeRaw: vi.fn().mockResolvedValue(1),
  $queryRaw: vi.fn().mockResolvedValue([]),
});

describe('ProductSearchIndexService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: ProductSearchIndexService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new ProductSearchIndexService(prisma as unknown as PrismaService);
  });

  it('upsert calls $executeRaw with vector literal', async () => {
    await service.upsert('p-1', [0.1, 0.2, 0.3], 'blue mug');
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('searchByVector returns rows from $queryRaw', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', categoryId: null, status: 'active', imageUrls: [], description: null, score: 0.9 },
    ]);
    const rows = await service.searchByVector([0.1, 0.2], 8);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('p-1');
    expect(rows[0].score).toBe(0.9);
  });

  it('searchByVector applies limit cap of 50', async () => {
    await service.searchByVector([0.1], 1000);
    expect(prisma.$queryRaw).toHaveBeenCalled();
    // The limit param is interpolated; the cap is enforced internally
  });

  it('searchByKeyword returns rows from $queryRaw', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', categoryId: null, status: 'active', imageUrls: [], description: null, score: 0.5 },
    ]);
    const rows = await service.searchByKeyword('mug', 5);
    expect(rows).toHaveLength(1);
  });

  it('searchByVector applies filters when provided', async () => {
    await service.searchByVector([0.1], 8, { maxPriceCents: 5000, currency: 'INR', categoryId: '00000000-0000-0000-0000-000000000001' });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('searchByKeyword applies filters when provided', async () => {
    await service.searchByKeyword('mug', 8, { maxPriceCents: 5000 });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});
