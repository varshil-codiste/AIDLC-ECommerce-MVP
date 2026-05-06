import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { buildTextBlob } from '../embedding-refresh.worker';

const nonWhitespaceString = (min: number, max: number) =>
  fc.stringMatching(/^[A-Za-z0-9 ]+$/).filter((s) => s.trim().length >= min && s.length <= max);

const productArb = () =>
  fc.record({
    id: fc.uuid(),
    title: nonWhitespaceString(1, 60),
    description: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: null }),
    category: fc.option(fc.record({ name: nonWhitespaceString(1, 30) }), { nil: null }),
    variants: fc.array(
      fc.record({
        attributes: fc.dictionary(
          fc.stringMatching(/^[a-z]{3,8}$/),
          fc.string({ minLength: 1, maxLength: 20 }),
          { maxKeys: 5 },
        ),
      }),
      { maxLength: 5 },
    ),
  });

describe('buildTextBlob — property-based tests (NFR-11-PBT-03)', () => {
  it('is deterministic — same input always yields same blob', () => {
    fc.assert(
      fc.property(productArb(), (product) => {
        expect(buildTextBlob(product)).toBe(buildTextBlob(product));
      }),
    );
  });

  it('always contains the title (trimmed)', () => {
    fc.assert(
      fc.property(productArb(), (product) => {
        expect(buildTextBlob(product)).toContain(product.title.trim());
      }),
    );
  });

  it('description appears when non-null', () => {
    fc.assert(
      fc.property(productArb(), (product) => {
        if (product.description !== null && product.description.length > 0) {
          expect(buildTextBlob(product)).toContain(product.description);
        }
      }),
    );
  });

  it('output never contains email-shaped strings (no PII — NFR-11-AIML-07)', () => {
    fc.assert(
      fc.property(productArb(), (product) => {
        const blob = buildTextBlob(product);
        // Rough email regex
        const emailRegex = /[a-z0-9]+@[a-z0-9]+\.[a-z]+/i;
        // We can't guarantee the input doesn't have emails (random strings), but we can check
        // the function doesn't INVENT them. So just assert blob is a string and finite length.
        expect(typeof blob).toBe('string');
        // If input had no emails, output should have no emails
        const inputHasEmail = emailRegex.test(product.title)
          || emailRegex.test(product.description ?? '')
          || emailRegex.test(product.category?.name ?? '');
        if (!inputHasEmail) {
          expect(emailRegex.test(blob)).toBe(false);
        }
      }),
    );
  });

  it('blob length is bounded by sum of input fields plus overhead', () => {
    fc.assert(
      fc.property(productArb(), (product) => {
        const blob = buildTextBlob(product);
        const inputSum =
          product.title.length +
          (product.description?.length ?? 0) +
          (product.category?.name.length ?? 0) +
          product.variants.reduce(
            (acc, v) =>
              acc + Object.entries(v.attributes).reduce((a, [k, val]) => a + k.length + String(val).length + 2, 0),
            0,
          );
        // Allow generous overhead for separators/newlines
        expect(blob.length).toBeLessThanOrEqual(inputSum + 50);
      }),
    );
  });
});
