import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderService } from '../order.service';
import type { PrismaService } from '../../../../prisma/prisma.service';
import type { AuditLogService } from '../../../../audit/audit-log.service';

const makeOrder = (overrides: Record<string, unknown> = {}) => ({
  id: 'ord-1',
  userId: 'user-1',
  status: 'delivered',
  totalCents: 5000,
  currency: 'INR',
  trackingNumber: 'TN123',
  trackingCarrier: 'BlueDart',
  placedAt: new Date('2026-04-01T10:00:00Z'),
  lastStatusChangeAt: new Date('2026-04-05T10:00:00Z'),
  returnRequestedAt: null,
  returnReason: null,
  ...overrides,
});

const makePrisma = () => ({
  order: {
    findFirst: vi.fn().mockResolvedValue(null),
    findUnique: vi.fn().mockResolvedValue(null),
    update: vi.fn(),
  },
  $transaction: vi.fn().mockImplementation((fn: (tx: unknown) => Promise<unknown>) =>
    fn({
      order: { update: vi.fn().mockResolvedValue(makeOrder({ status: 'return_requested', returnReason: 'too small' })) },
      auditLog: { create: vi.fn() },
      agentEvent: { create: vi.fn().mockResolvedValue({ id: 'evt-1' }) },
    }),
  ),
});

const makeAudit = () => ({ insert: vi.fn().mockResolvedValue(undefined) });

describe('OrderService.getTracking', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: OrderService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
  });

  it('returns null when order does not exist', async () => {
    const result = await service.getTracking('user-1', 'ord-missing');
    expect(result).toBeNull();
  });

  it('returns null when order belongs to another user (anti-enumeration)', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    const result = await service.getTracking('user-1', 'ord-other');
    expect(result).toBeNull();
  });

  it('returns tracking for owned order with synthesized events', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder());
    const result = await service.getTracking('user-1', 'ord-1');
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe('ord-1');
    expect(result!.events.length).toBeGreaterThanOrEqual(2);
    expect(result!.events[0].label).toBe('Placed');
  });

  it('without orderId returns most-recent order for the user', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder());
    await service.getTracking('user-1');
    expect(prisma.order.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { placedAt: 'desc' },
      }),
    );
  });
});

describe('OrderService.startReturn', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: OrderService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new OrderService(prisma as unknown as PrismaService, makeAudit() as unknown as AuditLogService);
  });

  it('throws reason_required when reason is empty', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder());
    await expect(service.startReturn('user-1', 'ord-1', '')).rejects.toThrow('order_return.reason_required');
  });

  it('throws reason_required when reason is too short', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder());
    await expect(service.startReturn('user-1', 'ord-1', 'no')).rejects.toThrow('order_return.reason_required');
  });

  it('throws order.not_found when order missing or not owned', async () => {
    prisma.order.findFirst.mockResolvedValue(null);
    await expect(service.startReturn('user-1', 'ord-1', 'too small')).rejects.toThrow('order.not_found');
  });

  it('throws invalid_status when order is not delivered', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'shipped' }));
    await expect(service.startReturn('user-1', 'ord-1', 'wrong size')).rejects.toThrow('order_return.invalid_status');
  });

  it('is idempotent when order is already return_requested', async () => {
    const existing = makeOrder({ status: 'return_requested', returnReason: 'previous reason' });
    prisma.order.findFirst.mockResolvedValue(existing);
    const result = await service.startReturn('user-1', 'ord-1', 'new reason');
    expect(result).toBe(existing);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('happy path transitions delivered → return_requested in transaction', async () => {
    prisma.order.findFirst.mockResolvedValue(makeOrder({ status: 'delivered' }));
    const result = await service.startReturn('user-1', 'ord-1', 'too small');
    expect(prisma.$transaction).toHaveBeenCalled();
    expect((result as { status: string }).status).toBe('return_requested');
  });
});
