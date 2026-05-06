import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { OrderService, type OrderForTracking } from '../order.service';

const STATUSES = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded', 'return_requested'] as const;

const orderArb = (): fc.Arbitrary<OrderForTracking> =>
  fc
    .tuple(
      fc.uuid(),
      fc.constantFrom(...STATUSES),
      fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: null }),
      fc.option(fc.string({ minLength: 1, maxLength: 30 }), { nil: null }),
      fc.date({ min: new Date('2026-01-01'), max: new Date('2026-04-01') }),
      fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }),
      fc.option(fc.integer({ min: 0, max: 30 * 24 * 60 * 60 * 1000 }), { nil: null }),
    )
    .map(([id, status, trackingNumber, trackingCarrier, placedAt, deltaMs, returnDeltaMs]) => ({
      id,
      status,
      trackingNumber,
      trackingCarrier,
      placedAt,
      lastStatusChangeAt: new Date(placedAt.getTime() + deltaMs),
      returnRequestedAt:
        status === 'return_requested' && returnDeltaMs !== null
          ? new Date(placedAt.getTime() + returnDeltaMs)
          : null,
    }));

describe('buildTrackingEvents — property-based tests (NFR-11-PBT-04)', () => {
  it('always emits at least one event (Placed)', () => {
    fc.assert(
      fc.property(orderArb(), (order) => {
        const events = OrderService.buildTrackingEvents(order);
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].label).toBe('Placed');
      }),
    );
  });

  it('event timestamps are valid ISO strings', () => {
    fc.assert(
      fc.property(orderArb(), (order) => {
        const events = OrderService.buildTrackingEvents(order);
        for (const e of events) {
          expect(() => new Date(e.timestamp)).not.toThrow();
          expect(new Date(e.timestamp).toISOString()).toBe(e.timestamp);
        }
      }),
    );
  });

  it('cancelled order has only Placed + Cancelled events', () => {
    fc.assert(
      fc.property(
        orderArb().filter((o) => o.status === 'cancelled'),
        (order) => {
          const events = OrderService.buildTrackingEvents(order);
          const labels = events.map((e) => e.label);
          expect(labels).toContain('Placed');
          expect(labels).toContain('Cancelled');
          expect(labels).not.toContain('Shipped');
          expect(labels).not.toContain('Delivered');
        },
      ),
    );
  });

  it('return_requested order includes Placed, Shipped, Delivered, Return requested', () => {
    fc.assert(
      fc.property(
        orderArb().filter((o) => o.status === 'return_requested'),
        (order) => {
          fc.pre(order.returnRequestedAt !== null);
          const events = OrderService.buildTrackingEvents(order);
          const labels = events.map((e) => e.label);
          expect(labels).toContain('Placed');
          expect(labels).toContain('Shipped');
          expect(labels).toContain('Delivered');
          expect(labels).toContain('Return requested');
        },
      ),
    );
  });

  it('shipped event includes carrier+tracking detail when present', () => {
    fc.assert(
      fc.property(
        orderArb().filter((o) => ['shipped', 'delivered', 'return_requested', 'refunded'].includes(o.status)),
        (order) => {
          fc.pre(order.trackingNumber !== null);
          const events = OrderService.buildTrackingEvents(order);
          const shipped = events.find((e) => e.label === 'Shipped');
          expect(shipped?.detail).toBeDefined();
          expect(shipped?.detail).toContain(order.trackingNumber!);
        },
      ),
    );
  });

  it('only matching-status events appear (no orphan labels)', () => {
    fc.assert(
      fc.property(orderArb(), (order) => {
        const events = OrderService.buildTrackingEvents(order);
        const labels = events.map((e) => e.label);
        if (order.status === 'pending') {
          expect(labels).not.toContain('Shipped');
          expect(labels).not.toContain('Delivered');
        }
        if (!['cancelled'].includes(order.status)) {
          // pending/confirmed/shipped/delivered/return_requested/refunded should never have Cancelled
          expect(labels).not.toContain('Cancelled');
        }
      }),
    );
  });
});
