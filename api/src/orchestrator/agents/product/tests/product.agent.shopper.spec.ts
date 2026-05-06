import { describe, it, expect, vi } from 'vitest';
import type { AgentInput } from '../../../types/orchestrator.types';

const makeInput = (role: 'merchant' | 'shopper' = 'shopper'): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: 'user-1', role },
  message: 'show me running shoes',
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
  search: vi.fn().mockResolvedValue({
    products: [
      { id: 'p-1', title: 'Running shoe', priceCents: 4999, currency: 'INR', categoryId: null, status: 'active', imageUrls: ['url-1'], description: null },
    ],
    usedFallback: false,
  }),
  compareByIds: vi.fn().mockResolvedValue({
    products: [
      { id: 'p-1', title: 'A', priceCents: 100, currency: 'INR', description: null, imageUrls: [], categoryName: 'Shoes', attributes: { color: 'red' } },
      { id: 'p-2', title: 'B', priceCents: 200, currency: 'INR', description: null, imageUrls: [], categoryName: 'Shoes', attributes: { color: 'blue' } },
    ],
    differingAttributes: ['color'],
  }),
});

async function collectOutputs(agent: { execute: (i: AgentInput) => AsyncIterable<unknown> }, input: AgentInput) {
  const outputs = [];
  for await (const o of agent.execute(input)) outputs.push(o);
  return outputs;
}

describe('ProductAgent — shopper-mode (UoW-11)', () => {
  it('product_search dispatches and emits product_carousel widget', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_search', arguments: { query: 'running shoes' } } });
    const llm = makeLlm(toolResponse);
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('product_carousel');
  });

  it('product_search includes usedFallback flag in widget data', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_search', arguments: { query: 'shoes' } } });
    const llm = makeLlm(toolResponse);
    const productService = makeProductService();
    productService.search.mockResolvedValue({
      products: [{ id: 'p-1', title: 'Shoe', priceCents: 100, currency: 'INR', categoryId: null, status: 'active', imageUrls: [], description: null }],
      usedFallback: true,
    });
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, productService as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const widget = outputs.find((o) => (o as { type: string }).type === 'widget') as { widget: { data: { usedFallback: boolean } } };
    expect(widget.widget.data.usedFallback).toBe(true);
  });

  it('product_compare dispatches and emits product_comparison widget', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_compare', arguments: { productIds: ['p-1', 'p-2'] } } });
    const llm = makeLlm(toolResponse);
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const widgets = outputs.filter((o) => (o as { type: string }).type === 'widget');
    expect(widgets).toHaveLength(1);
    expect((widgets[0] as { widget: { type: string } }).widget.type).toBe('product_comparison');
  });

  it('product_search filters are passed to service.search', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({
      tool_call: { name: 'product_search', arguments: { query: 'shoes', maxPriceCents: 5000, categoryId: 'cat-1' } },
    });
    const llm = makeLlm(toolResponse);
    const productService = makeProductService();
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, productService as never);
    await collectOutputs(agent, makeInput('shopper'));
    expect(productService.search).toHaveBeenCalledWith(
      'shoes',
      expect.objectContaining({ maxPriceCents: 5000, categoryId: 'cat-1' }),
      expect.any(Number),
    );
  });

  it('shopper can call read tools without 403', async () => {
    const { ProductAgent } = await import('../product.agent');
    const toolResponse = JSON.stringify({ tool_call: { name: 'product_search', arguments: { query: 'shoes' } } });
    const llm = makeLlm(toolResponse);
    const agent = new ProductAgent(llm as never, makePromptLoader() as never, makeProductService() as never);
    const outputs = await collectOutputs(agent, makeInput('shopper'));
    const errors = outputs.filter((o) => (o as { type: string }).type === 'error');
    expect(errors).toHaveLength(0);
  });
});
