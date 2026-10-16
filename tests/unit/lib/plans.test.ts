import { describe, expect, it } from 'vitest';
import { planFor, plans } from '@/lib/plans';

describe('plan catalogue', () => {
  it('resolves each backend tier to a displayed plan', () => {
    expect(planFor('pilot').label).toBe('Pilot Family Tier');
    expect(planFor('standard').label).toBe('Household Pro');
    expect(planFor('enterprise').label).toBe('Enterprise Household');
  });

  it('falls back to the pilot plan for an unknown, null or missing tier', () => {
    expect(planFor('mystery-tier').key).toBe('pilot');
    expect(planFor(null).key).toBe('pilot');
    expect(planFor(undefined).key).toBe('pilot');
  });

  it('increases seat and place caps as tiers get larger', () => {
    const seats = plans.map((plan) => plan.seatCap);
    const places = plans.map((plan) => plan.placeCap);

    expect(seats).toEqual([...seats].sort((a, b) => a - b));
    expect(places).toEqual([...places].sort((a, b) => a - b));
  });

  it('gives every plan a price, a cadence and at least one feature', () => {
    for (const plan of plans) {
      expect(plan.price).toMatch(/^\$/);
      expect(plan.cadence.length).toBeGreaterThan(0);
      expect(plan.features.length).toBeGreaterThan(0);
      expect(plan.seatCap).toBeGreaterThan(0);
    }
  });
});
