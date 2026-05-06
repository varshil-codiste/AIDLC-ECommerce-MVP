import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeCost, PRICING } from './llm-pricing';

describe('computeCost', () => {
  it('returns correct cost for a known model', () => {
    const cost = computeCost('claude-sonnet-4-6', 1000, 500);
    // 1000 * 0.003 / 1000 + 500 * 0.015 / 1000 = 0.003 + 0.0075 = 0.0105
    expect(cost).toBeCloseTo(0.0105, 6);
  });

  it('returns 0 for an unknown model (no throw)', () => {
    expect(() => computeCost('unknown-model-xyz', 100, 50)).not.toThrow();
    expect(computeCost('unknown-model-xyz', 100, 50)).toBe(0);
  });

  it('returns 0 for 0 tokens on any model', () => {
    for (const model of Object.keys(PRICING)) {
      expect(computeCost(model, 0, 0)).toBe(0);
    }
  });

  it('PBT: computeCost matches manual formula for all known models', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(PRICING)),
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 0, max: 1_000_000 }),
        (model, inputTokens, outputTokens) => {
          const pricing = PRICING[model];
          const expected =
            (inputTokens * pricing.inputPer1k + outputTokens * pricing.outputPer1k) / 1000;
          expect(computeCost(model, inputTokens, outputTokens)).toBeCloseTo(expected, 6);
        },
      ),
      { numRuns: 1000 },
    );
  });
});
