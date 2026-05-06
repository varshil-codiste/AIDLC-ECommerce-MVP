import type { LlmTool } from '../../types/orchestrator.types';

export const CUSTOMER_TOOLS: LlmTool[] = [
  {
    name: 'customer_search',
    description: 'Search customers by email, name, or tag. Returns a list of matching customer profiles.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term to match against email, name, or tags' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max results (default: 10)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'customer_get',
    description: 'Get the full profile of a single customer including tags, LTV, and recent orders.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'UUID of the customer record' },
      },
      required: ['customerId'],
    },
  },
  {
    name: 'customer_get_top',
    description: 'Get the top customers ranked by lifetime value (LTV). Optionally filter by date range.',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Number of top customers to return (default: 10)' },
        dateFrom: { type: 'string', description: 'ISO 8601 date — count only orders placed on or after this date' },
        dateTo: { type: 'string', description: 'ISO 8601 date — count only orders placed on or before this date' },
      },
      required: [],
    },
  },
  {
    name: 'customer_add_tag',
    description: 'Add one or more tags to a customer. Max 20 tags per customer; each tag ≤ 50 chars. Duplicates are ignored.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'UUID of the customer record' },
        tags: { type: 'array', items: { type: 'string', maxLength: 50 }, maxItems: 20, description: 'Tags to add' },
      },
      required: ['customerId', 'tags'],
    },
  },
  {
    name: 'customer_anonymize',
    description: 'GDPR-anonymize a customer: replaces all PII (email, name, phone) with placeholder values. This is a destructive action — a confirmation prompt will appear before execution. Analytics data (LTV, order count) is preserved.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'UUID of the customer record to anonymize' },
      },
      required: ['customerId'],
    },
  },
];

export const CUSTOMER_WRITE_TOOLS = new Set(['customer_add_tag', 'customer_anonymize']);
