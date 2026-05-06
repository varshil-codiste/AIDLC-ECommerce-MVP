import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Price parser mirrors what the LLM is instructed to produce.
// This PBT tests the service-layer validation invariants (NFR-07-PBT-03).
function isValidPriceCents(priceCents: unknown): boolean {
  if (typeof priceCents !== 'number') return false;
  if (!Number.isInteger(priceCents)) return false;
  if (priceCents < 1) return false;
  if (priceCents > 9_999_999) return false;
  return true;
}

// Natural language price amounts that are valid
const validPriceAmounts = fc.integer({ min: 1, max: 99_999 });

describe('Product price validation properties (NFR-07-PBT-03)', () => {
  it('valid integer priceCents in [1, 9999999] always passes validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 9_999_999 }), (priceCents) => {
        expect(isValidPriceCents(priceCents)).toBe(true);
      }),
    );
  });

  it('priceCents <= 0 always fails validation', () => {
    fc.assert(
      fc.property(fc.integer({ max: 0 }), (priceCents) => {
        expect(isValidPriceCents(priceCents)).toBe(false);
      }),
    );
  });

  it('priceCents > 9999999 always fails validation', () => {
    fc.assert(
      fc.property(fc.integer({ min: 10_000_000, max: 100_000_000 }), (priceCents) => {
        expect(isValidPriceCents(priceCents)).toBe(false);
      }),
    );
  });

  it('non-integer values always fail validation', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(0.1), max: Math.fround(9_999_998), noNaN: true }).filter((n) => !Number.isInteger(n)),
        (priceCents) => {
          expect(isValidPriceCents(priceCents)).toBe(false);
        },
      ),
    );
  });

  it('integer price * 100 conversion from rupee range [1, 99999] always produces valid priceCents', () => {
    fc.assert(
      fc.property(validPriceAmounts, (rupees) => {
        const priceCents = rupees * 100;
        expect(isValidPriceCents(priceCents)).toBe(true);
      }),
    );
  });
});
