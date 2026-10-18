import { describe, expect, it } from 'vitest';
import { planFor, plans } from '@/lib/plans';

/**
 * The catalogue is presentation copy only.
 *
 * Prices, seat caps and place caps belong to `/v1/tenant/quotas` — the numbers
 * the API enforces — so this file must not grow a second copy of them.
 */
describe('plan catalogue', () => {
  it('resolves each backend tier key to a displayed label', () => {
    expect(planFor('pilot').label).toBe('Pilot Family Tier');
    expect(planFor('standard').label).toBe('Household Pro');
    expect(planFor('enterprise').label).toBe('Enterprise Household');
  });

  it('falls back to the pilot plan for an unknown, null or missing tier', () => {
    expect(planFor('mystery-tier').key).toBe('pilot');
    expect(planFor(null).key).toBe('pilot');
    expect(planFor(undefined).key).toBe('pilot');
  });

  it('describes every tier with a key, a label and a tagline', () => {
    for (const plan of plans) {
      expect(plan.key.length).toBeGreaterThan(0);
      expect(plan.label.length).toBeGreaterThan(0);
      expect(plan.tagline.length).toBeGreaterThan(0);
    }
  });

  it('carries no price and no caps — those are the API’s numbers', () => {
    for (const plan of plans) {
      expect(Object.keys(plan).sort()).toEqual(['key', 'label', 'tagline']);
    }
  });
});
