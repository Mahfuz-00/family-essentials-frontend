import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useTenantStore } from '@/stores/tenant';
import type { QuotaMeter, QuotaReport } from '@/types';

/** The plan record the API sends: the numbers it actually enforces. */
export type ServerPlan = QuotaReport['plan'];

/**
 * The household's plan limits and live usage, from the API.
 *
 * Everything numeric here is the server's: `plan` is the plan record it sent,
 * and `capFor()` reads the same caps it refuses a request against. A cap that
 * has not arrived is `null` rather than a catalogue guess — a screen must be
 * able to say "unknown" instead of printing a limit nothing enforces.
 */
export function useQuota(options: { enabled?: boolean } = {}) {
  const active = useTenantStore((state) => state.active);

  const query = useQuery({
    queryKey: ['tenant', 'quotas'],
    queryFn: async () => (await api.get<QuotaReport>('/v1/tenant/quotas')).data,
    staleTime: 60_000,
    // A platform admin has no household, and the endpoint would 404 for one.
    enabled: options.enabled ?? true,
  });

  const meter = (key: QuotaMeter['key']): QuotaMeter | undefined =>
    query.data?.meters.find((entry) => entry.key === key);

  const capFor = (key: QuotaMeter['key']): number | null => meter(key)?.cap ?? null;

  return {
    ...query,
    /** Null until the API answers; never a presentation constant. */
    plan: query.data?.plan ?? null,
    /** A neutral word for an unknown plan, so a heading never renders empty. */
    planLabel: query.data?.plan.label ?? 'Your plan',
    meter,
    capFor,
    seatCap: capFor('seats'),
    placeCap: capFor('places'),
    seatsUsed: query.data?.usage.members ?? active?.member_count ?? 0,
  };
}
