import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
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

  const isLoading = metrics.isLoading || tenants.isLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-pulse">
          {/* Header Hero Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-forest-soft/60" />
              <div className="h-4 w-96 rounded-lg bg-forest-soft/40" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-36 rounded-xl bg-forest-soft/50" />
              <div className="h-10 w-36 rounded-xl bg-forest-soft/50" />
            </div>
          </div>

          {/* 4 Pulse Cards Skeleton — same anatomy as StatCard */}
          <StatGridSkeleton count={4} />

          {/* Main Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 rounded-[1.25rem] bg-surface p-6 shadow-e1" />
            <div className="h-80 rounded-[1.25rem] bg-surface p-6 shadow-e1" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const suspendedCount = data?.by_status?.suspended ?? 0;
  const activeCount = data?.by_status?.active ?? 0;
  const totalTenantsCount = data?.total_tenants ?? tenantList.length;

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Overview"
          titleSize="headline"
          description="Cross-tenant telemetry, subscription distribution, and lifecycle health across every provisioned household."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/admin/analytics"
                className="inline-flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-2.5 text-label-md font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:bg-forest-soft active:translate-y-0 active:shadow-[var(--shadow-inset-sm)]"
              >
                <Icon name="analytics" className="text-[18px]" />
                Platform Analytics
              </Link>
              <Link
                to="/admin/tenants"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-label-md font-bold text-on-primary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                <Icon name="apartment" className="text-[18px]" />
                Tenant Console
              </Link>
            </div>
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

        {/* 1. Platform Overview summary — unified StatCards matching Tenant Dashboard 1:1 */}
        <StatGrid count={4}>
          <StatCard
            to="/admin/tenants"
            title="Total Active Tenants"
            value={metrics.isError ? '—' : (data?.total_tenants ?? 0)}
            icon="apartment"
            tone="forest"
            highlight={<StatHighlight tone="success">{activeCount} Active</StatHighlight>}
          />
          <StatCard
            to="/admin/tenants"
            title="Active Members"
            value={metrics.isError ? '—' : (data?.active_members ?? 0)}
            icon="group"
            tone="forest"
            highlight={<StatHighlight tone="success">Active Seats</StatHighlight>}
          />
          <StatCard
            to="/admin/analytics"
            title="Onboarded This Month"
            value={tenants.isError ? '—' : onboardedThisMonth}
            icon="trending_up"
            tone="sage"
            highlight={<StatHighlight tone="primary">This Month</StatHighlight>}
          />
          <StatCard
            to="/admin/tenants"
            title="Avg Members / Tenant"
            value={tenants.isError ? '—' : avgMembers}
            icon="diversity_3"
            tone={suspendedCount > 0 ? 'coral' : 'forest'}
            highlight={
              suspendedCount > 0 ? (
                <StatHighlight tone="danger" pulse>
                  {suspendedCount} Suspended
                </StatHighlight>
              ) : (
                <StatHighlight tone="success">All Healthy</StatHighlight>
              )
            }
          />
        </StatGrid>

        {/* 2. Side-by-Side Dual Engine matching Tenant Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Engine A: Monthly Provisioning & Lifecycle */}
          <Card
            className="stagger-item p-6 flex flex-col gap-5"
            style={{ '--sibling-index': 4 } as React.CSSProperties}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="trending_up" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Tenant Provisioning &amp; Lifecycle</h2>
                  <p className="text-xs text-muted">New workspaces created over the last six months</p>
                </div>
              </div>
              <Link
                to="/admin/tenants"
                className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all"
              >
                View Workspaces &rarr;
              </Link>
            </div>

            {monthly.every((month) => month.count === 0) ? (
              <p className="text-sm text-muted italic py-6 text-center bg-canvas rounded-2xl shadow-[var(--shadow-inset-sm)]">
                No workspaces provisioned in the last six months.
              </p>
            ) : (
              <div
                className="relative flex h-44 items-end gap-3 overflow-hidden rounded-2xl bg-canvas px-4 pt-6 pb-3.5 shadow-[var(--shadow-inset-sm)]"
                role="img"
                aria-label="New tenants per month"
              >
                {/* Subtle tactile chart gridlines */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-4 top-6 bottom-9 flex flex-col justify-between"
                >
                  <div className="border-b border-dashed border-outline-variant/25" />
                  <div className="border-b border-dashed border-outline-variant/25" />
                  <div className="border-b border-outline-variant/30" />
                </div>

                {monthly.map((month, idx) => {
                  const isActiveMonth = month.count > 0;
                  const barHeightPercent = isActiveMonth
                    ? Math.max(18, Math.round((month.count / peak) * 100))
                    : 6;
                  return (
                    <span
                      key={month.key}
                      className="group/bar relative z-10 flex flex-1 flex-col items-center gap-2 h-full justify-end"
                    >
                      <span
                        className={`text-label-sm font-bold tabular-nums transition-transform duration-300 group-hover/bar:-translate-y-0.5 ${
                          isActiveMonth ? 'text-secondary' : 'text-muted/70'
                        }`}
                      >
                        {month.count}
                      </span>
                      <span
                        className={`animate-bar-y w-full max-w-[44px] rounded-t-xl transition-all duration-300 ${
                          isActiveMonth
                            ? 'bg-gradient-to-t from-primary to-secondary shadow-[0_4px_12px_-2px_rgba(55,104,71,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] group-hover/bar:brightness-110'
                            : 'bg-outline-variant/40'
                        }`}
                        style={
                          {
                            height: `${barHeightPercent}%`,
                            '--bar-index': idx,
                          } as React.CSSProperties
                        }
                      />
                      <span className="text-label-sm font-medium text-muted">{month.label}</span>
                    </span>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Lifecycle Breakdown</span>
              <div className="grid grid-cols-3 gap-3">
                {(['active', 'trial', 'suspended'] as const).map((status) => {
                  const statusCount = data?.by_status?.[status] ?? 0;
                  const statusRatio =
                    totalTenantsCount > 0 ? Math.min(100, Math.round((statusCount / totalTenantsCount) * 100)) : 0;
                  return (
                    <div
                      key={status}
                      className="p-3.5 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge
                          tone={
                            status === 'suspended'
                              ? 'danger'
                              : status === 'active'
                                ? 'success'
                                : 'warning'
                          }
                        >
                          {status}
                        </Badge>
                        <span className="text-base font-extrabold text-on-surface tabular-nums">
                          {statusCount}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                        <div
                          className={`animate-bar-x h-full rounded-full ${
                            status === 'suspended'
                              ? 'bg-error'
                              : status === 'active'
                                ? 'bg-secondary'
                                : 'bg-warning'
                          }`}
                          style={{ width: `${Math.max(statusCount > 0 ? 12 : 0, statusRatio)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <Link to="/admin/audit-logs" className="text-xs font-medium text-muted hover:text-on-surface transition-colors">
                Open Security Audit Ledger &rarr;
              </Link>
              <Link to="/admin/tenants" className="text-xs font-semibold text-secondary hover:underline">
                Provision New Workspace &rarr;
              </Link>
            </div>
          </Card>

          {/* Engine B: Subscription Tiers & Revenue Operations */}
          <Card
            className="stagger-item p-6 flex flex-col gap-5"
            style={{ '--sibling-index': 5 } as React.CSSProperties}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="receipt_long" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Subscription Tiers &amp; Billing</h2>
                  <p className="text-xs text-muted">Share of provisioned household workspaces by plan tier</p>
                </div>
              </div>
              <Link
                to="/admin/billing"
                className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all"
              >
                Open Invoices &rarr;
              </Link>
            </div>

            {tierSegments.length === 0 ? (
              <p className="text-sm text-muted italic py-6 text-center bg-canvas rounded-2xl shadow-[var(--shadow-inset-sm)]">
                No subscription data yet.
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-6 p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)]">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                  <svg viewBox="0 0 42 42" className="h-32 w-32 -rotate-90" role="img" aria-label="Tier distribution">
                    <circle
                      cx="21"
                      cy="21"
                      r="15.9155"
                      fill="transparent"
                      stroke="var(--color-surface-container)"
                      strokeWidth="5.5"
                    />
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
                          strokeWidth="5.5"
                          strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
                          strokeDashoffset={-offset}
                          className="animate-ring-segment transition-all duration-500"
                        />
                      );
                    })}
                  </svg>
                  {/* Tactile raised clay center medallion */}
                  <div className="pointer-events-none absolute flex h-16 w-16 flex-col items-center justify-center rounded-full bg-surface shadow-[var(--shadow-clay-sm)]">
                    <span className="text-sm font-extrabold leading-none text-on-surface tabular-nums">
                      {totalTenantsCount}
                    </span>
                    <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-muted">
                      Total
                    </span>
                  </div>
                </div>

                <ul className="flex flex-1 flex-col gap-2.5 min-w-[180px]">
                  {tierSegments.map((segment) => (
                    <li key={segment.tier} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shadow-2xs"
                            style={{ backgroundColor: segment.color }}
                          />
                          <span className="text-sm font-semibold capitalize text-on-surface">{segment.tier}</span>
                        </span>
                        <span className="text-xs font-bold text-muted tabular-nums">
                          {segment.count} ({segment.percent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                        <div
                          className="animate-bar-x h-full rounded-full"
                          style={{
                            width: `${Math.max(8, segment.percent)}%`,
                            backgroundColor: segment.color,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Payment Gateways</span>
                <span className="text-base font-extrabold text-on-surface">
                  Stripe, bKash &amp; Cash
                </span>
                <Link to="/admin/payment-gateways" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  Configure Gateways &rarr;
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">System Health</span>
                <span className="text-base font-extrabold text-on-surface">
                  Checks &amp; Backups
                </span>
                <Link to="/admin/health" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  Inspect Operations &rarr;
                </Link>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <Link to="/admin/refunds" className="text-xs font-medium text-muted hover:text-on-surface transition-colors">
                Manage Refund Requests &rarr;
              </Link>
              <Link to="/admin/analytics" className="text-xs font-semibold text-secondary hover:underline">
                View Full MRR Analytics &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
