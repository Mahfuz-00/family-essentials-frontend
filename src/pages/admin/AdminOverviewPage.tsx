import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import type { Paginated, PlatformMetrics, Tenant } from '@/types';

const donutColors = ['#376847', '#4d6054', '#81b29a', '#f4a261', '#e76f51', '#b7ccbc'];

/** 100 households a page, as the API allows, and a ceiling on the loop. */
const PER_PAGE = 100;
const MAX_PAGES = 50;

/**
 * Every tenant, not the first page of them.
 *
 * The screen used to fetch `/v1/platform/tenants` with no `per_page`, then
 * count "onboarded this month" and "average members" from that single page —
 * so every household past the twentieth was silently left out of the numbers.
 */
async function fetchAllTenants(): Promise<Tenant[]> {
  const first = (
    await api.get<Paginated<Tenant>>('/v1/platform/tenants', {
      params: { page: 1, per_page: PER_PAGE },
    })
  ).data;

  const lastPage = Math.min(first.meta?.last_page ?? 1, MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, lastPage - 1) }, (_, index) =>
      api.get<Paginated<Tenant>>('/v1/platform/tenants', {
        params: { page: index + 2, per_page: PER_PAGE },
      }),
    ),
  );

  return [first, ...rest.map((page) => page.data)].flatMap((page) => page.data ?? []);
}

export function AdminOverviewPage() {
  const metrics = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: async () => (await api.get<PlatformMetrics>('/v1/platform/metrics')).data,
  });

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', 'all'],
    queryFn: fetchAllTenants,
  });

  const data = metrics.data;
  const byTier = data?.by_tier ?? {};

  const tierSegments = useMemo(() => {
    const entries = Object.entries(byTier);
    const total = entries.reduce((sum, [, count]) => sum + count, 0);

    if (total === 0) {
      return [];
    }

    return entries.map(([tier, count], index) => ({
      tier,
      count,
      percent: Math.round((count / total) * 100),
      color: donutColors[index % donutColors.length],
    }));
  }, [byTier]);

  // Real monthly provisioning counts, derived from each tenant's created_at.
  const monthly = useMemo(() => {
    const list = tenants.data ?? [];

    if (list.length === 0) {
      return [];
    }

    const buckets: { key: string; label: string; count: number }[] = [];
    const now = new Date();

    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString(undefined, { month: 'short' }),
        count: 0,
      });
    }

    for (const tenant of list) {
      const created = new Date(tenant.created_at);
      const bucket = buckets.find(
        (candidate) => candidate.key === `${created.getFullYear()}-${created.getMonth()}`,
      );

      if (bucket) {
        bucket.count += 1;
      }
    }

    return buckets;
  }, [tenants.data]);

  const peak = Math.max(1, ...monthly.map((month) => month.count));
  const onboardedThisMonth = monthly[monthly.length - 1]?.count ?? 0;

  const tenantList = tenants.data ?? [];
  const avgMembers =
    tenantList.length === 0
      ? 0
      : Math.round(
          (tenantList.reduce((sum, tenant) => sum + (tenant.member_count ?? 0), 0) / tenantList.length) *
            10,
        ) / 10;

  const cards: {
    label: string;
    value: string | number;
    icon: string;
    tone: string;
    footer: { label: string; value: number }[] | null;
  }[] = [
    {
      label: 'Total Active Tenants',
      value: metrics.isError ? '—' : (data?.total_tenants ?? 0),
      icon: 'apartment',
      tone: 'bg-forest-soft text-secondary',
      footer: [
        { label: 'Active', value: data?.by_status?.active ?? 0 },
        { label: 'Trial', value: data?.by_status?.trial ?? 0 },
        { label: 'Suspended', value: data?.by_status?.suspended ?? 0 },
      ],
    },
    {
      label: 'Active Members',
      value: metrics.isError ? '—' : (data?.active_members ?? 0),
      icon: 'group',
      tone: 'bg-sage-soft text-primary',
      footer: null,
    },
    {
      label: 'Onboarded This Month',
      value: tenants.isError ? '—' : onboardedThisMonth,
      icon: 'trending_up',
      tone: 'bg-sage-soft text-secondary',
      footer: null,
    },
    {
      label: 'Avg Members / Tenant',
      value: tenants.isError ? '—' : avgMembers,
      icon: 'diversity_3',
      tone: 'bg-coral-soft text-tertiary',
      footer: null,
    },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <span className="h-2 w-2 rounded-full bg-success" />
              Platform Admin · All tenants
            </>
          }
          title="Platform Analytics & Global Operations"
          description="Cross-tenant telemetry and lifecycle health across every provisioned household."
          actions={
            <Link to="/admin/tenants" className="inline-flex">
              <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary active:scale-[0.97]">
                <Icon name="apartment" className="text-[18px]" />
                Tenant console
              </span>
            </Link>
          }
        />

        {metrics.isError && (
          <QueryError
            error={metrics.error}
            what="platform metrics"
            onRetry={() => void metrics.refetch()}
          />
        )}
        {tenants.isError && (
          <QueryError
            error={tenants.error}
            what="the tenant list behind these charts"
            onRetry={() => void tenants.refetch()}
          />
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.isLoading
            ? cards.map((card) => <SkeletonCard key={card.label} />)
            : cards.map((card) => (
                <Card key={card.label} className="flex flex-col gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-label-sm uppercase tracking-wider text-muted">{card.label}</span>
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.tone}`}>
                      <Icon name={card.icon} className="text-[20px]" />
                    </span>
                  </div>
                  <span className="text-display-lg font-bold text-on-surface">{card.value}</span>
                  {card.footer && (
                    <span className="flex items-center justify-between border-t border-canvas pt-3">
                      {card.footer.map((item) => (
                        <span key={item.label} className="flex flex-col">
                          <span className="text-body-sm text-muted">{item.label}</span>
                          <span className="text-label-lg text-on-surface">{item.value}</span>
                        </span>
                      ))}
                    </span>
                  )}
                </Card>
              ))}
        </section>

        <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Monthly provisioning */}
          <Card className="flex flex-col gap-4 p-5 lg:col-span-7">
            <div className="flex flex-col gap-1">
              <h2 className="text-headline-sm text-on-surface">Tenant provisioning by month</h2>
              <p className="text-body-sm text-muted">
                Counted from each workspace's creation date. No revenue axis: no billing data is stored.
              </p>
            </div>

            {monthly.every((month) => month.count === 0) ? (
              <p className="rounded-xl bg-canvas px-4 py-8 text-center text-body-sm text-muted">
                No workspaces provisioned in the last six months.
              </p>
            ) : (
              <div className="flex h-44 items-end gap-3" role="img" aria-label="New tenants per month">
                {monthly.map((month) => (
                  <span key={month.key} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-label-sm text-on-surface">{month.count}</span>
                    <span
                      className="w-full rounded-t-lg bg-secondary/80"
                      style={{ height: `${Math.max(4, (month.count / peak) * 100)}%` }}
                    />
                    <span className="text-label-sm text-muted">{month.label}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>

          {/* Tier donut */}
          <Card className="flex flex-col gap-4 p-5 lg:col-span-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-headline-sm text-on-surface">Subscription tiers</h2>
              <p className="text-body-sm text-muted">Share of provisioned workspaces by tier.</p>
            </div>

            {tierSegments.length === 0 ? (
              <p className="rounded-xl bg-canvas px-4 py-8 text-center text-body-sm text-muted">
                No subscription data yet.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-6">
                <svg viewBox="0 0 42 42" className="h-36 w-36 -rotate-90" role="img" aria-label="Tier distribution">
                  {tierSegments.map((segment, index) => {
                    const offset = tierSegments
                      .slice(0, index)
                      .reduce((sum, previous) => sum + previous.percent, 0);

                    return (
                      <circle
                        key={segment.tier}
                        cx="21"
                        cy="21"
                        r="15.9155"
                        fill="transparent"
                        stroke={segment.color}
                        strokeWidth="6"
                        strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                        strokeDashoffset={-offset}
                      />
                    );
                  })}
                  <circle cx="21" cy="21" r="10" fill="var(--color-surface)" />
                </svg>

                <ul className="flex flex-1 flex-col gap-2">
                  {tierSegments.map((segment) => (
                    <li key={segment.tier} className="flex items-center justify-between gap-3">
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: segment.color }}
                        />
                        <span className="text-body-md text-on-surface">{segment.tier}</span>
                      </span>
                      <span className="text-label-md text-muted">
                        {segment.count} · {segment.percent}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </section>

        <Card className="p-5">
          <h2 className="text-headline-sm text-on-surface">Lifecycle breakdown</h2>
          <p className="text-body-sm text-muted">Households by workspace state.</p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {Object.entries(data?.by_status ?? {}).map(([status, total]) => (
              <li
                key={status}
                className="flex items-center gap-3 rounded-xl bg-canvas px-4 py-3"
              >
                <Badge tone={status === 'suspended' ? 'danger' : status === 'active' ? 'success' : 'warning'}>
                  {status}
                </Badge>
                <span className="text-label-lg text-on-surface">{total}</span>
              </li>
            ))}
            {Object.keys(data?.by_status ?? {}).length === 0 && (
              <li className="rounded-xl bg-canvas px-4 py-6 text-center text-body-sm text-muted">
                No tenants provisioned yet.
              </li>
            )}
          </ul>
        </Card>

        <Alert tone="info">
          Tenant suspension and provisioning are audited into the security ledger — see{' '}
          <Link to="/admin/audit-logs" className="font-semibold text-secondary hover:underline">
            Audit & Security Logs
          </Link>
          .
        </Alert>
      </div>
    </AppLayout>
  );
}
