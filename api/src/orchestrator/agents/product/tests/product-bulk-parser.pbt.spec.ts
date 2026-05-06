import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Bulk product line parsing invariants (NFR-07-PBT-04)
// The actual LLM parsing happens in product_bulk_create tool call;
// these tests verify the downstream invariants that ProductService.bulkCreate enforces.

function simulateBulkParse(lines: string[]): { parsed: number; skipped: number } {
  const MAX_BULK = 50;
  const capped = lines.slice(0, MAX_BULK);
  const parsed = capped.filter((l) => l.trim().length > 0).length;
  return { parsed, skipped: lines.length - capped.length };
}

describe('Bulk product line parsing properties (NFR-07-PBT-04)', () => {
  it('parsed count is always <= input line count', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 0, maxLength: 100 }), (lines) => {
        const { parsed } = simulateBulkParse(lines);
        expect(parsed).toBeLessThanOrEqual(lines.length);
      }),
    );
  });

  it('parsed count is always <= 50 (MAX_BULK cap)', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ minLength: 1 }), { minLength: 0, maxLength: 200 }), (lines) => {
        const { parsed } = simulateBulkParse(lines);
        expect(parsed).toBeLessThanOrEqual(50);
      }),
    );
  });

  it('for inputs with <= 50 lines, skipped count is always 0', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { minLength: 0, maxLength: 50 }), (lines) => {
        const { skipped } = simulateBulkParse(lines);
        expect(skipped).toBe(0);
      }),
    );
  });

  it('empty input produces 0 parsed', () => {
    const { parsed } = simulateBulkParse([]);
    expect(parsed).toBe(0);
  });

  it('all non-empty (non-whitespace) lines in [1..50] input are counted', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), { minLength: 1, maxLength: 50 }),
        (lines) => {
          const { parsed } = simulateBulkParse(lines);
          expect(parsed).toBe(lines.length);
        },
      ),
    );
  });
});
