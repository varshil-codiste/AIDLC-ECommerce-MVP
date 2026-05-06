export type OrderEventPayload = {
  eventType:
    | 'order.created'
    | 'order.paid'
    | 'order.fulfilled'
    | 'order.shipped'
    | 'order.delivered'
    | 'order.cancelled'
    | 'order.refunded'
    | 'order.returned';
  orderId: string;
  userId: string;
  customerId?: string;
  totalCents: number;
  currency: string;
  timestamp: string;
};

export type CartEventPayload = {
  eventType:
    | 'cart.created'
    | 'cart.updated'
    | 'cart.cleared'
    | 'cart.converted';
  cartId: string;
  userId: string;
  itemCount: number;
  subtotalCents: number;
};

export type ProductEventPayload = {
  eventType:
    | 'product.created'
    | 'product.updated'
    | 'product.archived'
    | 'product.stock_changed';
  productId: string;
  variantId?: string;
  beforeStock?: number;
  afterStock?: number;
};

export type CustomerEventPayload = {
  eventType: 'customer.created' | 'customer.tagged' | 'customer.anonymized';
  customerId: string;
  userId: string;
  changes?: Record<string, unknown>;
};

export type AuthEventPayload = {
  eventType: 'login.success' | 'login.failure' | 'rate_limit.applied';
  userId?: string;
  ip: string;
  userAgent: string;
  timestamp: string;
};

export type AgentEventPayload =
  | OrderEventPayload
  | CartEventPayload
  | ProductEventPayload
  | CustomerEventPayload
  | AuthEventPayload;

export function topicFromEventType(eventType: string): string {
  const prefix = eventType.split('.')[0];
  return prefix ?? 'misc';
}
