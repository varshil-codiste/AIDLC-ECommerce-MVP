import type { LlmTool } from '../../types/orchestrator.types';

export const CHECKOUT_TOOLS: LlmTool[] = [
  {
    name: 'address_get_default',
    description: 'Fetch the most recent saved shipping address for the authenticated shopper.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'checkout_start',
    description: 'Validate the cart is non-empty, look up the shipping address, compute the order total, and return payment widget data.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'checkout_pay',
    description: 'Simulate payment and create the order in a single atomic transaction.',
    parameters: {
      type: 'object',
      properties: {
        cartId: { type: 'string', description: 'UUID of the cart to check out.' },
      },
      required: ['cartId'],
    },
  },
];

export const CHECKOUT_WRITE_TOOLS = new Set(['checkout_pay']);
