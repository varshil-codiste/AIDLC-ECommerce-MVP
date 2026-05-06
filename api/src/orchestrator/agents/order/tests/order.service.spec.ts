import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'ord-1', status: 'confirmed', totalCents: 5000, currency: 'INR',
  placedAt: new Date('2026-01-01'), lastStatusChangeAt: new Date(), trackingNumber: null, trackingCarrier: null,
  ...overrides,
});

const makePrisma = () => ({
  order: {
    findUnique: vi.fn().mockResolvedValue(null),
    findMany: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockResolvedValue(makeOrder()),
  },
  productVariant: { findMany: vi.fn().mockResolvedValue([]) },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      order: { update: vi.fn().mockResolvedValue(makeOrder({ status: 'shipped', trackingNumber: 'TN1' })) },
      productVariant: {},
      outboxEvent: { create: vi.fn().mockResolvedValue({}) },
      auditLog: { create: vi.fn() },
    }),
  ),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });

describe('OrderService', () => {
  let service: OrderService;
  let prisma: ReturnType<typeof makePrisma>;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
  });

  it('list calls prisma.order.findMany with status filter', async () => {
    await service.list({ status: 'confirmed', limit: 5 });
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'confirmed' }),
      take: 5,
    }));
  });

  it('getById calls prisma.order.findUnique', async () => {
    await service.getById('ord-1');
    expect(prisma.order.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ord-1' } }));
  });

  it('updateStatus throws order.not_found when order missing', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.updateStatus('ord-x', 'shipped', 'u1', 'merchant')).rejects.toThrow('order.not_found');
  });

  it('updateStatus throws order.invalid_transition for bad transition', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'delivered' }));
    await expect(service.updateStatus('ord-1', 'cancelled', 'u1', 'merchant')).rejects.toThrow('order.invalid_transition');
  });

  it('updateStatus calls $transaction for valid transition', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'confirmed' }));
    await service.updateStatus('ord-1', 'shipped', 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('updateStatusBulk returns partial success results', async () => {
    const service2 = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
    vi.spyOn(service2, 'updateStatus')
      .mockResolvedValueOnce(makeOrder({ status: 'shipped' }) as never)
      .mockRejectedValueOnce(new Error('order.invalid_transition'));

    const result = await service2.updateStatusBulk(['ord-1', 'ord-2'], 'shipped', undefined, undefined, 'u1', 'merchant');
    expect(result.succeeded).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toContain('order.invalid_transition');
  });

  it('updateStatusBulk caps at 50 orders', async () => {
    const service2 = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
    vi.spyOn(service2, 'updateStatus').mockResolvedValue(makeOrder() as never);
    const ids = Array.from({ length: 60 }, (_, i) => `ord-${i}`);
    await service2.updateStatusBulk(ids, 'confirmed', undefined, undefined, 'u1', 'merchant');
    expect(service2.updateStatus).toHaveBeenCalledTimes(50);
  });

  it('addTracking throws order.not_found when order missing', async () => {
    prisma.order.findUnique.mockResolvedValue(null);
    await expect(service.addTracking('ord-x', 'TN1', 'FedEx', 'u1', 'merchant')).rejects.toThrow('order.not_found');
  });

  it('addTracking calls $transaction when order is confirmed', async () => {
    prisma.order.findUnique.mockResolvedValue(makeOrder({ status: 'confirmed' }));
    await service.addTracking('ord-1', 'TN1', 'BlueDart', 'u1', 'merchant');
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('cancel delegates to updateStatus with cancelled', async () => {
    const service2 = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
    vi.spyOn(service2, 'updateStatus').mockResolvedValue(makeOrder({ status: 'cancelled' }) as never);
    await service2.cancel('ord-1', 'u1', 'merchant');
    expect(service2.updateStatus).toHaveBeenCalledWith('ord-1', 'cancelled', 'u1', 'merchant');
  });

  it('refund delegates to updateStatus with refunded', async () => {
    const service2 = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
    vi.spyOn(service2, 'updateStatus').mockResolvedValue(makeOrder({ status: 'refunded' }) as never);
    await service2.refund('ord-1', 'customer request', 'u1', 'merchant');
    expect(service2.updateStatus).toHaveBeenCalledWith('ord-1', 'refunded', 'u1', 'merchant');
  });
});
