import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BadRequestException, ConflictException, ExecutionContext } from '@nestjs/common';
import { IdempotencyGuard } from './idempotency.guard';

const makeContext = (
  headers: Record<string, string>,
  user?: { sub: string },
  body = {},
): ExecutionContext => {
  const req = { headers, user, method: 'POST', path: '/test', body };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    getHandler: () => ({}),
  } as unknown as ExecutionContext;
};

const makeReflector = (isIdempotent: boolean) => ({
  get: vi.fn().mockReturnValue(isIdempotent),
});

describe('IdempotencyGuard', () => {
  let idempotencyService: {
    check: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    idempotencyService = {
      check: vi.fn(),
      save: vi.fn(),
    };
  });

  it('passes through if handler is not marked @Idempotent()', async () => {
    const guard = new IdempotencyGuard(
      makeReflector(false) as never,
      idempotencyService as never,
    );
    const ctx = makeContext({});
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(idempotencyService.check).not.toHaveBeenCalled();
  });

  it('throws 400 if Idempotency-Key header is missing', async () => {
    const guard = new IdempotencyGuard(
      makeReflector(true) as never,
      idempotencyService as never,
    );
    const ctx = makeContext({}, { sub: 'user-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(BadRequestException);
  });

  it('short-circuits and writes cached response on hit', async () => {
    idempotencyService.check.mockResolvedValue({
      hit: true,
      responseStatus: 201,
      responseBody: { id: 'order-1' },
    });
    const guard = new IdempotencyGuard(
      makeReflector(true) as never,
      idempotencyService as never,
    );
    const ctx = makeContext({ 'idempotency-key': 'key-abc' }, { sub: 'user-1' });
    const res = ctx.switchToHttp().getResponse() as { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
    const result = await guard.canActivate(ctx);
    expect(result).toBe(false);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 'order-1' });
  });

  it('throws 409 on fingerprint mismatch', async () => {
    idempotencyService.check.mockResolvedValue({
      conflict: true,
      reason: 'fingerprint_mismatch',
    });
    const guard = new IdempotencyGuard(
      makeReflector(true) as never,
      idempotencyService as never,
    );
    const ctx = makeContext({ 'idempotency-key': 'key-abc' }, { sub: 'user-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ConflictException);
  });

  it('passes through on miss and attaches key metadata to request', async () => {
    idempotencyService.check.mockResolvedValue({ hit: false });
    const guard = new IdempotencyGuard(
      makeReflector(true) as never,
      idempotencyService as never,
    );
    const ctx = makeContext({ 'idempotency-key': 'key-new' }, { sub: 'user-1' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });
});
