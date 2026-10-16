/**
 * Static plan catalogue.
 *
 * The backend stores a `subscription_tier` string on the tenant but has no
 * pricing table and no billing endpoints, so seat caps and prices below are
 * presentation constants, not data. Anything derived from them is labelled as
 * a catalogue value in the UI.
 */
export interface PlanTier {
  key: string;
  label: string;
  price: string;
  cadence: string;
  seatCap: number;
  placeCap: number;
  tagline: string;
  features: string[];
}

export const plans: PlanTier[] = [
  {
    key: 'starter',
    label: 'Starter Family',
    price: '$0',
    cadence: 'free',
    seatCap: 2,
    placeCap: 2,
    tagline: 'One shared list and time-based reminders.',
    features: ['2 household members', '2 saved places', 'Push reminders'],
  },
  {
    key: 'pilot',
    label: 'Pilot Family Tier',
    price: '$14.99',
    cadence: 'per month',
    seatCap: 5,
    placeCap: 10,
    tagline: 'Geofenced store lists and boundary alerts.',
    features: ['5 household members', '10 saved places', 'Geofence shopping lists', 'Quiet hours'],
  },
  {
    key: 'standard',
    label: 'Household Pro',
    price: '$24.99',
    cadence: 'per month',
    seatCap: 10,
    placeCap: 25,
    tagline: 'Voice escalation and unlimited history.',
    features: [
      '10 household members',
      '25 saved places',
      'Automated voice escalation',
      'Priority support',
    ],
  },
  {
    key: 'enterprise',
    label: 'Enterprise Household',
    price: '$49.99',
    cadence: 'per month',
    seatCap: 25,
    placeCap: 100,
    tagline: 'Extended multi-generational households.',
    features: ['25 household members', '100 saved places', 'Voice escalation', 'Dedicated onboarding'],
  },
];

const fallback = plans[1];

export function planFor(tier?: string | null): PlanTier {
  return plans.find((plan) => plan.key === tier) ?? fallback;
}
