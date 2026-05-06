import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

// NFR-08-PBT-01: order/customer widget schema round-trips

const orderStatusEnum = fc.constantFrom('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded');

const orderItemArb = fc.record({
  title: fc.string({ minLength: 1 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  priceAtPurchaseCents: fc.integer({ min: 0, max: 9_999_999 }),
});

const orderCardArb = fc.record({
  orderId: fc.string({ minLength: 1 }),
  status: orderStatusEnum,
  totalCents: fc.integer({ min: 0, max: 9_999_999 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
  placedAt: fc.date().map((d) => d.toISOString()),
  items: fc.array(orderItemArb, { minLength: 0, maxLength: 10 }),
});

const orderStatusUpdateArb = fc.record({
  updatedCount: fc.integer({ min: 0, max: 50 }),
  failedCount: fc.integer({ min: 0, max: 50 }),
  status: fc.string({ minLength: 1 }),
  orders: fc.array(
    fc.oneof(
      fc.record({ orderId: fc.string({ minLength: 1 }), result: fc.constant('success' as const) }),
      fc.record({ orderId: fc.string({ minLength: 1 }), result: fc.constant('failed' as const), error: fc.string({ minLength: 1 }) }),
    ),
    { maxLength: 50 },
  ),
});

const attentionItemArb = fc.record({
  category: fc.constantFrom('unfulfilled_order', 'low_stock', 'pending_refund'),
  entityId: fc.string({ minLength: 1 }),
  label: fc.string({ minLength: 1 }),
  urgencyScore: fc.integer({ min: 0, max: 100 }),
  metadata: fc.record({}),
});

const attentionSummaryArb = fc.record({
  items: fc.array(attentionItemArb, { maxLength: 20 }),
  generatedAt: fc.date().map((d) => d.toISOString()),
});

const singleCustomerArb = fc.record({
  customerId: fc.string({ minLength: 1 }),
  email: fc.string({ minLength: 1 }),
  name: fc.oneof(fc.string({ minLength: 1 }), fc.constant(null)),
  ltvCents: fc.integer({ min: 0, max: 99_999_999 }),
  currency: fc.string({ minLength: 1 }),
  orderCount: fc.integer({ min: 0, max: 10_000 }),
  tags: fc.array(fc.string({ minLength: 1 }), { maxLength: 20 }),
});

const customerListArb = fc.record({
  customers: fc.array(singleCustomerArb, { maxLength: 10 }),
});

// ─── order_card PBT ───────────────────────────────────────────────────────────

describe('order_card schema PBT (NFR-08-PBT-01)', () => {
  it('valid order_card payloads always pass', () => {
    fc.assert(
      fc.property(orderCardArb, (data) => {
        expect(validateWidgetPayload('order_card', data)).toBe(true);
      }),
    );
  });

  it('order_card missing required orderId always fails', () => {
    fc.assert(
      fc.property(orderCardArb, (data) => {
        const { orderId: _, ...rest } = data;
        expect(validateWidgetPayload('order_card', rest)).toBe(false);
      }),
    );
  });

  it('order_card with unknown status always fails', () => {
    fc.assert(
      fc.property(orderCardArb, fc.string({ minLength: 1 }), (data, badStatus) => {
        const knownStatuses = new Set(['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded']);
        fc.pre(!knownStatuses.has(badStatus));
        expect(validateWidgetPayload('order_card', { ...data, status: badStatus })).toBe(false);
      }),
    );
  });
});

// ─── order_status_update PBT ──────────────────────────────────────────────────

describe('order_status_update schema PBT (NFR-08-PBT-01)', () => {
  it('valid order_status_update payloads always pass', () => {
    fc.assert(
      fc.property(orderStatusUpdateArb, (data) => {
        expect(validateWidgetPayload('order_status_update', data)).toBe(true);
      }),
    );
  });

  it('order_status_update missing updatedCount always fails', () => {
    fc.assert(
      fc.property(orderStatusUpdateArb, (data) => {
        const { updatedCount: _, ...rest } = data;
        expect(validateWidgetPayload('order_status_update', rest)).toBe(false);
      }),
    );
  });

  it('order_status_update orders > 50 items always fails', () => {
    fc.assert(
      fc.property(
        orderStatusUpdateArb,
        fc.array(
          fc.record({ orderId: fc.string({ minLength: 1 }), result: fc.constant('success' as const) }),
          { minLength: 51, maxLength: 60 },
        ),
        (data, tooManyOrders) => {
          expect(validateWidgetPayload('order_status_update', { ...data, orders: tooManyOrders })).toBe(false);
        },
      ),
    );
  });
});

// ─── attention_summary PBT ────────────────────────────────────────────────────

describe('attention_summary schema PBT (NFR-08-PBT-01)', () => {
  it('valid attention_summary payloads always pass', () => {
    fc.assert(
      fc.property(attentionSummaryArb, (data) => {
        expect(validateWidgetPayload('attention_summary', data)).toBe(true);
      }),
    );
  });

  it('attention_summary missing items always fails', () => {
    fc.assert(
      fc.property(attentionSummaryArb, (data) => {
        const { items: _, ...rest } = data;
        expect(validateWidgetPayload('attention_summary', rest)).toBe(false);
      }),
    );
  });

  it('attention_summary with urgencyScore > 100 always fails', () => {
    fc.assert(
      fc.property(attentionSummaryArb, fc.integer({ min: 101, max: 1000 }), (data, badScore) => {
        fc.pre(data.items.length > 0);
        const items = [{ ...data.items[0], urgencyScore: badScore }, ...data.items.slice(1)];
        expect(validateWidgetPayload('attention_summary', { ...data, items })).toBe(false);
      }),
    );
  });
});

// ─── customer_card PBT ────────────────────────────────────────────────────────

describe('customer_card schema PBT (NFR-08-PBT-01)', () => {
  it('valid single customer_card payloads always pass', () => {
    fc.assert(
      fc.property(singleCustomerArb, (data) => {
        expect(validateWidgetPayload('customer_card', data)).toBe(true);
      }),
    );
  });

  it('valid customer list payloads always pass', () => {
    fc.assert(
      fc.property(customerListArb, (data) => {
        expect(validateWidgetPayload('customer_card', data)).toBe(true);
      }),
    );
  });

  it('customer_card single payload missing email always fails', () => {
    fc.assert(
      fc.property(singleCustomerArb, (data) => {
        const { email: _, ...rest } = data;
        expect(validateWidgetPayload('customer_card', rest)).toBe(false);
      }),
    );
  });
});
