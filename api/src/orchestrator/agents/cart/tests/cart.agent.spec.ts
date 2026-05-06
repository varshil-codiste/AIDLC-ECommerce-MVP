import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartAgent } from '../cart.agent';
import type { CartService } from '../cart.service';
import type { PromptLoaderService } from '../../../prompts/prompt-loader.service';
import type { ILlmProvider } from '../../../llm/llm-provider.interface';
import type { AgentInput } from '../../../types/orchestrator.types';

const CART_ID = 'cart-1';
const USER_ID = 'user-1';

const makeEmptyEnrichedCart = () => ({
  cartId: CART_ID,
  items: [],
  totalCents: 0,
  currency: 'INR',
  itemCount: 0,
});

const makeEnrichedCart = () => ({
  cartId: CART_ID,
  items: [{ itemId: 'item-1', variantId: 'var-1', title: 'Nike Air Max', variantLabel: 'SKU-001', priceCents: 10000, currency: 'INR', quantity: 1, lineTotalCents: 10000 }],
  totalCents: 10000,
  currency: 'INR',
  itemCount: 1,
});

const makeInput = (overrides: Partial<AgentInput> = {}): AgentInput => ({
  requestId: 'req-1',
  conversationId: 'conv-1',
  user: { id: USER_ID, role: 'shopper' },
  message: 'Test message',
  budget: { maxTokensIn: 4000, maxTokensOut: 1000, softDeadlineMs: 10000 },
  ...overrides,
});

const makeToolCallResponse = (toolName: string, args: Record<string, unknown> = {}) =>
  JSON.stringify({ tool_call: { name: toolName, arguments: args } });

const makeLlm = (responseContent: string) => ({
  modelName: 'gpt-4o',
  complete: vi.fn().mockResolvedValue({ content: responseContent, tokensIn: 10, tokensOut: 20 }),
});

const makeCartService = () => ({
  getEnrichedCart: vi.fn().mockResolvedValue(makeEnrichedCart()),
  addItem: vi.fn().mockResolvedValue(makeEnrichedCart()),
  updateQty: vi.fn().mockResolvedValue(makeEnrichedCart()),
  removeItem: vi.fn().mockResolvedValue(makeEnrichedCart()),
  clearCart: vi.fn().mockResolvedValue(makeEmptyEnrichedCart()),
  getOrCreateCart: vi.fn().mockResolvedValue({ id: CART_ID }),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

describe('CartAgent', () => {
  let agent: CartAgent;
  let cartService: ReturnType<typeof makeCartService>;
  let llm: ReturnType<typeof makeLlm>;
  let promptLoader: ReturnType<typeof makePromptLoader>;

  beforeEach(() => {
    cartService = makeCartService();
    promptLoader = makePromptLoader();
    llm = makeLlm(makeToolCallResponse('cart_get'));
    agent = new CartAgent(
      llm as unknown as ILlmProvider,
      promptLoader as unknown as PromptLoaderService,
      cartService as unknown as CartService,
    );
  });

  it('cart_get tool call returns cart_summary widget', async () => {
    llm.complete.mockResolvedValue({ content: makeToolCallResponse('cart_get'), tokensIn: 10, tokensOut: 20 });
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'widget', widget: { type: 'cart_summary' } });
  });

  it('cart_add tool call returns cart_summary widget', async () => {
    llm.complete.mockResolvedValue({ content: makeToolCallResponse('cart_add', { variantId: 'var-1', quantity: 1 }), tokensIn: 10, tokensOut: 20 });
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'widget', widget: { type: 'cart_summary' } });
    expect(cartService.addItem).toHaveBeenCalledWith(USER_ID, 'var-1', 1);
  });

  it('cart_clear without confirmation intent emits confirmation_prompt widget', async () => {
    llm.complete.mockResolvedValue({ content: makeToolCallResponse('cart_clear'), tokensIn: 10, tokensOut: 20 });
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'widget', widget: { type: 'confirmation_prompt' } });
    expect(cartService.clearCart).not.toHaveBeenCalled();
  });

  it('merchant role returns 403 immediately without calling any tool', async () => {
    const outputs = [];
    for await (const out of agent.execute(makeInput({ user: { id: USER_ID, role: 'merchant' } }))) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'error', problem: { status: 403 } });
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
