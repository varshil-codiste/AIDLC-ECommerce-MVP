import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

// NFR-07-PBT-01: product_edit_preview schema round-trip
// NFR-07-PBT-02: bulk_product_preview schema round-trip

const action = fc.record({ intent: fc.string({ minLength: 1 }) });

const productEditPreviewArb = fc.record({
  mode: fc.constantFrom('create', 'update'),
  product: fc.record({
    title: fc.string({ minLength: 1 }),
    priceCents: fc.integer({ min: 1, max: 9_999_999 }),
    stock: fc.integer({ min: 0, max: 9_999 }),
    currency: fc.constantFrom('INR', 'USD', 'EUR'),
  }),
  diff: fc.array(
    fc.record({ field: fc.string({ minLength: 1 }), from: fc.integer(), to: fc.integer() }),
    { maxLength: 10 },
  ),
  missingFields: fc.array(fc.string({ minLength: 1 }), { maxLength: 5 }),
  confirmAction: action,
});

const bulkProductPreviewArb = fc.record({
  validCount: fc.integer({ min: 0, max: 50 }),
  invalidCount: fc.integer({ min: 0, max: 50 }),
  products: fc.array(
    fc.record({
      title: fc.string({ minLength: 1 }),
      priceCents: fc.oneof(fc.integer({ min: 1, max: 9_999_999 }), fc.constant(null)),
      stock: fc.oneof(fc.integer({ min: 0, max: 9_999 }), fc.constant(null)),
      errors: fc.array(fc.string({ minLength: 1 }), { maxLength: 5 }),
    }),
    { maxLength: 50 },
  ),
  confirmAction: action,
});

describe('product_edit_preview schema PBT (NFR-07-PBT-01)', () => {
  it('valid payloads always pass validation', () => {
    fc.assert(
      fc.property(productEditPreviewArb, (data) => {
        expect(validateWidgetPayload('product_edit_preview', data)).toBe(true);
      }),
    );
  });

  it('payload missing required "mode" field always fails', () => {
    fc.assert(
      fc.property(productEditPreviewArb, (data) => {
        const { mode: _mode, ...rest } = data;
        expect(validateWidgetPayload('product_edit_preview', rest)).toBe(false);
      }),
    );
  });

  it('payload missing required "product" field always fails', () => {
    fc.assert(
      fc.property(productEditPreviewArb, (data) => {
        const { product: _product, ...rest } = data;
        expect(validateWidgetPayload('product_edit_preview', rest)).toBe(false);
      }),
    );
  });

  it('payload missing required "confirmAction" field always fails', () => {
    fc.assert(
      fc.property(productEditPreviewArb, (data) => {
        const { confirmAction: _ca, ...rest } = data;
        expect(validateWidgetPayload('product_edit_preview', rest)).toBe(false);
      }),
    );
  });

  it('product.priceCents < 1 always fails validation', () => {
    fc.assert(
      fc.property(
        productEditPreviewArb,
        fc.integer({ max: 0 }),
        (data, badPrice) => {
          const payload = { ...data, product: { ...data.product, priceCents: badPrice } };
          expect(validateWidgetPayload('product_edit_preview', payload)).toBe(false);
        },
      ),
    );
  });

  it('unknown top-level property always fails (additionalProperties: false)', () => {
    fc.assert(
      fc.property(productEditPreviewArb, fc.string({ minLength: 1 }), (data, extraKey) => {
        const reserved = new Set(['mode', 'product', 'diff', 'missingFields', 'confirmAction', 'editMoreAction']);
        fc.pre(!reserved.has(extraKey));
        const payload = { ...data, [extraKey]: 'extra' };
        expect(validateWidgetPayload('product_edit_preview', payload)).toBe(false);
      }),
    );
  });
});

describe('bulk_product_preview schema PBT (NFR-07-PBT-02)', () => {
  it('valid payloads always pass validation', () => {
    fc.assert(
      fc.property(bulkProductPreviewArb, (data) => {
        expect(validateWidgetPayload('bulk_product_preview', data)).toBe(true);
      }),
    );
  });

  it('payload missing "validCount" always fails', () => {
    fc.assert(
      fc.property(bulkProductPreviewArb, (data) => {
        const { validCount: _vc, ...rest } = data;
        expect(validateWidgetPayload('bulk_product_preview', rest)).toBe(false);
      }),
    );
  });

  it('payload missing "invalidCount" always fails', () => {
    fc.assert(
      fc.property(bulkProductPreviewArb, (data) => {
        const { invalidCount: _ic, ...rest } = data;
        expect(validateWidgetPayload('bulk_product_preview', rest)).toBe(false);
      }),
    );
  });

  it('payload missing "products" always fails', () => {
    fc.assert(
      fc.property(bulkProductPreviewArb, (data) => {
        const { products: _p, ...rest } = data;
        expect(validateWidgetPayload('bulk_product_preview', rest)).toBe(false);
      }),
    );
  });

  it('payload missing "confirmAction" always fails', () => {
    fc.assert(
      fc.property(bulkProductPreviewArb, (data) => {
        const { confirmAction: _ca, ...rest } = data;
        expect(validateWidgetPayload('bulk_product_preview', rest)).toBe(false);
      }),
    );
  });

  it('products array with > 50 items always fails (maxItems: 50)', () => {
    fc.assert(
      fc.property(
        bulkProductPreviewArb,
        fc.array(
          fc.record({ title: fc.string({ minLength: 1 }), errors: fc.constant([]) }),
          { minLength: 51, maxLength: 60 },
        ),
        (data, bigList) => {
          const payload = { ...data, products: bigList };
          expect(validateWidgetPayload('bulk_product_preview', payload)).toBe(false);
        },
      ),
    );
  });
});
