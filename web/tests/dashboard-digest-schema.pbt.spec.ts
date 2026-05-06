import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

const metricsArb = fc.record({
  ordersToday: fc.integer({ min: 0, max: 10_000 }),
  revenueTodayCents: fc.integer({ min: 0, max: 1_000_000_000 }),
  lowStockAlerts: fc.integer({ min: 0, max: 10_000 }),
  newCustomersToday: fc.integer({ min: 0, max: 10_000 }),
});

const digestArb = metricsArb.map((metrics) => ({ metrics }));

describe('dashboard_digest schema PBT (NFR-12-PBT-02)', () => {
  it('valid nested metrics shape always passes', () => {
    fc.assert(
      fc.property(digestArb, (data) => {
        expect(validateWidgetPayload('dashboard_digest', data)).toBe(true);
      }),
    );
  });

  it('old flat field shape is rejected (no metrics wrapper)', () => {
    const badPayload = {
      ordersToday: 5,
      revenueToday: 1000,
      lowStockCount: 2,
      newCustomers24h: 3,
    };
    expect(validateWidgetPayload('dashboard_digest', badPayload)).toBe(false);
  });

  it('missing metrics wrapper fails', () => {
    expect(validateWidgetPayload('dashboard_digest', {})).toBe(false);
  });

  it('metrics with missing required field fails', () => {
    const badPayload = { metrics: { ordersToday: 1, revenueTodayCents: 100, lowStockAlerts: 0 } };
    expect(validateWidgetPayload('dashboard_digest', badPayload)).toBe(false);
  });

  it('extra root-level property is rejected', () => {
    fc.assert(
      fc.property(digestArb, (data) => {
        const badPayload = { ...data, extraField: 'unexpected' };
        expect(validateWidgetPayload('dashboard_digest', badPayload)).toBe(false);
      }),
    );
  });

  it('extra property inside metrics is rejected (additionalProperties: false)', () => {
    const badPayload = {
      metrics: {
        ordersToday: 1,
        revenueTodayCents: 100,
        lowStockAlerts: 0,
        newCustomersToday: 2,
        legacyField: 'old',
      },
    };
    expect(validateWidgetPayload('dashboard_digest', badPayload)).toBe(false);
  });
});
