import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductService } from '../product.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';
import type { EmbeddingService } from '../../../embedding/embedding.service';
import type { ProductSearchIndexService } from '../product-search-index.service';

const makePrisma = () => ({
  product: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    update: vi.fn(),
  },
  productVariant: {
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  },
  category: { findMany: vi.fn().mockResolvedValue([]) },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      product: {
        create: vi.fn().mockResolvedValue({ id: 'p-1', title: 'Shirt', priceCents: 4500, status: 'active', currency: 'INR', description: null, categoryId: null, imageUrls: [], variants: [] }),
        update: vi.fn().mockResolvedValue({ id: 'p-1' }),
      },
      productVariant: { update: vi.fn().mockResolvedValue({ id: 'v-1', stock: 10 }) },
      auditLog: { create: vi.fn() },
      agentEvent: { create: vi.fn().mockResolvedValue({ id: 'evt-1' }) },
    }),
  ),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });
const makeEmbedding = () => ({ embed: vi.fn().mockResolvedValue(new Array(1536).fill(0)) });
const makeSearchIndex = () => ({
  upsert: vi.fn().mockResolvedValue(undefined),
  searchByVector: vi.fn().mockResolvedValue([]),
  searchByKeyword: vi.fn().mockResolvedValue([]),
});

describe('ProductService', () => {
  let service: ProductService;
  let prisma: ReturnType<typeof makePrisma>;
  let embedding: ReturnType<typeof makeEmbedding>;
  let searchIndex: ReturnType<typeof makeSearchIndex>;

  beforeEach(() => {
    prisma = makePrisma();
    const audit = makeAudit();
    embedding = makeEmbedding();
    searchIndex = makeSearchIndex();
    service = new ProductService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditLogService,
      embedding as unknown as EmbeddingService,
      searchIndex as unknown as ProductSearchIndexService,
    );
  });

  it('search calls embeddingService and searchByVector on happy path', async () => {
    searchIndex.searchByVector.mockResolvedValue([
      { id: 'p-1', title: 'Running shoes', priceCents: 9999, currency: 'INR', categoryId: null, status: 'active', imageUrls: [], description: null, score: 0.92 },
    ]);
    const result = await service.search('running shoes', {}, 8);
    expect(embedding.embed).toHaveBeenCalledWith('running shoes');
    expect(searchIndex.searchByVector).toHaveBeenCalled();
    expect(result.usedFallback).toBe(false);
    expect(result.products).toHaveLength(1);
  });

  it('search falls back to keyword when embedding throws', async () => {
    embedding.embed.mockRejectedValue(new Error('embed_failed'));
    searchIndex.searchByKeyword.mockResolvedValue([
      { id: 'p-2', title: 'Run shoes', priceCents: 5000, currency: 'INR', categoryId: null, status: 'active', imageUrls: [], description: null, score: 0.5 },
    ]);
    const result = await service.search('shoes', {}, 8);
    expect(searchIndex.searchByKeyword).toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
  });

  it('listCategories calls prisma.category.findMany', async () => {
    await service.listCategories();
    expect(prisma.category.findMany).toHaveBeenCalled();
  });

  it('create calls $transaction', async () => {
    await service.create({ title: 'Shirt', priceCents: 4500, stock: 10 }, 'user-1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('update throws product.archived when product is archived', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: 'archived' });
    await expect(service.update('p1', { title: 'New' }, 'user-1', 'merchant')).rejects.toThrow('product.archived');
  });

  it('update throws product.not_found when product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.update('p1', { title: 'New' }, 'user-1', 'merchant')).rejects.toThrow('product.not_found');
  });

  it('archive throws product.already_archived when already archived', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: 'archived' });
    await expect(service.archive('p1', 'user-1', 'merchant')).rejects.toThrow('product.already_archived');
  });

  it('bulkCreate returns partial success results', async () => {
    const service2 = new ProductService(
      prisma as unknown as PrismaService,
      makeAudit() as unknown as AuditLogService,
      makeEmbedding() as unknown as EmbeddingService,
      makeSearchIndex() as unknown as ProductSearchIndexService,
    );
    vi.spyOn(service2, 'create')
      .mockResolvedValueOnce({ id: 'p1', title: 'Shirt', variants: [{ stock: 10 }] } as never)
      .mockRejectedValueOnce(new Error('product.title.invalid'));

    const result = await service2.bulkCreate([
      { title: 'Shirt', priceCents: 4500, stock: 10 },
      { title: 'X', priceCents: 100, stock: 5 },
    ], 'user-1', 'merchant');

    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toBe('product.title.invalid');
  });

  it('update calls $transaction when product is active', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: 'active', title: 'Old', priceCents: 4000 });
    await service.update('p1', { title: 'New', priceCents: 5000 }, 'user-1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('updateStock calls $transaction when variant exists', async () => {
    prisma.productVariant.findUnique.mockResolvedValue({ id: 'v1', stock: 10 });
    await service.updateStock('v1', 20, 'user-1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('updateStock throws variant.not_found when variant does not exist', async () => {
    prisma.productVariant.findUnique.mockResolvedValue(null);
    await expect(service.updateStock('v1', 20, 'user-1', 'merchant')).rejects.toThrow('variant.not_found');
  });

  it('archive calls $transaction when product is active', async () => {
    prisma.product.findUnique.mockResolvedValue({ id: 'p1', status: 'active' });
    await service.archive('p1', 'user-1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('archive throws product.not_found when product does not exist', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    await expect(service.archive('p1', 'user-1', 'merchant')).rejects.toThrow('product.not_found');
  });

  it('getById calls prisma.product.findUnique', async () => {
    await service.getById('product-id');
    expect(prisma.product.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'product-id' } }),
    );
  });

  it('compareByIds returns differing attributes', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', description: null, imageUrls: [], category: { name: 'X' }, variants: [{ attributes: { color: 'red', size: 'M' } }] },
      { id: 'p-2', title: 'B', priceCents: 200, currency: 'INR', description: null, imageUrls: [], category: { name: 'X' }, variants: [{ attributes: { color: 'blue', size: 'M' } }] },
    ]);
    const result = await service.compareByIds(['p-1', 'p-2']);
    expect(result.products).toHaveLength(2);
    expect(result.differingAttributes).toContain('color');
    expect(result.differingAttributes).not.toContain('size');
  });
});
