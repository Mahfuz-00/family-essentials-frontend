/**
 * Plan descriptions, and nothing more.
 *
 * The limits and the price belong to the API: `/v1/tenant/quotas` returns the
 * plan's `label`, `price`, `cadence`, `seat_cap` and `place_cap`, and those are
 * the numbers it enforces. Tenant-scoped screens read them through `useQuota()`
 * — this file used to carry a second, divergent copy of all of them.
 *
 * What is left here is what no endpoint sends: the tier *keys* a platform
 * operator picks from (the API validates a tier against the same list), and the
 * one-line description of each tier. The label is kept for the landlord console,
 * which lists other households' tiers and has no tenant quota to read them from.
 */
export interface PlanTier {
  key: string;
  label: string;
  tagline: string;
}

export const plans: PlanTier[] = [
  {
    key: 'starter',
    label: 'Starter Family',
    tagline: 'One shared list and time-based reminders.',
  },
  {
    key: 'pilot',
    label: 'Pilot Family Tier',
    tagline: 'Geofenced store lists and boundary alerts.',
  },
  {
    key: 'standard',
    label: 'Household Pro',
    tagline: 'Voice escalation and unlimited history.',
  },
  {
    key: 'enterprise',
    label: 'Enterprise Household',
    tagline: 'Extended multi-generational households.',
  },
];

const fallback = plans[1];

export function planFor(tier?: string | null): PlanTier {
  return plans.find((plan) => plan.key === tier) ?? fallback;
}
