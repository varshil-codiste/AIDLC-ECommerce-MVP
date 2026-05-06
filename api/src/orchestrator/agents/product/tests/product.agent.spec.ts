import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'merchant'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: 'Add a product: Blue Mug, ₹200, 50 in stock',
  priorContext: [],
  budget: { maxTokensIn: 4000, maxTokensOut: 800, softDeadlineMs: 8000 },
});

const makeLlm = (response: string) => ({
  modelName: 'gpt-4o-mini',
  complete: vi.fn().mockResolvedValue({ content: response, tokensIn: 10, tokensOut: 20 }),
  streamCompletion: vi.fn(),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

const makeProductService = () => ({
  search: vi.fn().mockResolvedValue([]),
  getById: vi.fn().mockResolvedValue(null),
  listCategories: vi.fn().mockResolvedValue([]),
  create: vi.fn().mockResolvedValue({ id: 'p-1', title: 'Blue Mug', priceCents: 20000, currency: 'INR', description: null, categoryId: null, imageUrls: [], variants: [{ stock: 50 }] }),
  update: vi.fn().mockResolvedValue({ id: 'p-1', title: 'Blue Mug', priceCents: 22000, currency: 'INR', description: null, categoryId: null, imageUrls: [] }),
  updateStock: vi.fn().mockResolvedValue({ id: 'v-1', stock: 30 }),
  archive: vi.fn().mockResolvedValue({ id: 'p-1', status: 'archived' }),
  bulkCreate: vi.fn().mockResolvedValue({ succeeded: [], failed: [] }),
});

// Helper to collect all outputs from async iterable
async function collectOutputs(agent: { execute: (input: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) {
    outputs.push(o);
  }
  return outputs;
}

describe('ProductAgent', () => {
  it('emits text output for plain text LLM response', async () => {
    const { ProductAgent } = await import('../product.agent');
    const llm = makeLlm('Here is your product information.');
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    expect(outputs).toHaveLength(1);
    expect((outputs[0] as { type: string }).type).toBe('text');
  });

  it('dispatches product_create tool and emits widget', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_create', arguments: { title: 'Blue Mug', priceCents: 20000, stock: 50 } } });
    const llm = makeLlm(toolResponse);
    // Second call (after tool result) returns text
    llm.complete.mockResolvedValueOnce({ content: toolResponse, tokensIn: 10, tokensOut: 20 })
               .mockResolvedValueOnce({ content: 'Product created!', tokensIn: 5, tokensOut: 10 });
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgetOutputs = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgetOutputs).toHaveLength(1);
    expect((widgetOutputs[0] as { widget: { type: string } }).widget.type).toBe('product_edit_preview');
  });

  it('blocks write tools for shopper role', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_create', arguments: { title: 'Mug', priceCents: 100, stock: 5 } } });
    const llm = makeLlm(toolResponse);
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(403);
  });

  it('emits error after exceeding MAX_TOOL_ITERATIONS', async () => {
    const { ProductAgent } = await import('../product.agent');
    // Always returns a tool call, never text — forces loop limit
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_list_categories', arguments: {} } });
    const llm = makeLlm(toolResponse);
    const productService = makeProductService();
    productService.listCategories.mockResolvedValue([]);
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, productService as never);
    const outputs = await collectOutputs(agent, makeInput());
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(1);
    expect((errors[0] as { problem: { status: number } }).problem.status).toBe(500);
  });

  it('emits bulk_product_preview widget for bulk create', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({
      tool_call: {
        name: 'product_bulk_create',
        arguments: { products: [{ title: 'Mug 1', priceCents: 20000, stock: 10 }] },
      },
    });
    const llm = makeLlm(toolResponse);
    const productService = makeProductService();
    productService.bulkCreate.mockResolvedValue({
      succeeded: [{ title: 'Mug 1', productId: 'p-1' }],
      failed: [],
    });
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, productService as never);
    const outputs = await collectOutputs(agent, makeInput());
    const widgetOutputs = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgetOutputs).toHaveLength(1);
    expect((widgetOutputs[0] as { widget: { type: string } }).widget.type).toBe('bulk_product_preview');
  });
});
