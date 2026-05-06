import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const paymentItemArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }),
  variantLabel: fc.string({ minLength: 1, maxLength: 50 }),
  quantity: fc.integer({ min: 1, max: 999 }),
  lineTotalCents: fc.integer({ min: 0, max: 100_000_000 }),
});

const addressArb = fc.record({
  line1: fc.string({ minLength: 1, maxLength: 200 }),
  city: fc.string({ minLength: 1, maxLength: 100 }),
  state: fc.string({ minLength: 1, maxLength: 100 }),
  postalCode: fc.string({ minLength: 1, maxLength: 20 }),
  countryCode: fc.string({ minLength: 2, maxLength: 3 }),
});

const paymentWidgetArb = fc.record({
  cartId: fc.uuid(),
  totalCents: fc.integer({ min: 0, max: 100_000_000 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
  items: fc.array(paymentItemArb, { minLength: 1, maxLength: 20 }),
});

describe('payment_widget schema PBT (NFR-10-PBT-02)', () => {
  it('valid payloads without address always pass', () => {
    fc.assert(
      fc.property(paymentWidgetArb, (data) => {
        expect(validateWidgetPayload('payment_widget', data)).toBe(true);
      }),
    );
  });

  it('valid payloads with address always pass', () => {
    fc.assert(
      fc.property(paymentWidgetArb, addressArb, (data, address) => {
        expect(validateWidgetPayload('payment_widget', { ...data, address })).toBe(true);
      }),
    );
  });

  it('missing cartId always fails', () => {
    fc.assert(
      fc.property(paymentWidgetArb, (data) => {
        const { cartId: _, ...rest } = data;
        expect(validateWidgetPayload('payment_widget', rest)).toBe(false);
      }),
    );
  });

  it('missing totalCents always fails', () => {
    fc.assert(
      fc.property(paymentWidgetArb, (data) => {
        const { totalCents: _, ...rest } = data;
        expect(validateWidgetPayload('payment_widget', rest)).toBe(false);
      }),
    );
  });

  it('item with quantity < 1 always fails', () => {
    fc.assert(
      fc.property(paymentWidgetArb, fc.integer({ min: -100, max: 0 }), (data, badQty) => {
        const badItem = { title: 'X', variantLabel: 'Y', quantity: badQty, lineTotalCents: 1000 };
        expect(validateWidgetPayload('payment_widget', { ...data, items: [badItem] })).toBe(false);
      }),
    );
  });

  it('extra root field fails with additionalProperties: false', () => {
    fc.assert(
      fc.property(paymentWidgetArb, (data) => {
        expect(validateWidgetPayload('payment_widget', { ...data, _extra: 'forbidden' })).toBe(false);
      }),
    );
  });

  it('address with extra field fails with additionalProperties: false', () => {
    fc.assert(
      fc.property(paymentWidgetArb, addressArb, (data, address) => {
        const badAddress = { ...address, _extra: 'bad' };
        expect(validateWidgetPayload('payment_widget', { ...data, address: badAddress })).toBe(false);
      }),
    );
  });
});
