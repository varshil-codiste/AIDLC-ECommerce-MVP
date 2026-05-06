import type { LlmTool } from '../../types/orchestrator.types';

export const CART_TOOLS: LlmTool[] = [
  {
    name: 'cart_get',
    description: 'Get the current open cart for the authenticated shopper.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'cart_add',
    description: 'Add a product to the cart. Pass a UUID — it can be either a product variant ID (preferred) OR a product ID (the first available variant is used). If the variant is already in the cart its quantity is incremented.',
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'UUID of the product variant OR product to add.' },
        quantity: { type: 'integer', minimum: 1, description: 'Number of units to add (default 1).' },
      },
      required: ['variantId'],
    },
  },
  {
    name: 'cart_update_qty',
    description: 'Update the quantity of a cart line item. Set quantity to 0 to remove the item.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'UUID of the cart item to update.' },
        quantity: { type: 'integer', minimum: 0, description: 'New quantity; 0 removes the item.' },
      },
      required: ['itemId', 'quantity'],
    },
  },
  {
    name: 'cart_remove',
    description: 'Remove a specific item from the cart.',
    parameters: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: 'UUID of the cart item to remove.' },
      },
      required: ['itemId'],
    },
  },
  {
    name: 'cart_clear',
    description: 'Remove all items from the cart. MUST only be called after the shopper has confirmed via confirmation_prompt.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
];

export const CART_WRITE_TOOLS = new Set(['cart_add', 'cart_update_qty', 'cart_remove', 'cart_clear']);
