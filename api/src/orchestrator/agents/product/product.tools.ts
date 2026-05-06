import type { LlmTool } from '../../types/orchestrator.types';

export const PRODUCT_TOOLS: LlmTool[] = [
  {
    name: 'product_search',
    description: 'Search active products by natural-language query. Uses semantic vector search; falls back to keyword search on failure. Returns a product_carousel widget (max 8 products).',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural-language search query' },
        maxPriceCents: { type: 'integer', minimum: 0, description: 'Optional price ceiling in cents/paise' },
        categoryId: { type: 'string', description: 'Optional category UUID filter' },
        currency: { type: 'string', description: 'Optional currency code filter (e.g. "INR", "USD")' },
        limit: { type: 'integer', minimum: 1, maximum: 8, description: 'Max results (default: 8)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'product_compare',
    description: 'Compare 2-3 active products side by side. Returns a product_comparison widget highlighting differing attributes. Each item can be EITHER a product UUID OR a product NAME (e.g. "iPhone 15 Pro", "Samsung Galaxy S24") — names are resolved internally. Use this DIRECTLY for "compare X and Y" / "X vs Y" requests; do NOT call product_search first. If more than 3 items are provided, the first 3 are used.',
    parameters: {
      type: 'object',
      properties: {
        productIds: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 10, description: 'List of product UUIDs OR product names; first 3 are used.' },
      },
      required: ['productIds'],
    },
  },
  {
    name: 'product_get',
    description: 'Get a single product by its ID including all variants.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'UUID of the product' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'product_list_categories',
    description: 'List all available product categories.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'product_create',
    description: 'Create a new product with a default variant. Requires title, priceCents, and stock.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 3, maxLength: 255 },
        description: { type: 'string', maxLength: 2000 },
        priceCents: { type: 'integer', minimum: 1, maximum: 9999999, description: 'Price in paise/cents' },
        currency: { type: 'string', default: 'INR' },
        stock: { type: 'integer', minimum: 0 },
        categoryId: { type: 'string', description: 'UUID of an existing category (optional)' },
        imageUrls: { type: 'array', items: { type: 'string' }, default: [] },
      },
      required: ['title', 'priceCents', 'stock'],
    },
  },
  {
    name: 'product_update',
    description: 'Update fields of an existing product. Only provide fields to change.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'UUID of the product to update' },
        title: { type: 'string', minLength: 3, maxLength: 255 },
        description: { type: 'string', maxLength: 2000 },
        priceCents: { type: 'integer', minimum: 1, maximum: 9999999 },
        currency: { type: 'string' },
        categoryId: { type: 'string' },
        imageUrls: { type: 'array', items: { type: 'string' } },
      },
      required: ['productId'],
    },
  },
  {
    name: 'product_update_stock',
    description: 'Update the stock quantity for a product variant.',
    parameters: {
      type: 'object',
      properties: {
        variantId: { type: 'string', description: 'UUID of the product variant' },
        stock: { type: 'integer', minimum: 0 },
      },
      required: ['variantId', 'stock'],
    },
  },
  {
    name: 'product_archive',
    description: 'Archive (soft-delete) a product. This is a destructive action — a confirmation prompt will be shown to the user before executing.',
    parameters: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'UUID of the product to archive' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'product_bulk_create',
    description: 'Create multiple products at once from a list. Each product is created independently (partial success). Maximum 50 products.',
    parameters: {
      type: 'object',
      properties: {
        products: {
          type: 'array',
          maxItems: 50,
          items: {
            type: 'object',
            properties: {
              title: { type: 'string', minLength: 3, maxLength: 255 },
              priceCents: { type: 'integer', minimum: 1, maximum: 9999999 },
              stock: { type: 'integer', minimum: 0 },
              description: { type: 'string' },
              categoryId: { type: 'string' },
            },
            required: ['title', 'priceCents', 'stock'],
          },
        },
      },
      required: ['products'],
    },
  },
];

export const WRITE_TOOLS = new Set(['product_create', 'product_update', 'product_update_stock', 'product_archive', 'product_bulk_create']);
