import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { AuditLogService, sanitiseSnapshot } from './audit-log.service';
import * as ctx from '../common/context/request-context';

describe('sanitiseSnapshot', () => {
  it('strips passwordHash', () => {
    const result = sanitiseSnapshot({ id: '1', passwordHash: 'secret', name: 'Alice' });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toHaveProperty('name', 'Alice');
  });

  it('strips password_hash', () => {
    const result = sanitiseSnapshot({ password_hash: 'abc', role: 'shopper' });
    expect(result).not.toHaveProperty('password_hash');
    expect(result).toHaveProperty('role');
  });

  it('preserves non-sensitive keys', () => {
    const input = { id: 'u1', email: 'a@b.com', status: 'active' };
    expect(sanitiseSnapshot(input)).toEqual(input);
  });

  it('PBT: no sensitive key survives sanitiseSnapshot for any object', () => {
    const sensitiveKeys = ['passwordHash', 'password_hash', 'refreshTokenHash'];
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          passwordHash: fc.string(),
          password_hash: fc.string(),
          refreshTokenHash: fc.string(),
          name: fc.string(),
          role: fc.constantFrom('shopper', 'merchant', 'admin'),
        }),
        (obj) => {
          const result = sanitiseSnapshot(obj as Record<string, unknown>);
          for (const key of sensitiveKeys) {
            expect(result).not.toHaveProperty(key);
          }
          expect(result).toHaveProperty('name');
          expect(result).toHaveProperty('role');
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockTx: { auditLog: { create: ReturnType<typeof vi.fn> } };

  beforeEach(() => {
    service = new AuditLogService();
    mockTx = { auditLog: { create: vi.fn().mockResolvedValue({}) } };
  });

  it('inserts audit log with sanitised snapshots', async () => {
    vi.spyOn(ctx, 'getRequestContext').mockReturnValue({
      requestId: 'req-123',
      traceId: 'trace-abc',
      spanId: 'span-def',
    });

    await service.insert(mockTx as never, {
      actorUserId: 'user-1',
      actorRole: 'merchant',
      action: 'product.create',
      entity: 'products',
      entityId: 'prod-1',
      before: { passwordHash: 'secret', title: 'Old' },
      after: { title: 'New' },
    });

    const call = mockTx.auditLog.create.mock.calls[0][0];
    expect(call.data.action).toBe('product.create');
    expect(call.data.requestId).toBe('req-123');
    expect(call.data.traceId).toBe('trace-abc');
    expect(call.data.spanId).toBe('span-def');
    expect(call.data.before).not.toHaveProperty('passwordHash');
    expect(call.data.before).toHaveProperty('title', 'Old');
  });

  it('uses null requestId/traceId/spanId when AsyncLocalStorage has no store', async () => {
    vi.spyOn(ctx, 'getRequestContext').mockReturnValue(undefined);

    await service.insert(mockTx as never, {
      action: 'order.refund',
      entity: 'orders',
      entityId: 'ord-1',
    });

    const call = mockTx.auditLog.create.mock.calls[0][0];
    expect(call.data.requestId).toBeNull();
    expect(call.data.traceId).toBeNull();
    expect(call.data.spanId).toBeNull();
  });
});
