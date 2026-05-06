import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'shopper'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: "where's my order",
  priorContext: [],
  budget: { maxTokensIn: 4000, maxTokensOut: 800, softDeadlineMs: 8000 },
});

const makeLlm = (response: string) => ({
  modelName: 'gpt-4o-mini',
  complete: vi.fn().mockResolvedValue({ content: response, tokensIn: 10, tokensOut: 20 }),
  streamCompletion: vi.fn(),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

const makeOrderService = () => ({
  list: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  updateStatus: vi.fn(),
  updateStatusBulk: vi.fn(),
  addTracking: vi.fn(),
  cancel: vi.fn(),
  refund: vi.fn(),
  getTracking: vi.fn().mockResolvedValue({
    orderId: 'ord-1',
    status: 'shipped',
    trackingNumber: 'TN1',
    trackingCarrier: 'BlueDart',
    events: [
      { label: 'Placed', timestamp: '2026-04-01T10:00:00Z' },
      { label: 'Shipped', timestamp: '2026-04-02T10:00:00Z', detail: 'BlueDart — TN1' },
    ],
  }),
  startReturn: vi.fn().mockResolvedValue({
    id: 'ord-1',
    status: 'return_requested',
    totalCents: 5000,
    currency: 'INR',
    placedAt: new Date('2026-04-01T10:00:00Z'),
    trackingNumber: null,
    trackingCarrier: null,
  }),
});

const makeAttentionService = () => ({ summarize: vi.fn().mockResolvedValue([]) });
const makeCustomerService = () => ({ addTag: vi.fn() });

async function collectOutputs(agent: { execute: (i: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) outputs.push(o);
  return outputs;
}

describe('OrderAgent — shopper-mode (UoW-11)', () => {
  it('order_get_tracking emits tracking_widget on success', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_get_tracking', arguments: { orderId: 'ord-1' } } });
    const llm = makeLlm(toolResponse);
    const agent = new OrderAgent(
      llm as never,
      makePromptLoader() as never,
      makeOrderService() as never,
      makeAttentionService() as never,
      makeCustomerService() as never,
    );
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('tracking_widget');
  });

  it('order_get_tracking returns 404 error when order not found', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_get_tracking', arguments: { orderId: 'ord-other' } } });
    const llm = makeLlm(toolResponse);
    const orderService = makeOrderService();
    orderService.getTracking.mockResolvedValue(null);
    const agent = new OrderAgent(
      llm as never,
      makePromptLoader() as never,
      orderService as never,
      makeAttentionService() as never,
      makeCustomerService() as never,
    );
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number; title: string } }).problem.status).toBe(404);
    expect((errors[0] as { problem: { status: number; title: string } }).problem.title).toContain("don't see that order");
  });

  it('order_start_return emits order_card with return_requested status', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({
      tool_call: { name: 'order_start_return', arguments: { orderId: 'ord-1', reason: 'too small' } },
    });
    const llm = makeLlm(toolResponse);
    const agent = new OrderAgent(
      llm as never,
      makePromptLoader() as never,
      makeOrderService() as never,
      makeAttentionService() as never,
      makeCustomerService() as never,
    );
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    const w = (widgets[0] as { widget: { type: string; data: { status: string } } }).widget;
    expect(w.type).toBe('order_card');
    expect(w.data.status).toBe('return_requested');
  });

  it('order_start_return surfaces error when service throws invalid_status', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({
      tool_call: { name: 'order_start_return', arguments: { orderId: 'ord-1', reason: 'too small' } },
    });
    const llm = makeLlm(toolResponse);
    const orderService = makeOrderService();
    orderService.startReturn.mockRejectedValue(new Error('order_return.invalid_status: shipped'));
    const agent = new OrderAgent(
      llm as never,
      makePromptLoader() as never,
      orderService as never,
      makeAttentionService() as never,
      makeCustomerService() as never,
    );
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { title: string } }).problem.title).toContain('invalid_status');
  });
});
