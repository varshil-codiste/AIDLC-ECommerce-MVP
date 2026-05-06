import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CheckoutAgent } from '../checkout.agent';
import type { CheckoutService } from '../checkout.service';
import type { PromptLoaderService } from '../../../prompts/prompt-loader.service';
import type { ILlmProvider } from '../../../llm/llm-provider.interface';
import type { AgentInput } from '../../../types/orchestrator.types';

const CART_ID = 'cart-1';
const USER_ID = 'user-1';

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

const makeCheckoutStartResult = (hasAddress = true) => ({
  cart: {
    cartId: CART_ID,
    items: [{ itemId: 'item-1', variantId: 'var-1', title: 'Nike Air Max', variantLabel: 'SKU-001', priceCents: 10000, currency: 'INR', quantity: 1, lineTotalCents: 10000 }],
    totalCents: 10000,
    currency: 'INR',
    itemCount: 1,
  },
  address: hasAddress ? { id: 'addr-1', line1: '123 Main St', city: 'Mumbai', state: 'MH', postalCode: '400001', countryCode: 'IN' } : null,
  totalCents: 10000,
  currency: 'INR',
});

const makeOrder = () => ({
  id: 'order-1',
  userId: USER_ID,
  status: 'confirmed',
  totalCents: 10000,
  currency: 'INR',
  placedAt: new Date(),
  shippingAddressId: 'addr-1',
  paymentRef: 'sim_123',
  trackingNumber: null,
  trackingCarrier: null,
  returnReason: null,
  returnRequestedAt: null,
  lastStatusChangeAt: new Date(),
});

const makeCheckoutService = () => ({
  checkoutStart: vi.fn().mockResolvedValue(makeCheckoutStartResult()),
  simulatePayment: vi.fn().mockReturnValue({ success: true }),
  createOrder: vi.fn().mockResolvedValue(makeOrder()),
});

const makePromptLoader = () => ({ get: vi.fn().mockReturnValue('system prompt') });

describe('CheckoutAgent', () => {
  let agent: CheckoutAgent;
  let checkoutService: ReturnType<typeof makeCheckoutService>;
  let llm: ReturnType<typeof makeLlm>;

  beforeEach(() => {
    checkoutService = makeCheckoutService();
    llm = makeLlm(makeToolCallResponse('checkout_start'));
    agent = new CheckoutAgent(
      llm as unknown as ILlmProvider,
      makePromptLoader() as unknown as PromptLoaderService,
      checkoutService as unknown as CheckoutService,
    );
  });

  it('checkout_start returns payment_widget', async () => {
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'widget', widget: { type: 'payment_widget' } });
    expect(checkoutService.checkoutStart).toHaveBeenCalledWith(USER_ID);
  });

  it('checkout_pay calls createOrder and returns order_card widget', async () => {
    llm.complete.mockResolvedValue({ content: makeToolCallResponse('checkout_pay', { cartId: CART_ID }), tokensIn: 10, tokensOut: 20 });
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'widget', widget: { type: 'order_card' } });
    expect(checkoutService.createOrder).toHaveBeenCalledWith(USER_ID, CART_ID);
  });

  it('checkout.empty_cart error is surfaced as error output', async () => {
    checkoutService.checkoutStart.mockRejectedValue(new Error('checkout.empty_cart'));
    const outputs = [];
    for await (const out of agent.execute(makeInput())) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'error', problem: { type: expect.stringContaining('checkout.empty_cart') } });
  });

  it('merchant role returns 403 without calling any tool', async () => {
    const outputs = [];
    for await (const out of agent.execute(makeInput({ user: { id: USER_ID, role: 'merchant' } }))) outputs.push(out);
    expect(outputs[0]).toMatchObject({ type: 'error', problem: { status: 403 } });
    expect(llm.complete).not.toHaveBeenCalled();
  });
});
