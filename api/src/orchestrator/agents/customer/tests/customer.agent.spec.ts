import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'merchant'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: 'Search for customers named Alice',
  priorContext: [],
  budget: { maxTokensIn: 4000, maxTokensOut: 800, softDeadlineMs: 8000 },
});

const makeLlm = (response: string) => ({
  modelName: 'gpt-4o-mini',
  complete: vi.fn().mockResolvedValue({ content: response, tokensIn: 10, tokensOut: 20 }),
  streamCompletion: vi.fn(),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

const makeCustomer = () => ({
  id: 'cust-1',
  ltvCents: 50000,
  orderCount: 5,
  tags: ['loyal'],
  user: { id: 'user-1', email: 'alice@example.com', name: 'Alice', status: 'active' },
});

const makeCustomerService = () => ({
  search: vi.fn().mockResolvedValue([makeCustomer()]),
  getById: vi.fn().mockResolvedValue(makeCustomer()),
  getTopByLTV: vi.fn().mockResolvedValue([]),
  addTag: vi.fn().mockResolvedValue({ id: 'cust-1', tags: ['loyal', 'vip'] }),
  anonymize: vi.fn().mockResolvedValue({ customerId: 'cust-1', anonymized: true }),
});

async function collectOutputs(agent: { execute: (input: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) {
    outputs.push(o);
  }
  return outputs;
}

describe('CustomerAgent', () => {
  it('emits text output for plain text LLM response', async () => {
    const { CustomerAgent } = await import('../customer.agent');
    const llm = makeLlm('Here are your customers.');
    const agent = new CustomerAgent(llm as never, makePromptLoader() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    expect(outputs).toHaveLength(1);
    expect((outputs[0] as { type: string }).type).toBe('text');
  });

  it('dispatches customer_search and emits customer_card widget', async () => {
    const { CustomerAgent } = await import('../customer.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'customer_search', arguments: { query: 'Alice', limit: 5 } } });
    const llm = makeLlm(toolResponse);
    llm.complete
      .mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
      .mockResolvedValueOnce({ content: 'Found 1 customer.', tokensIn: 5, tokensOut: 10 });
    const agent = new CustomerAgent(llm as never, makePromptLoader() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('customer_card');
  });

  it('blocks write tools for shopper role', async () => {
    const { CustomerAgent } = await import('../customer.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'customer_anonymize', arguments: { customerId: 'cust-1' } } });
    const llm = makeLlm(toolResponse);
    const agent = new CustomerAgent(llm as never, makePromptLoader() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(403);
  });

  it('emits error after exceeding MAX_TOOL_ITERATIONS', async () => {
    const { CustomerAgent } = await import('../customer.agent');
    // customer_add_tag returns {type:'data'} — does not short-circuit via widget, so loop runs to limit
    const toolResponse = JSON.stringify({ tool_call: { name: 'customer_add_tag', arguments: { customerId: 'cust-1', tags: ['vip'] } } });
    const llm = makeLlm(toolResponse);
    const agent = new CustomerAgent(llm as never, makePromptLoader() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(500);
  });

  it('dispatches customer_get and emits single customer_card widget', async () => {
    const { CustomerAgent } = await import('../customer.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'customer_get', arguments: { customerId: 'cust-1' } } });
    const llm = makeLlm(toolResponse);
    llm.complete
      .mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
      .mockResolvedValueOnce({ content: 'Customer found.', tokensIn: 5, tokensOut: 10 });
    const agent = new CustomerAgent(llm as never, makePromptLoader() as never, makeCustomerService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('customer_card');
  });
});
