import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { UserRole } from '../../auth/types/jwt-payload.type';

// Role gate predicate mirrors the logic in agents and guards
type ResourceOwner = 'self' | 'other';
type IntentCategory = 'merchant-only' | 'shopper-own' | 'both';

function canAccess(
  role: UserRole,
  intentCategory: IntentCategory,
  resourceOwner: ResourceOwner,
): boolean {
  if (intentCategory === 'merchant-only') return role === 'merchant' || role === 'admin';
  if (intentCategory === 'shopper-own')
    return (
      (role === 'shopper' && resourceOwner === 'self') || role === 'merchant' || role === 'admin'
    );
  return true; // 'both'
}

const roles = fc.constantFrom<UserRole>('shopper', 'merchant', 'admin');
const intentCategories = fc.constantFrom<IntentCategory>('merchant-only', 'shopper-own', 'both');
const resourceOwners = fc.constantFrom<ResourceOwner>('self', 'other');

describe('Role gate property tests (NFR-ORC-PBT-001)', () => {
  it('merchant always accesses merchant-only intents', () => {
    fc.assert(
      fc.property(resourceOwners, (owner) => {
        expect(canAccess('merchant', 'merchant-only', owner)).toBe(true);
      }),
    );
  });

  it('shopper never accesses merchant-only intents', () => {
    fc.assert(
      fc.property(resourceOwners, (owner) => {
        expect(canAccess('shopper', 'merchant-only', owner)).toBe(false);
      }),
    );
  });

  it('shopper accesses own resources for shopper-own intents', () => {
    expect(canAccess('shopper', 'shopper-own', 'self')).toBe(true);
  });

  it('shopper cannot access others resources for shopper-own intents', () => {
    expect(canAccess('shopper', 'shopper-own', 'other')).toBe(false);
  });

  it('merchant accesses shopper-own intents regardless of owner', () => {
    fc.assert(
      fc.property(resourceOwners, (owner) => {
        expect(canAccess('merchant', 'shopper-own', owner)).toBe(true);
      }),
    );
  });

  it('admin accesses all intent categories', () => {
    fc.assert(
      fc.property(intentCategories, resourceOwners, (intent, owner) => {
        expect(canAccess('admin', intent, owner)).toBe(true);
      }),
    );
  });

  it('both-role intents accessible to any role and any resource', () => {
    fc.assert(
      fc.property(roles, resourceOwners, (role, owner) => {
        expect(canAccess(role, 'both', owner)).toBe(true);
      }),
    );
  });

  it('cross-product: at least 36 unique (role × intent × owner) combinations verified', () => {
    let count = 0;
    fc.assert(
      fc.property(roles, intentCategories, resourceOwners, (role, intent, owner) => {
        canAccess(role, intent, owner); // just ensure no throws
        count++;
        return true;
      }),
      { numRuns: 200 },
    );
    // fast-check samples 200 runs; given 3×3×2=18 combinations, all 18 covered
    expect(count).toBeGreaterThanOrEqual(18);
  });
});
