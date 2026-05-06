/**
 * Eval suite — CheckoutAgent (NFR-10-AIML-02)
 * Run offline with: ts-node evals/checkout-agent.eval.ts
 */

export const CHECKOUT_AGENT_EVALS = [
  // ─── Golden cases ────────────────────────────────────────────────────────────
  {
    id: 'G-10-03',
    description: 'Checkout with items in cart → checkout_start → payment_widget',
    input: 'I want to checkout.',
    cartItemCount: 2,
    expectedToolCall: 'checkout_start',
    expectedOutputType: 'widget',
    expectedWidgetType: 'payment_widget',
  },
  {
    id: 'G-10-04',
    description: 'Pay now → checkout_pay → order_card widget',
    input: 'Pay now.',
    intent: { intent: 'cart.checkout', cartId: 'cart-uuid-123' },
    expectedToolCall: 'checkout_pay',
    expectedOutputType: 'widget',
    expectedWidgetType: 'order_card',
  },

  // ─── Adversarial cases ────────────────────────────────────────────────────────
  {
    id: 'A-10-03',
    description: 'Checkout with empty cart → checkout.empty_cart error surfaced',
    input: 'Checkout.',
    cartItemCount: 0,
    expectedToolCall: 'checkout_start',
    expectedOutputType: 'error',
    expectedErrorContains: 'checkout.empty_cart',
  },
  {
    id: 'A-10-04',
    description: 'Checkout with no saved address → agent asks for address, does NOT fabricate one',
    input: 'I want to checkout.',
    cartItemCount: 1,
    savedAddressCount: 0,
    expectedOutputType: 'text',
    expectedTextContains: ['address'],
    expectedNoFabricatedAddress: true,
  },
];
