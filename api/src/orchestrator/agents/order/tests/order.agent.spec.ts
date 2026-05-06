import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'merchant'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: 'Show me recent orders',
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
  updateStatus: vi.fn().mockResolvedValue({ id: 'ord-1', status: 'shipped' }),
  updateStatusBulk: vi.fn().mockResolvedValue({ succeeded: ['ord-1'], failed: [] }),
  addTracking: vi.fn().mockResolvedValue({ id: 'ord-1', trackingNumber: 'TN1', status: 'shipped' }),
  cancel: vi.fn().mockResolvedValue({ id: 'ord-1', status: 'cancelled' }),
  refund: vi.fn().mockResolvedValue({ id: 'ord-1', status: 'refunded' }),
});

const makeAttentionService = (items: unknown[] = []) => ({
  summarize: vi.fn().mockResolvedValue(items),
});

const makeCustomerService = () => ({
  addTag: vi.fn().mockResolvedValue({ id: 'cust-1', tags: ['vip'] }),
});

async function collectOutputs(agent: { execute: (input: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) {
    outputs.push(o);
  }
  return outputs;
}

describe('OrderAgent', () => {
  it('emits text output for plain text LLM response', async () => {
    const { OrderAgent } = await import('../order.agent');
    const llm = makeLlm('Here are your recent orders.');
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, makeOrderService() as never, makeAttentionService() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    expect(outputs).toHaveLength(1);
    expect((outputs[0] as { type: string }).type).toBe('text');
  });

  it('dispatches order_list tool and emits order_list widget', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_list', arguments: { status: 'confirmed', limit: 10 } } });
    const llm = makeLlm(toolResponse);
    llm.complete
      .mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
      .mockResolvedValueOnce({ content: 'Done.', tokensIn: 5, tokensOut: 10 });
    const orderService = makeOrderService();
    orderService.list.mockResolvedValue([]);
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, orderService as never, makeAttentionService() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('order_list');
  });

  it('blocks write tools for shopper role', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_cancel', arguments: { orderId: 'ord-1' } } });
    const llm = makeLlm(toolResponse);
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, makeOrderService() as never, makeAttentionService() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(403);
  });

  it('emits error after exceeding MAX_TOOL_ITERATIONS', async () => {
    const { OrderAgent } = await import('../order.agent');
    // order_cancel returns {type:'data'} — does not short-circuit via widget, so loop runs to limit
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_cancel', arguments: { orderId: 'ord-1' } } });
    const llm = makeLlm(toolResponse);
    const orderService = makeOrderService();
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, orderService as never, makeAttentionService() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(500);
  });

  it('dispatches merchant_attention and emits attention_summary widget', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'merchant_attention', arguments: {} } });
    const llm = makeLlm(toolResponse);
    llm.complete
      .mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
      .mockResolvedValueOnce({ content: 'Here is what needs attention.', tokensIn: 5, tokensOut: 10 });
    const attentionItems = [
      { category: 'pending_refund', entityId: 'ord-1', label: 'Refund pending', urgencyScore: 90, metadata: {} },
    ];
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, makeOrderService() as never, makeAttentionService(attentionItems) as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('attention_summary');
  });

  it('returns data (not widget) for order_cancel', async () => {
    const { OrderAgent } = await import('../order.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'order_cancel', arguments: { orderId: 'ord-1' } } });
    const llm = makeLlm(toolResponse);
    llm.complete
      .mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
      .mockResolvedValueOnce({ content: 'Order has been cancelled.', tokensIn: 5, tokensOut: 10 });
    const agent = new OrderAgent(llm as never, makePromptLoader() as never, makeOrderService() as never, makeAttentionService() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const textOutputs = outputs.filter((o) => (o as { type: string }).type === 'text');
    expect(textOutputs).toHaveLength(1);
  });
});
