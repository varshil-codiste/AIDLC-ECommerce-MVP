import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { VALID_ORDER_TRANSITIONS } from '../order.tools';

const ALL_STATUSES = Object.keys(VALID_ORDER_TRANSITIONS);
const TERMINAL_STATUSES = ALL_STATUSES.filter((s) => VALID_ORDER_TRANSITIONS[s].length === 0);

describe('VALID_ORDER_TRANSITIONS — property-based tests', () => {
  it('every transition target is a known status', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_STATUSES), (status) => {
        const targets = VALID_ORDER_TRANSITIONS[status];
        for (const target of targets) {
          expect(ALL_STATUSES).toContain(target);
        }
      }),
    );
  });

  it('terminal statuses have no outgoing transitions', () => {
    fc.assert(
      fc.property(fc.constantFrom(...TERMINAL_STATUSES), (status) => {
        expect(VALID_ORDER_TRANSITIONS[status]).toHaveLength(0);
      }),
    );
  });

  it('non-terminal statuses have at least one outgoing transition', () => {
    const nonTerminal = ALL_STATUSES.filter((s) => VALID_ORDER_TRANSITIONS[s].length > 0);
    fc.assert(
      fc.property(fc.constantFrom(...nonTerminal), (status) => {
        expect(VALID_ORDER_TRANSITIONS[status].length).toBeGreaterThan(0);
      }),
    );
  });

  it('cancelled and refunded are always terminal', () => {
    expect(VALID_ORDER_TRANSITIONS['cancelled']).toHaveLength(0);
    expect(VALID_ORDER_TRANSITIONS['refunded']).toHaveLength(0);
  });

  it('delivered transitions only to return_requested (UoW-11 extension)', () => {
    expect(VALID_ORDER_TRANSITIONS['delivered']).toEqual(['return_requested']);
  });

  it('return_requested transitions only to refunded or delivered (UoW-11 extension)', () => {
    const targets = VALID_ORDER_TRANSITIONS['return_requested'];
    expect(targets).toContain('refunded');
    expect(targets).toContain('delivered');
    expect(targets).toHaveLength(2);
  });

  it('no status can transition to itself', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_STATUSES), (status) => {
        expect(VALID_ORDER_TRANSITIONS[status]).not.toContain(status);
      }),
    );
  });

  it('every allowed transition preserves known-status invariant (no orphan targets)', () => {
    const knownSet = new Set(ALL_STATUSES);
    for (const [, targets] of Object.entries(VALID_ORDER_TRANSITIONS)) {
      for (const t of targets) {
        expect(knownSet.has(t)).toBe(true);
      }
    }
  });
});
