import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmationGuard } from '../confirmation/confirmation.guard';
import type { ConfirmationService } from '../confirmation/confirmation.service';
import type { ExecutionContext } from '@nestjs/common';

const makeContext = (body: object, userId = 'u1') =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({ body, user: { id: userId } }),
    }),
  }) as unknown as ExecutionContext;

const makeConfirmationService = () => ({
  retrieve: vi.fn().mockResolvedValue(null),
  consume: vi.fn().mockResolvedValue(null),
  store: vi.fn(),
  cancel: vi.fn(),
});

describe('ConfirmationGuard', () => {
  let guard: ConfirmationGuard;
  let service: ReturnType<typeof makeConfirmationService>;

  beforeEach(() => {
    service = makeConfirmationService();
    guard = new ConfirmationGuard(service as unknown as ConfirmationService);
  });

  it('passes non-destructive intents through', async () => {
    const ctx = makeContext({ intent: { intent: 'cart.add' }, conversationId: 'c1' });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('passes confirmation.confirm through regardless', async () => {
    const ctx = makeContext({
      intent: { intent: 'confirmation.confirm' },
      conversationId: 'c1',
      intentId: 'id1',
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('passes confirmation.cancel through regardless', async () => {
    const ctx = makeContext({
      intent: { intent: 'confirmation.cancel' },
      conversationId: 'c1',
      intentId: 'id1',
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('marks destructive intent without intentId as requiresConfirmation', async () => {
    const req = {
      body: { intent: { intent: 'cart.clear' }, conversationId: 'c1' },
      user: { id: 'u1' },
    };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect((req as Record<string, unknown>)['requiresConfirmation']).toBe(true);
  });

  it('marks mismatched user confirmation as requiresConfirmation', async () => {
    service.retrieve.mockResolvedValue({
      userId: 'u-other',
      originalIntent: { intent: 'order.refund' },
    });
    const req = {
      body: { intent: { intent: 'order.refund' }, conversationId: 'c1', intentId: 'id1' },
      user: { id: 'u1' },
    };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
    await guard.canActivate(ctx);
    expect((req as Record<string, unknown>)['requiresConfirmation']).toBe(true);
  });
});
