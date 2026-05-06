import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded', 'return_requested'] as const;

const eventArb = fc.record({
  label: fc.string({ minLength: 1, maxLength: 30 }),
  timestamp: fc.date().map((d) => d.toISOString()),
});

const trackingArb = fc.record({
  orderId: fc.uuid(),
  status: fc.constantFrom(...STATUSES),
  events: fc.array(eventArb, { minLength: 0, maxLength: 20 }),
});

describe('tracking_widget schema PBT (NFR-11-PBT-02)', () => {
  it('valid payloads always pass', () => {
    fc.assert(
      fc.property(trackingArb, (data) => {
        expect(validateWidgetPayload('tracking_widget', data)).toBe(true);
      }),
    );
  });

  it('missing orderId always fails', () => {
    fc.assert(
      fc.property(trackingArb, (data) => {
        const { orderId: _, ...rest } = data;
        expect(validateWidgetPayload('tracking_widget', rest)).toBe(false);
      }),
    );
  });

  it('unknown status enum value always fails', () => {
    fc.assert(
      fc.property(trackingArb, fc.string({ minLength: 1 }), (data, badStatus) => {
        const known = new Set(STATUSES as unknown as string[]);
        fc.pre(!known.has(badStatus));
        expect(validateWidgetPayload('tracking_widget', { ...data, status: badStatus })).toBe(false);
      }),
    );
  });

  it('events > 20 items always fails', () => {
    fc.assert(
      fc.property(
        trackingArb,
        fc.array(eventArb, { minLength: 21, maxLength: 25 }),
        (data, tooMany) => {
          expect(validateWidgetPayload('tracking_widget', { ...data, events: tooMany })).toBe(false);
        },
      ),
    );
  });

  it('event with extra unknown field fails', () => {
    fc.assert(
      fc.property(trackingArb, eventArb, (data, event) => {
        const badEvent = { ...event, _extra: 'forbidden' };
        expect(validateWidgetPayload('tracking_widget', { ...data, events: [badEvent] })).toBe(false);
      }),
    );
  });

  it('event missing label always fails', () => {
    fc.assert(
      fc.property(trackingArb, eventArb, (data, event) => {
        const { label: _, ...incomplete } = event;
        expect(validateWidgetPayload('tracking_widget', { ...data, events: [incomplete] })).toBe(false);
      }),
    );
  });

  it('return_requested is a valid status (UoW-11 enum extension)', () => {
    fc.assert(
      fc.property(trackingArb, (data) => {
        expect(validateWidgetPayload('tracking_widget', { ...data, status: 'return_requested' })).toBe(true);
      }),
    );
  });

  it('extra root field fails', () => {
    fc.assert(
      fc.property(trackingArb, (data) => {
        expect(validateWidgetPayload('tracking_widget', { ...data, _extra: 'bad' })).toBe(false);
      }),
    );
  });
});
