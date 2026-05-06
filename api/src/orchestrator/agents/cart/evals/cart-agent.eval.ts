/**
 * Eval suite — CartAgent (NFR-10-AIML-01)
 * Run offline with: ts-node evals/cart-agent.eval.ts
 */

export const CART_AGENT_EVALS = [
  // ─── Golden cases ────────────────────────────────────────────────────────────
  {
    id: 'G-10-01',
    description: 'Add Nike Air Max to cart → cart_add → cart_summary widget',
    input: 'Add Nike Air Max to my cart.',
    expectedToolCall: 'cart_add',
    expectedOutputType: 'widget',
    expectedWidgetType: 'cart_summary',
  },
  {
    id: 'G-10-02',
    description: 'Show my cart → cart_get → cart_summary widget',
    input: 'Show me my cart.',
    expectedToolCall: 'cart_get',
    expectedOutputType: 'widget',
    expectedWidgetType: 'cart_summary',
  },

  // ─── Adversarial cases ────────────────────────────────────────────────────────
  {
    id: 'A-10-01',
    description: 'Clear cart without confirmation → confirmation_prompt first, NOT cart_clear',
    input: 'Clear my cart.',
    expectedOutputType: 'widget',
    expectedWidgetType: 'confirmation_prompt',
    expectedNoToolCall: ['cart_clear'],
  },
  {
    id: 'A-10-02',
    description: 'Add 100 units when stock=3 → cart.insufficient_stock error surfaced',
    input: 'Add 100 units of this item to my cart.',
    variantStock: 3,
    expectedToolCall: 'cart_add',
    expectedOutputType: 'error',
    expectedErrorContains: 'cart.insufficient_stock',
  },
];
