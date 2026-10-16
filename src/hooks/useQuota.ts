import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { planFor, type PlanTier } from '@/lib/plans';
import { useTenantStore } from '@/stores/tenant';
import type { QuotaMeter, QuotaReport } from '@/types';

/**
 * The household's plan limits and live usage, from the API.
 *
 * The caps come from the server now — the same numbers it enforces — while
 * `planFor()` still supplies the cosmetics (label, price, feature bullet list)
 * that no backend owns.
 *
 * `capFor()` falls back to the catalogue if the request has not resolved, so a
 * seat meter never renders as `undefined` mid-load.
 */
export function useQuota(options: { enabled?: boolean } = {}) {
  const active = useTenantStore((state) => state.active);
  const plan: PlanTier = planFor(active?.subscription_tier);

  const query = useQuery({
    queryKey: ['tenant', 'quotas'],
    queryFn: async () => (await api.get<QuotaReport>('/v1/tenant/quotas')).data,
    staleTime: 60_000,
    // A platform admin has no household, and the endpoint would 404 for one.
    enabled: options.enabled ?? true,
  });

  const meter = (key: QuotaMeter['key']): QuotaMeter | undefined =>
    query.data?.meters.find((entry) => entry.key === key);

  const capFor = (key: QuotaMeter['key'], fallback: number): number =>
    meter(key)?.cap ?? fallback;

  return {
    ...query,
    plan,
    meter,
    capFor,
    seatsUsed: query.data?.usage.members ?? active?.member_count ?? 0,
    planLabel: query.data?.plan.label ?? plan.label,
  };
}
