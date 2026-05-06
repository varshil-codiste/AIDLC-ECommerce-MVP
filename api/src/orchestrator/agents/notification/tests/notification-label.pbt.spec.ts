import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NotificationService, type LowStockVariant } from '../../../../notifications/notification.service';

const arbVariant = (): fc.Arbitrary<LowStockVariant> =>
  fc.record({
    id: fc.uuid(),
    sku: fc.stringMatching(/^SKU-[A-Z0-9]{3,6}$/),
    stock: fc.integer({ min: 0, max: 4 }),
    productTitle: fc.string({ minLength: 1, maxLength: 60 }),
  });

const makeService = () =>
  new NotificationService(null as never);

describe('NotificationService.buildLowStockLabel — property-based tests', () => {
  it('always returns a non-empty string for any non-empty variant list', () => {
    fc.assert(
      fc.property(fc.array(arbVariant(), { minLength: 1, maxLength: 10 }), (variants) => {
        const label = makeService().buildLowStockLabel(variants);
        expect(label.length).toBeGreaterThan(0);
      }),
    );
  });

  it('single variant label always contains the productTitle, sku, and stock', () => {
    fc.assert(
      fc.property(arbVariant(), (variant) => {
        const label = makeService().buildLowStockLabel([variant]);
        expect(label).toContain(variant.productTitle);
        expect(label).toContain(variant.sku);
        expect(label).toContain(String(variant.stock));
      }),
    );
  });

  it('plural label always embeds the exact count of variants', () => {
    fc.assert(
      fc.property(fc.array(arbVariant(), { minLength: 2, maxLength: 20 }), (variants) => {
        const label = makeService().buildLowStockLabel(variants);
        expect(label).toContain(String(variants.length));
      }),
    );
  });

  it('plural label always contains "SKUs are running low"', () => {
    fc.assert(
      fc.property(fc.array(arbVariant(), { minLength: 2, maxLength: 20 }), (variants) => {
        const label = makeService().buildLowStockLabel(variants);
        expect(label).toContain('SKUs are running low');
      }),
    );
  });

  it('output is deterministic: same input always yields same label', () => {
    fc.assert(
      fc.property(fc.array(arbVariant(), { minLength: 1, maxLength: 5 }), (variants) => {
        const service = makeService();
        expect(service.buildLowStockLabel(variants)).toBe(service.buildLowStockLabel(variants));
      }),
    );
  });

  it('label never exceeds 200 characters for any valid input', () => {
    fc.assert(
      fc.property(fc.array(arbVariant(), { minLength: 1, maxLength: 50 }), (variants) => {
        const label = makeService().buildLowStockLabel(variants);
        expect(label.length).toBeLessThanOrEqual(200);
      }),
    );
  });

  it('single variant label format is "<title> (<sku>) — <stock> left"', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          sku: fc.stringMatching(/^[A-Z]{3}-[0-9]{3}$/),
          stock: fc.integer({ min: 0, max: 4 }),
          productTitle: fc.stringMatching(/^[A-Za-z ]{3,20}$/),
        }),
        (variant) => {
          const label = makeService().buildLowStockLabel([variant]);
          expect(label).toBe(`${variant.productTitle} (${variant.sku}) — ${variant.stock} left`);
        },
      ),
    );
  });
});
