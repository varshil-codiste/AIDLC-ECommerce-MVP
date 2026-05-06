import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const intentArb = fc.record({
  intent: fc.string({ minLength: 1, maxLength: 100 }),
});

const promptArb = fc.record({
  message: fc.string({ minLength: 1, maxLength: 500 }),
  confirmIntent: intentArb,
}).chain((base) =>
  fc.record({
    cancelIntent: fc.option(intentArb, { nil: undefined }),
    confirmLabel: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    cancelLabel: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
  }).map((opts) => ({
    ...base,
    ...(opts.cancelIntent !== undefined ? { cancelIntent: opts.cancelIntent } : {}),
    ...(opts.confirmLabel !== undefined ? { confirmLabel: opts.confirmLabel } : {}),
    ...(opts.cancelLabel !== undefined ? { cancelLabel: opts.cancelLabel } : {}),
  }))
);

describe('confirmation_prompt schema PBT (NFR-12-PBT-03)', () => {
  it('valid payloads with object confirmIntent always pass', () => {
    fc.assert(
      fc.property(promptArb, (data) => {
        expect(validateWidgetPayload('confirmation_prompt', data)).toBe(true);
      }),
    );
  });

  it('string confirmIntent is rejected (pre-fix shape fails post-fix schema)', () => {
    const badPayload = {
      message: 'Are you sure?',
      confirmIntent: 'confirmation.confirm',
    };
    expect(validateWidgetPayload('confirmation_prompt', badPayload)).toBe(false);
  });

  it('missing message fails', () => {
    const badPayload = { confirmIntent: { intent: 'confirmation.confirm' } };
    expect(validateWidgetPayload('confirmation_prompt', badPayload)).toBe(false);
  });

  it('missing confirmIntent fails', () => {
    const badPayload = { message: 'Are you sure?' };
    expect(validateWidgetPayload('confirmation_prompt', badPayload)).toBe(false);
  });

  it('string cancelIntent is rejected', () => {
    const badPayload = {
      message: 'Are you sure?',
      confirmIntent: { intent: 'confirmation.confirm' },
      cancelIntent: 'confirmation.cancel',
    };
    expect(validateWidgetPayload('confirmation_prompt', badPayload)).toBe(false);
  });

  it('extra root-level property is rejected', () => {
    fc.assert(
      fc.property(promptArb, (data) => {
        const badPayload = { ...data, unexpectedField: 'boom' };
        expect(validateWidgetPayload('confirmation_prompt', badPayload)).toBe(false);
      }),
    );
  });
});
