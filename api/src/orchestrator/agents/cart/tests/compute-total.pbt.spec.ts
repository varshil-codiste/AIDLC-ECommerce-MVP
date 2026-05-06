import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { CartService, type LineItem } from '../cart.service';

const makeItem = (priceCents: number, quantity: number, currency = 'INR'): LineItem => ({
  itemId: 'item-1',
  variantId: 'var-1',
  title: 'Test Product',
  variantLabel: 'SKU-001',
  priceCents,
  currency,
  quantity,
  lineTotalCents: priceCents * quantity,
});

const arbItem = fc.record({
  priceCents: fc.integer({ min: 0, max: 1_000_000 }),
  quantity: fc.integer({ min: 1, max: 100 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR', 'GBP'),
}).map(({ priceCents, quantity, currency }) => makeItem(priceCents, quantity, currency));

describe('CartService.computeTotal — property-based tests (NFR-10-PBT-03)', () => {
  it('empty array → totalCents = 0, currency = INR', () => {
    const result = CartService.computeTotal([]);
    expect(result).toEqual({ totalCents: 0, currency: 'INR' });
  });

  it('sum property: totalCents = sum(priceCents × quantity) for arbitrary item arrays', () => {
    fc.assert(
      fc.property(fc.array(arbItem, { minLength: 1, maxLength: 20 }), (items) => {
        const expected = items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0);
        const { totalCents } = CartService.computeTotal(items);
        expect(totalCents).toBe(expected);
      }),
    );
  });

  it('single item: totalCents = priceCents × quantity', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 100 }),
        (priceCents, quantity) => {
          const { totalCents } = CartService.computeTotal([makeItem(priceCents, quantity)]);
          expect(totalCents).toBe(priceCents * quantity);
        },
      ),
    );
  });

  it('all non-negative priceCents + positive quantity → non-negative totalCents', () => {
    fc.assert(
      fc.property(fc.array(arbItem, { minLength: 1, maxLength: 20 }), (items) => {
        const { totalCents } = CartService.computeTotal(items);
        expect(totalCents).toBeGreaterThanOrEqual(0);
      }),
    );
  });

  it('currency comes from the first item (arbitrary currency strings)', () => {
    fc.assert(
      fc.property(
        fc.array(arbItem, { minLength: 1, maxLength: 10 }),
        fc.string({ minLength: 1, maxLength: 5 }),
        (items, currency) => {
          const itemsWithCurrency = items.map((item, i) => ({ ...item, currency: i === 0 ? currency : item.currency }));
          const { currency: resultCurrency } = CartService.computeTotal(itemsWithCurrency);
          expect(resultCurrency).toBe(currency);
        },
      ),
    );
  });
});
