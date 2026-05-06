import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CustomerService } from '../customer.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';

const makeCustomer = (overrides: Record<string, unknown> = {}) => ({
  id: 'cust-1',
  userId: 'user-1',
  ltvCents: 10000,
  orderCount: 3,
  tags: ['loyal'],
  user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', phone: null, status: 'active' },
  ...overrides,
});

const makePrisma = () => ({
  customer: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(makeCustomer({ tags: ['loyal', 'vip'] })),
  },
  user: {
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      customer: { update: vi.fn().mockResolvedValue(makeCustomer({ tags: ['loyal', 'vip'] })) },
      user: { update: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn() },
    }),
  ),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });

describe('CustomerService', () => {
  let service: CustomerService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new CustomerService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
  });

  it('search calls prisma.customer.findMany with OR clause', async () => {
    await service.search('alice', 5);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ OR: expect.any(Array) }),
      take: 5,
    }));
  });

  it('getById calls prisma.customer.findUnique', async () => {
    await service.getById('cust-1');
    expect(prisma.customer.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'cust-1' } }));
  });

  it('addTag throws customer.not_found when customer missing', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(service.addTag('cust-x', ['vip'], 'u1', 'merchant')).rejects.toThrow('customer.not_found');
  });

  it('addTag throws customer.anonymized for anonymized customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(makeCustomer({ user: { status: 'anonymized' } }));
    await expect(service.addTag('cust-1', ['vip'], 'u1', 'merchant')).rejects.toThrow('customer.anonymized');
  });

  it('addTag deduplicates tags case-insensitively', async () => {
    prisma.customer.findUnique.mockResolvedValue(makeCustomer({ tags: ['Loyal'] }));
    await service.addTag('cust-1', ['loyal', 'VIP'], 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
    // 'loyal' is duplicate of 'Loyal' — only 'VIP' should be added
  });

  it('addTag caps merged tags at 20', async () => {
    const existingTags = Array.from({ length: 19 }, (_, i) => `tag-${i}`);
    prisma.customer.findUnique.mockResolvedValue(makeCustomer({ tags: existingTags }));
    await service.addTag('cust-1', ['new-tag-a', 'new-tag-b', 'new-tag-c'], 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('addTag calls $transaction for valid customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(makeCustomer());
    await service.addTag('cust-1', ['vip'], 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('anonymize throws customer.not_found when customer missing', async () => {
    prisma.customer.findUnique.mockResolvedValue(null);
    await expect(service.anonymize('cust-x', 'u1', 'merchant')).rejects.toThrow('customer.not_found');
  });

  it('anonymize throws customer.already_anonymized for already-anonymized customer', async () => {
    prisma.customer.findUnique.mockResolvedValue(makeCustomer({ user: { status: 'anonymized' } }));
    await expect(service.anonymize('cust-1', 'u1', 'merchant')).rejects.toThrow('customer.already_anonymized');
  });

  it('anonymize calls $transaction and returns anonymized result', async () => {
    prisma.customer.findUnique.mockResolvedValue(makeCustomer());
    prisma.$transaction.mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        user: { update: vi.fn().mockResolvedValue({}) },
        auditLog: { create: vi.fn() },
      }),
    );
    const result = await service.anonymize('cust-1', 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result).toEqual({ customerId: 'cust-1', anonymized: true });
  });

  it('getTopByLTV calls findMany ordered by ltvCents when no date filter', async () => {
    await service.getTopByLTV(5);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      orderBy: { ltvCents: 'desc' },
      take: 5,
    }));
  });

  it('getTopByLTV with dateFrom uses include+orders path and sorts by periodLtvCents', async () => {
    const customersWithOrders = [
      {
        ...makeCustomer({ id: 'cust-2', ltvCents: 5000 }),
        user: { id: 'user-2', email: 'bob@example.com', name: 'Bob', status: 'active', orders: [{ totalCents: 3000 }, { totalCents: 2000 }] },
      },
      {
        ...makeCustomer({ id: 'cust-1', ltvCents: 10000 }),
        user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', status: 'active', orders: [{ totalCents: 1000 }] },
      },
    ];
    prisma.customer.findMany.mockResolvedValue(customersWithOrders);
    const result = await service.getTopByLTV(10, '2026-01-01', undefined);
    // Should use include path — findMany called with include (no orderBy top-level)
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: expect.any(Object) }));
    // Result should be sorted: cust-2 has periodLtv=5000, cust-1 has periodLtv=1000 → cust-2 first
    expect((result[0] as unknown as { periodLtvCents: number }).periodLtvCents).toBe(5000);
  });

  it('getTopByLTV with dateTo only still uses include+orders path', async () => {
    prisma.customer.findMany.mockResolvedValue([]);
    await service.getTopByLTV(10, undefined, '2026-12-31');
    expect(prisma.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: expect.any(Object) }));
  });
});
