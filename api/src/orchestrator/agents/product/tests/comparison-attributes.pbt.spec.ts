import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ProductService, type ProductForCompare } from '../product.service';

const productForCompareArb = (): fc.Arbitrary<ProductForCompare> =>
  fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 30 }),
    priceCents: fc.integer({ min: 0, max: 1_000_000 }),
    currency: fc.constantFrom('INR', 'USD', 'EUR'),
    description: fc.option(fc.string({ minLength: 0, maxLength: 50 }), { nil: null }),
    imageUrls: fc.array(fc.webUrl(), { maxLength: 3 }),
    categoryName: fc.option(fc.string({ minLength: 1, maxLength: 20 }), { nil: null }),
    attributes: fc.dictionary(
      fc.stringMatching(/^[a-z]{3,8}$/),
      fc.string({ minLength: 1, maxLength: 15 }),
      { maxKeys: 5 },
    ),
  });

describe('buildComparisonAttributes — property-based tests (NFR-11-PBT-05)', () => {
  it('preserves the input products array (same order, same content)', () => {
    fc.assert(
      fc.property(fc.array(productForCompareArb(), { minLength: 2, maxLength: 3 }), (products) => {
        const result = ProductService.buildComparisonAttributes(products);
        expect(result.products).toEqual(products);
      }),
    );
  });

  it('differingAttributes are sorted', () => {
    fc.assert(
      fc.property(fc.array(productForCompareArb(), { minLength: 2, maxLength: 3 }), (products) => {
        const result = ProductService.buildComparisonAttributes(products);
        const sorted = [...result.differingAttributes].sort();
        expect(result.differingAttributes).toEqual(sorted);
      }),
    );
  });

  it('attribute is in differingAttributes IFF its values differ across products', () => {
    fc.assert(
      fc.property(fc.array(productForCompareArb(), { minLength: 2, maxLength: 3 }), (products) => {
        const result = ProductService.buildComparisonAttributes(products);
        const allKeys = new Set<string>();
        for (const p of products) for (const k of Object.keys(p.attributes)) allKeys.add(k);
        for (const key of allKeys) {
          const values = products.map((p) => p.attributes[key] ?? null);
          const unique = new Set(values);
          if (unique.size > 1) {
            expect(result.differingAttributes).toContain(key);
          } else {
            expect(result.differingAttributes).not.toContain(key);
          }
        }
      }),
    );
  });

  it('symmetry: order of input does not affect differing-attributes set', () => {
    fc.assert(
      fc.property(fc.array(productForCompareArb(), { minLength: 2, maxLength: 3 }), (products) => {
        const reversed = [...products].reverse();
        const a = new Set(ProductService.buildComparisonAttributes(products).differingAttributes);
        const b = new Set(ProductService.buildComparisonAttributes(reversed).differingAttributes);
        expect(a).toEqual(b);
      }),
    );
  });

  it('identical products → empty differingAttributes', () => {
    fc.assert(
      fc.property(productForCompareArb(), (product) => {
        const result = ProductService.buildComparisonAttributes([product, product]);
        expect(result.differingAttributes).toHaveLength(0);
      }),
    );
  });
});
