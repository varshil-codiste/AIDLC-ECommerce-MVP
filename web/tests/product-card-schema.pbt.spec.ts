import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const productCardArb = fc.record({
  productId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  priceCents: fc.integer({ min: 0, max: 100_000_000 }),
  currency: fc.constantFrom('INR', 'USD', 'EUR'),
});

const withOptionals = productCardArb.chain((base) =>
  fc.record({
    imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
    stock: fc.option(fc.integer({ min: 0, max: 10_000 }), { nil: undefined }),
    variantId: fc.option(fc.uuid(), { nil: undefined }),
  }).map((opts) => ({
    ...base,
    ...(opts.imageUrl !== undefined ? { imageUrl: opts.imageUrl } : {}),
    ...(opts.stock !== undefined ? { stock: opts.stock } : {}),
    ...(opts.variantId !== undefined ? { variantId: opts.variantId } : {}),
  }))
);

describe('product_card schema PBT (NFR-12-PBT-01)', () => {
  it('valid payloads always pass', () => {
    fc.assert(
      fc.property(withOptionals, (data) => {
        expect(validateWidgetPayload('product_card', data)).toBe(true);
      }),
    );
  });

  it('old priceUsd field is rejected (additionalProperties: false)', () => {
    const badPayload = { productId: 'p-1', title: 'X', priceCents: 1000, currency: 'INR', priceUsd: 10 };
    expect(validateWidgetPayload('product_card', badPayload)).toBe(false);
  });

  it('missing required priceCents fails', () => {
    fc.assert(
      fc.property(fc.record({ productId: fc.uuid(), title: fc.string({ minLength: 1 }), currency: fc.constant('INR') }), (data) => {
        expect(validateWidgetPayload('product_card', data)).toBe(false);
      }),
    );
  });

  it('negative priceCents fails', () => {
    const badPayload = { productId: 'p-1', title: 'X', priceCents: -1, currency: 'INR' };
    expect(validateWidgetPayload('product_card', badPayload)).toBe(false);
  });

  it('missing required title fails', () => {
    const badPayload = { productId: 'p-1', priceCents: 1000, currency: 'INR' };
    expect(validateWidgetPayload('product_card', badPayload)).toBe(false);
  });

  it('extra root-level property is rejected', () => {
    const badPayload = { productId: 'p-1', title: 'X', priceCents: 500, currency: 'INR', extraField: 'oops' };
    expect(validateWidgetPayload('product_card', badPayload)).toBe(false);
  });
});
