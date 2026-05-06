import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const itemArb = fc.record({
  itemId: fc.uuid(),
  variantId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 100 }),
  variantLabel: fc.string({ minLength: 1, maxLength: 50 }),
  priceCents: fc.integer({ min: 0, max: 10_000_000 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
  quantity: fc.integer({ min: 0, max: 999 }),
  lineTotalCents: fc.integer({ min: 0, max: 100_000_000 }),
});

const cartSummaryArb = fc.record({
  cartId: fc.uuid(),
  items: fc.array(itemArb, { minLength: 0, maxLength: 20 }),
  totalCents: fc.integer({ min: 0, max: 100_000_000 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
  itemCount: fc.integer({ min: 0, max: 999 }),
});

describe('cart_summary schema PBT (NFR-10-PBT-01)', () => {
  it('valid payloads always pass', () => {
    fc.assert(
      fc.property(cartSummaryArb, (data) => {
        expect(validateWidgetPayload('cart_summary', data)).toBe(true);
      }),
    );
  });

  it('missing cartId always fails', () => {
    fc.assert(
      fc.property(cartSummaryArb, (data) => {
        const { cartId: _, ...rest } = data;
        expect(validateWidgetPayload('cart_summary', rest)).toBe(false);
      }),
    );
  });

  it('missing totalCents always fails', () => {
    fc.assert(
      fc.property(cartSummaryArb, (data) => {
        const { totalCents: _, ...rest } = data;
        expect(validateWidgetPayload('cart_summary', rest)).toBe(false);
      }),
    );
  });

  it('negative priceCents always fails', () => {
    fc.assert(
      fc.property(cartSummaryArb, fc.integer({ min: -10_000, max: -1 }), (data, badPrice) => {
        const badItem = { itemId: 'x', variantId: 'y', title: 'T', variantLabel: 'L', priceCents: badPrice, currency: 'INR', quantity: 1, lineTotalCents: 0 };
        expect(validateWidgetPayload('cart_summary', { ...data, items: [badItem] })).toBe(false);
      }),
    );
  });

  it('extra root field fails with additionalProperties: false', () => {
    fc.assert(
      fc.property(cartSummaryArb, (data) => {
        expect(validateWidgetPayload('cart_summary', { ...data, _extra: 'forbidden' })).toBe(false);
      }),
    );
  });

  it('extra item field fails with additionalProperties: false', () => {
    fc.assert(
      fc.property(cartSummaryArb, itemArb, (data, item) => {
        const badItem = { ...item, _extra: 'bad' };
        expect(validateWidgetPayload('cart_summary', { ...data, items: [badItem] })).toBe(false);
      }),
    );
  });
});
