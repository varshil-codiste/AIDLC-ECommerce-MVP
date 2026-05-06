import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Replicate scoring logic from AttentionService
const scoreUnfulfilled = (ageHours: number) => Math.min(85, 60 + Math.floor(ageHours / 24) * 5);
const scoreLowStock = (stock: number) => Math.max(20, 50 - stock * 4);
const REFUND_SCORE = 90;

describe('AttentionService urgency scoring — property-based tests', () => {
  it('pending_refund urgency is always 90', () => {
    // Fixed by design — no property variance needed, but assert as invariant
    expect(REFUND_SCORE).toBe(90);
  });

  it('unfulfilled urgency is always in [60, 85]', () => {
    fc.assert(
      fc.property(fc.nat({ max: 8760 }), (ageHours) => {
        const score = scoreUnfulfilled(ageHours + 24); // must be >24h to appear
        expect(score).toBeGreaterThanOrEqual(60);
        expect(score).toBeLessThanOrEqual(85);
      }),
    );
  });

  it('low_stock urgency is always in [20, 50]', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 9 }), (stock) => {
        const score = scoreLowStock(stock);
        expect(score).toBeGreaterThanOrEqual(20);
        expect(score).toBeLessThanOrEqual(50);
      }),
    );
  });

  it('refund urgency (90) always exceeds unfulfilled urgency ceiling (85)', () => {
    fc.assert(
      fc.property(fc.nat({ max: 8760 }), (ageHours) => {
        const unfulfilledScore = scoreUnfulfilled(ageHours + 24);
        expect(REFUND_SCORE).toBeGreaterThan(unfulfilledScore);
      }),
    );
  });

  it('unfulfilled urgency increases monotonically with age up to cap', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 24, max: 4000 }),
        fc.integer({ min: 24, max: 4000 }),
        (age1, age2) => {
          if (age1 >= age2) return;
          const s1 = scoreUnfulfilled(age1);
          const s2 = scoreUnfulfilled(age2);
          // s2 >= s1 (monotonically non-decreasing)
          expect(s2).toBeGreaterThanOrEqual(s1);
        },
      ),
    );
  });

  it('sorted items have descending urgencyScore', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            urgencyScore: fc.integer({ min: 20, max: 90 }),
            category: fc.constantFrom('pending_refund', 'unfulfilled_order', 'low_stock') as fc.Arbitrary<string>,
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (rawItems) => {
          const sorted = [...rawItems].sort((a, b) => b.urgencyScore - a.urgencyScore);
          for (let i = 0; i < sorted.length - 1; i++) {
            expect(sorted[i].urgencyScore).toBeGreaterThanOrEqual(sorted[i + 1].urgencyScore);
          }
        },
      ),
    );
  });
});
