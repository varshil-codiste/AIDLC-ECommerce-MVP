import type { LlmTool } from '../../types/orchestrator.types';

export const ORDER_TOOLS: LlmTool[] = [
  {
    name: 'order_list',
    description: 'List and filter orders by status, date range, or customer. Returns a paginated list of orders.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded', 'return_requested'], description: 'Filter by order status' },
        dateFrom: { type: 'string', description: 'ISO 8601 date — only orders placed on or after this date' },
        dateTo: { type: 'string', description: 'ISO 8601 date — only orders placed on or before this date' },
        limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Max results (default: 20)' },
      },
      required: [],
    },
  },
  {
    name: 'order_get',
    description: 'Get full details of a single order including its line items and customer info.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'order_update_status',
    description: 'Update the status of a single order. Validates the status transition before applying.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order' },
        status: { type: 'string', enum: ['confirmed', 'shipped', 'delivered', 'cancelled'], description: 'New status to apply' },
      },
      required: ['orderId', 'status'],
    },
  },
  {
    name: 'order_update_status_bulk',
    description: 'Update the status of up to 50 orders at once. Each order is updated independently — partial success is possible.',
    parameters: {
      type: 'object',
      properties: {
        orderIds: { type: 'array', items: { type: 'string' }, maxItems: 50, description: 'UUIDs of orders to update' },
        status: { type: 'string', enum: ['confirmed', 'shipped', 'delivered', 'cancelled'], description: 'New status to apply to all orders' },
        trackingNumbers: {
          type: 'object',
          description: 'Optional map of orderId → trackingNumber (for shipped status)',
          additionalProperties: { type: 'string' },
        },
        carrier: { type: 'string', description: 'Carrier name (required when providing tracking numbers)' },
      },
      required: ['orderIds', 'status'],
    },
  },
  {
    name: 'order_add_tracking',
    description: 'Add a tracking number and carrier to a shipped order.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order' },
        trackingNumber: { type: 'string', description: 'Carrier tracking number' },
        carrier: { type: 'string', description: 'Carrier name (e.g. "FedEx", "BlueDart")' },
      },
      required: ['orderId', 'trackingNumber', 'carrier'],
    },
  },
  {
    name: 'order_cancel',
    description: 'Cancel an order. This is a destructive action — a confirmation prompt will appear before execution.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order to cancel' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'order_refund',
    description: 'Refund a confirmed or returned order. This is a destructive action — a confirmation prompt will appear before execution.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order to refund' },
        reason: { type: 'string', description: 'Reason for the refund (shown in audit log)' },
      },
      required: ['orderId'],
    },
  },
  {
    name: 'merchant_attention',
    description: "Return a ranked list of items needing the merchant's attention: unfulfilled orders >24 h, low-stock variants, pending refunds.",
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'customer_add_tag',
    description: 'Add one or more tags to a customer record. Cross-domain tool — called from Order Agent for the refund+tag pattern.',
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
    name: 'order_get_tracking',
    description: "Return the tracking timeline for the user's order. If orderId is omitted, returns tracking for the user's most recent order. Available to both merchants and shoppers; ownership is enforced server-side.",
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order. Omit to use the actor\'s most recent order.' },
      },
      required: [],
    },
  },
  {
    name: 'order_start_return',
    description: 'Start a return for a delivered order. Requires a non-empty reason (5+ chars). Idempotent — re-calling on an already return_requested order returns the existing state.',
    parameters: {
      type: 'object',
      properties: {
        orderId: { type: 'string', description: 'UUID of the order' },
        reason: { type: 'string', minLength: 5, description: 'Reason for the return' },
      },
      required: ['orderId', 'reason'],
    },
  },
];

export const ORDER_WRITE_TOOLS = new Set([
  'order_update_status',
  'order_update_status_bulk',
  'order_add_tracking',
  'order_cancel',
  'order_refund',
  'customer_add_tag',
]);

export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:          ['confirmed', 'cancelled'],
  confirmed:        ['shipped', 'cancelled', 'refunded'],
  shipped:          ['delivered', 'cancelled'],
  delivered:        ['return_requested'],
  return_requested: ['refunded', 'delivered'],
  cancelled:        [],
  refunded:         [],
};
