import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const productArb = fc.record({
  id: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 60 }),
  priceCents: fc.integer({ min: 0, max: 9_999_999 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
  attributes: fc.dictionary(
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.string({ minLength: 1, maxLength: 20 }),
    { maxKeys: 5 },
  ),
});

const comparisonArb = fc.record({
  products: fc.array(productArb, { minLength: 2, maxLength: 3 }),
  differingAttributes: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 10 }),
});

describe('product_comparison schema PBT (NFR-11-PBT-01)', () => {
  it('valid payloads always pass', () => {
    fc.assert(
      fc.property(comparisonArb, (data) => {
        expect(validateWidgetPayload('product_comparison', data)).toBe(true);
      }),
    );
  });

  it('missing products array always fails', () => {
    fc.assert(
      fc.property(comparisonArb, (data) => {
        const { products: _, ...rest } = data;
        expect(validateWidgetPayload('product_comparison', rest)).toBe(false);
      }),
    );
  });

  it('1 product fails (minItems 2)', () => {
    fc.assert(
      fc.property(productArb, (product) => {
        expect(validateWidgetPayload('product_comparison', { products: [product], differingAttributes: [] })).toBe(false);
      }),
    );
  });

  it('4 products fail (maxItems 3)', () => {
    fc.assert(
      fc.property(fc.array(productArb, { minLength: 4, maxLength: 4 }), (products) => {
        expect(validateWidgetPayload('product_comparison', { products, differingAttributes: [] })).toBe(false);
      }),
    );
  });

  it('product missing required priceCents fails', () => {
    fc.assert(
      fc.property(comparisonArb, (data) => {
        fc.pre(data.products.length >= 2);
        const { priceCents: _, ...incomplete } = data.products[0];
        const products = [incomplete, ...data.products.slice(1)];
        expect(validateWidgetPayload('product_comparison', { ...data, products })).toBe(false);
      }),
    );
  });

  it('extra unknown property at root fails', () => {
    fc.assert(
      fc.property(comparisonArb, (data) => {
        expect(validateWidgetPayload('product_comparison', { ...data, _extra: 'forbidden' })).toBe(false);
      }),
    );
  });

  it('extra unknown property on a product fails', () => {
    fc.assert(
      fc.property(comparisonArb, (data) => {
        fc.pre(data.products.length >= 2);
        const products = [{ ...data.products[0], extraField: 'bad' }, ...data.products.slice(1)];
        expect(validateWidgetPayload('product_comparison', { ...data, products })).toBe(false);
      }),
    );
  });

  it('negative priceCents fails', () => {
    fc.assert(
      fc.property(comparisonArb, fc.integer({ min: -100, max: -1 }), (data, negative) => {
        fc.pre(data.products.length >= 2);
        const products = [{ ...data.products[0], priceCents: negative }, ...data.products.slice(1)];
        expect(validateWidgetPayload('product_comparison', { ...data, products })).toBe(false);
      }),
    );
  });
});
