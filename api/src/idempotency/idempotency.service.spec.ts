import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { IdempotencyService } from './idempotency.service';

const makePrisma = (record: unknown = null) => ({
  idempotencyKey: {
    findFirst: vi.fn().mockResolvedValue(record),
    upsert: vi.fn().mockResolvedValue({}),
  },
  $executeRaw: vi.fn().mockResolvedValue(0),
});

describe('IdempotencyService.computeFingerprint', () => {
  it('is deterministic — same inputs produce same output', () => {
    const fp1 = IdempotencyService.computeFingerprint('POST', '/api/orders', { amount: 100 });
    const fp2 = IdempotencyService.computeFingerprint('POST', '/api/orders', { amount: 100 });
    expect(fp1).toBe(fp2);
  });

  it('differs on different body', () => {
    const fp1 = IdempotencyService.computeFingerprint('POST', '/api/orders', { amount: 100 });
    const fp2 = IdempotencyService.computeFingerprint('POST', '/api/orders', { amount: 200 });
    expect(fp1).not.toBe(fp2);
  });

  it('differs on different method', () => {
    const fp1 = IdempotencyService.computeFingerprint('POST', '/api/orders', {});
    const fp2 = IdempotencyService.computeFingerprint('PUT', '/api/orders', {});
    expect(fp1).not.toBe(fp2);
  });

  it('PBT: same inputs → same output for any combination', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('POST', 'PUT', 'PATCH'),
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.jsonValue(),
        (method, path, body) => {
          const fp1 = IdempotencyService.computeFingerprint(method, path, body);
          const fp2 = IdempotencyService.computeFingerprint(method, path, body);
          expect(fp1).toBe(fp2);
          expect(fp1).toHaveLength(64); // SHA-256 hex
        },
      ),
      { numRuns: 500 },
    );
  });

  it('PBT: different bodies produce different fingerprints (collision test)', () => {
    const seen = new Set<string>();
    fc.assert(
      fc.property(fc.jsonValue(), (body) => {
        const fp = IdempotencyService.computeFingerprint('POST', '/test', body);
        seen.add(fp);
        return true;
      }),
      { numRuns: 200 },
    );
    expect(seen.size).toBeGreaterThan(50);
  });
});

describe('IdempotencyService.check', () => {
  let service: IdempotencyService;

  beforeEach(() => {
    service = new IdempotencyService(makePrisma() as never);
  });

  it('returns hit:false on miss', async () => {
    const result = await service.check('key-1', 'user-1', 'fp-1');
    expect(result).toEqual({ hit: false });
  });

  it('returns cached response on hit with matching fingerprint', async () => {
    const record = {
      key: 'key-1',
      userId: 'user-1',
      requestFingerprint: 'fp-1',
      responseStatus: 201,
      responseBody: { id: 'order-1' },
      createdAt: new Date(),
    };
    const prisma = makePrisma(record);
    service = new IdempotencyService(prisma as never);

    const result = await service.check('key-1', 'user-1', 'fp-1');
    expect(result).toEqual({ hit: true, responseStatus: 201, responseBody: { id: 'order-1' } });
  });

  it('returns fingerprint_mismatch on same key different fingerprint', async () => {
    const record = {
      key: 'key-1',
      userId: 'user-1',
      requestFingerprint: 'fp-original',
      responseStatus: 200,
      responseBody: {},
      createdAt: new Date(),
    };
    const prisma = makePrisma(record);
    service = new IdempotencyService(prisma as never);

    const result = await service.check('key-1', 'user-1', 'fp-different');
    expect(result).toEqual({ conflict: true, reason: 'fingerprint_mismatch' });
  });

  it('returns expired on old key', async () => {
    const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h ago
    const record = {
      key: 'old-key',
      userId: 'user-1',
      requestFingerprint: 'fp-1',
      responseStatus: 200,
      responseBody: {},
      createdAt: oldDate,
    };
    const prisma = makePrisma(record);
    service = new IdempotencyService(prisma as never);

    const result = await service.check('old-key', 'user-1', 'fp-1');
    expect(result).toEqual({ conflict: true, reason: 'expired' });
  });
});

describe('IdempotencyService.save', () => {
  it('upserts a new key record', async () => {
    const prisma = makePrisma();
    const service = new IdempotencyService(prisma as never);
    await service.save('key-1', 'user-1', 'fp-1', 201, { id: 'order-1' });
    expect(prisma.idempotencyKey.upsert).toHaveBeenCalledOnce();
    const call = prisma.idempotencyKey.upsert.mock.calls[0][0];
    expect(call.create.key).toBe('key-1');
    expect(call.create.responseStatus).toBe(201);
  });
});

describe('IdempotencyService.cleanup', () => {
  it('executes a DELETE via raw SQL', async () => {
    const prisma = makePrisma();
    const service = new IdempotencyService(prisma as never);
    await service.cleanup();
    expect(prisma.$executeRaw).toHaveBeenCalledOnce();
  });
});
