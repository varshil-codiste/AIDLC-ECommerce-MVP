import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';
import { OutboxService } from './outbox.service';
import { AgentEventPayload } from './types/agent-event-payload.types';

const makeTx = () => ({
  agentEvent: { create: vi.fn().mockResolvedValue({}) },
});

describe('OutboxService.buildPayload', () => {
  it('returns an object identical to input (pure, no mutation)', () => {
    const payload: AgentEventPayload = {
      eventType: 'order.created',
      orderId: 'o-1',
      userId: 'u-1',
      totalCents: 500,
      currency: 'INR',
      timestamp: new Date().toISOString(),
    };
    const result = OutboxService.buildPayload(payload);
    expect(result).toEqual(payload);
  });

  it('PBT: buildPayload is pure — same input → same output', () => {
    const orderPayload: AgentEventPayload = {
      eventType: 'order.created',
      orderId: 'o-1',
      userId: 'u-1',
      totalCents: 100,
      currency: 'INR',
      timestamp: '2026-01-01T00:00:00Z',
    };
    fc.assert(
      fc.property(fc.constant(orderPayload), (p) => {
        const r1 = OutboxService.buildPayload(p);
        const r2 = OutboxService.buildPayload(p);
        expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
      }),
      { numRuns: 100 },
    );
  });

  it('payload contains no email, name, or address fields', () => {
    const payload: AgentEventPayload = {
      eventType: 'customer.tagged',
      customerId: 'c-1',
      userId: 'u-1',
    };
    const result = OutboxService.buildPayload(payload);
    expect(result).not.toHaveProperty('email');
    expect(result).not.toHaveProperty('name');
    expect(result).not.toHaveProperty('address');
  });
});

describe('OutboxService.emit', () => {
  it('inserts into agent_events via tx', async () => {
    const service = new OutboxService();
    const tx = makeTx();
    const payload: AgentEventPayload = {
      eventType: 'product.created',
      productId: 'p-1',
    };

    await service.emit(tx as never, 'product.created', payload, 'product_agent');

    expect(tx.agentEvent.create).toHaveBeenCalledOnce();
    const call = tx.agentEvent.create.mock.calls[0][0];
    expect(call.data.eventType).toBe('product.created');
    expect(call.data.emittedByModule).toBe('product_agent');
  });
});
