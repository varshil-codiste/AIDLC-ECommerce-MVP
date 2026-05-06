import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { validateWidgetPayload } from '../widget-schemas/index';

// NFR-09-PBT-01: notification_inbox widget schema round-trips

const notificationTypeArb = fc.constantFrom('order.created', 'low_stock');

const notificationItemArb = fc.record({
  id: fc.uuid(),
  type: notificationTypeArb,
  message: fc.string({ minLength: 1, maxLength: 200 }),
  read: fc.boolean(),
  createdAt: fc.date().map((d) => d.toISOString()),
});

const notificationInboxArb = fc.record({
  notifications: fc.array(notificationItemArb, { minLength: 0, maxLength: 50 }),
  unreadCount: fc.integer({ min: 0, max: 1000 }),
});

describe('notification_inbox schema PBT (NFR-09-PBT-01)', () => {
  it('valid notification_inbox payloads always pass', () => {
    fc.assert(
      fc.property(notificationInboxArb, (data) => {
        expect(validateWidgetPayload('notification_inbox', data)).toBe(true);
      }),
    );
  });

  it('missing notifications array always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, (data) => {
        const { notifications: _, ...rest } = data;
        expect(validateWidgetPayload('notification_inbox', rest)).toBe(false);
      }),
    );
  });

  it('missing unreadCount always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, (data) => {
        const { unreadCount: _, ...rest } = data;
        expect(validateWidgetPayload('notification_inbox', rest)).toBe(false);
      }),
    );
  });

  it('notifications array exceeding 50 items always fails', () => {
    fc.assert(
      fc.property(
        notificationInboxArb,
        fc.array(notificationItemArb, { minLength: 51, maxLength: 60 }),
        (base, tooMany) => {
          expect(validateWidgetPayload('notification_inbox', { ...base, notifications: tooMany })).toBe(false);
        },
      ),
    );
  });

  it('unknown notification type always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, notificationItemArb, fc.string({ minLength: 1 }), (base, item, badType) => {
        const knownTypes = new Set(['order.created', 'low_stock']);
        fc.pre(!knownTypes.has(badType));
        const badItem = { ...item, type: badType };
        expect(validateWidgetPayload('notification_inbox', { ...base, notifications: [badItem] })).toBe(false);
      }),
    );
  });

  it('negative unreadCount always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, fc.integer({ min: -1000, max: -1 }), (data, negative) => {
        expect(validateWidgetPayload('notification_inbox', { ...data, unreadCount: negative })).toBe(false);
      }),
    );
  });

  it('notification item missing required id always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, notificationItemArb, (base, item) => {
        const { id: _, ...itemWithoutId } = item;
        expect(validateWidgetPayload('notification_inbox', { ...base, notifications: [itemWithoutId] })).toBe(false);
      }),
    );
  });

  it('notification item with additional unknown property always fails', () => {
    fc.assert(
      fc.property(notificationInboxArb, notificationItemArb, (base, item) => {
        const itemWithExtra = { ...item, _extra: 'forbidden' };
        expect(validateWidgetPayload('notification_inbox', { ...base, notifications: [itemWithExtra] })).toBe(false);
      }),
    );
  });
});
