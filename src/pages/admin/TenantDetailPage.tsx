import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { plans, planFor } from '@/lib/plans';
import type { TenantDetailPayload } from '@/types';

function relativeDate(value: string): string {
  const days = Math.round((Date.now() - new Date(value).getTime()) / 86_400_000);

  if (days < 1) {
    return 'today';
  }

  if (days < 30) {
    return `${days}d ago`;
  }

  if (days < 365) {
    return `${Math.round(days / 30)}mo ago`;
  }

  return `${Math.round(days / 365)}y ago`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type TabKey = 'overview' | 'members' | 'quotas' | 'billing';

interface TenantDetailPageProps {
  tenantId?: string | number;
}

export function TenantDetailPage({ tenantId: propTenantId }: TenantDetailPageProps) {
  const queryClient = useQueryClient();
  const routeParams = useParams({ strict: false }) as { tenantId?: string };
  const rawId = propTenantId ?? routeParams.tenantId;
  const tenantId = rawId ? String(rawId) : '';

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tenantQuery = useQuery({
    queryKey: ['platform', 'tenants', tenantId],
    queryFn: async () => {
      if (!tenantId) throw new Error('No tenant ID provided');
      return (await api.get<TenantDetailPayload>(`/v1/platform/tenants/${tenantId}`)).data;
    },
    enabled: Boolean(tenantId),
  });

  const updateTenant = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      if (!tenantId) return;
      return (await api.patch(`/v1/platform/tenants/${tenantId}`, body)).data;
    },
    onSuccess: () => {
      setNotice('Tenant updated successfully.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const setStatusOf = useMutation({
    mutationFn: async (action: 'suspend' | 'activate') => {
      if (!tenantId) return;
      return (await api.post(`/v1/platform/tenants/${tenantId}/${action}`)).data;
    },
    onSuccess: (_, action) => {
      setNotice(`Tenant workspace ${action === 'suspend' ? 'suspended' : 'activated'} successfully.`);
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const busy = updateTenant.isPending || setStatusOf.isPending;
  const data = tenantQuery.data;
  const tenant = data?.tenant;
  const plan = tenant ? planFor(tenant.subscription_tier) : null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        {/* Navigation Action */}
        <div>
          <Link
            to="/admin/tenants"
            className="inline-flex items-center gap-1.5 text-label-md font-semibold text-secondary hover:underline"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            Back to Tenants
          </Link>
        </div>

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {tenantQuery.isLoading && (
          <Card className="flex flex-col items-center justify-center py-16">
            <Icon name="sync" className="animate-spin text-[32px] text-secondary" />
            <p className="mt-3 text-body-md text-muted">Loading household records from server…</p>
          </Card>
        )}

        {tenantQuery.isError && (
          <Alert tone="error">{apiError(tenantQuery.error)}</Alert>
        )}

        {data && tenant && (
          <>
            {/* Page Header */}
            <PageHeader
              title={`Household: ${tenant.name}`}
              description={`Tenant #${tenant.id} · slug: ${tenant.slug} · Created ${relativeDate(
                tenant.created_at,
              )} (${new Date(tenant.created_at).toLocaleDateString()})`}
              actions={
                <div className="flex items-center gap-2">
                  {tenant.status === 'suspended' ? (
                    <Button
                      variant="primary"
                      disabled={busy}
                      onClick={() => setStatusOf.mutate('activate')}
                    >
                      <Icon name="check_circle" className="text-[18px]" />
                      Reactivate Workspace
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => setStatusOf.mutate('suspend')}
                    >
                      <Icon name="pause_circle" className="text-[18px] text-error" />
                      Suspend Workspace
                    </Button>
                  )}
                  <Button
                    size="md"
                    variant="ghost"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] });
                    }}
                  >
                    <Icon name="refresh" className="text-[18px]" />
                  </Button>
                </div>
              }
            />

            {/* De-cluttered Segmented Tab Bar */}
            <div className="flex border-b border-outline-variant/30 gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'overview'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-muted hover:text-on-surface'
                }`}
              >
                <Icon name="dashboard" className="text-[18px]" />
                Overview &amp; Health
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'members'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-muted hover:text-on-surface'
                }`}
              >
                <Icon name="group" className="text-[18px]" />
                Members &amp; Seats ({data.members.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('quotas')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'quotas'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-muted hover:text-on-surface'
                }`}
              >
                <Icon name="tune" className="text-[18px]" />
                Quotas &amp; Telemetry
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('billing')}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
                  activeTab === 'billing'
                    ? 'border-secondary text-secondary'
                    : 'border-transparent text-muted hover:text-on-surface'
                }`}
              >
                <Icon name="receipt_long" className="text-[18px]" />
                Subscription &amp; Tier Controls
              </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-4 border-surface-container bg-surface-container-low p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-forest-soft text-headline-sm font-bold text-secondary">
                        {initials(tenant.name)}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-headline-md font-bold text-on-surface">
                          {tenant.name}
                        </span>
                        <span className="font-mono text-body-sm text-muted">
                          ID: #{tenant.id} · {tenant.slug}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge
                        tone={
                          tenant.status === 'suspended'
                            ? 'danger'
                            : tenant.status === 'active'
                              ? 'success'
                              : 'warning'
                        }
                      >
                        Status: {tenant.status}
                      </Badge>
                      <Badge tone="neutral">
                        Tier: {plan?.label ?? tenant.subscription_tier}
                      </Badge>
                    </div>
                  </div>
                </Card>

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  <Card className="flex flex-col gap-1 p-4">
                    <span className="text-label-sm font-medium text-muted">Family Members</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.counts.members_count}
                    </span>
                    <span className="text-body-xs text-muted">
                      Seat Cap: {data.quotas?.plan?.seat_cap ?? '—'}
                    </span>
                  </Card>

                  <Card className="flex flex-col gap-1 p-4">
                    <span className="text-label-sm font-medium text-muted">Saved Places</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.counts.places_count}
                    </span>
                    <span className="text-body-xs text-muted">
                      Place Cap: {data.quotas?.plan?.place_cap ?? '—'}
                    </span>
                  </Card>

                  <Card className="flex flex-col gap-1 p-4">
                    <span className="text-label-sm font-medium text-muted">Total Errands</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.counts.requests_count}
                    </span>
                    <span className="text-body-xs text-muted">
                      {data.counts.requests_completed} completed · {data.counts.requests_pending} pending
                    </span>
                  </Card>

                  <Card className="flex flex-col gap-1 p-4">
                    <span className="text-label-sm font-medium text-muted">Shared Ledgers</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.counts.ledgers_count}
                    </span>
                    <span className="text-body-xs text-muted">
                      ${(data.counts.total_expenses_cents / 100).toFixed(2)} logged
                    </span>
                  </Card>

                  <Card className="flex flex-col gap-1 p-4">
                    <span className="text-label-sm font-medium text-muted">Pantry Essentials</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.counts.essentials_count}
                    </span>
                    <span className="text-body-xs text-muted">Active items</span>
                  </Card>
                </div>

                {/* Primary Household Contact */}
                {data.members.length > 0 && (
                  <Card className="flex flex-col gap-3 p-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-label-md font-bold uppercase tracking-wider text-muted">
                        Primary Household Contact
                      </h3>
                      <button
                        type="button"
                        onClick={() => setActiveTab('members')}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        View all {data.members.length} members →
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-label-sm font-bold text-secondary">
                        {initials(data.members[0].name)}
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-on-surface">{data.members[0].name}</span>
                        <span className="text-body-sm text-muted">{data.members[0].email}</span>
                      </div>
                      <Badge tone="primary" className="ml-auto">
                        {data.members[0].role}
                      </Badge>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 2: MEMBERS */}
            {activeTab === 'members' && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-label-md font-bold uppercase tracking-wider text-muted">
                    Household Members ({data.members.length})
                  </h3>
                </div>

                {data.members.length === 0 ? (
                  <Card className="p-8 text-center text-body-sm text-muted">
                    No members have joined this household yet.
                  </Card>
                ) : (
                  <Card className="overflow-hidden p-0">
                    <Table className="min-w-full">
                      <THead>
                        <TH>Member</TH>
                        <TH>Contact</TH>
                        <TH>Role</TH>
                        <TH>Status</TH>
                        <TH>Joined</TH>
                      </THead>
                      <tbody>
                        {data.members.map((member) => (
                          <TR key={member.id}>
                            <TD>
                              <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-label-sm font-bold text-secondary">
                                  {initials(member.name)}
                                </span>
                                <span className="font-semibold text-on-surface">{member.name}</span>
                              </div>
                            </TD>
                            <TD>
                              <div className="flex flex-col">
                                <span className="text-body-sm text-on-surface">{member.email}</span>
                                {member.phone && (
                                  <span className="font-mono text-body-xs text-muted">
                                    {member.phone}
                                  </span>
                                )}
                              </div>
                            </TD>
                            <TD>
                              <Badge
                                tone={
                                  member.role === 'owner' || member.role === 'tenant_admin'
                                    ? 'primary'
                                    : 'neutral'
                                }
                              >
                                {member.role}
                              </Badge>
                            </TD>
                            <TD>
                              <Badge tone={member.status === 'active' ? 'success' : 'warning'}>
                                {member.status}
                              </Badge>
                            </TD>
                            <TD className="text-body-sm text-muted">
                              {new Date(member.joined_at).toLocaleDateString()}
                            </TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                )}
              </div>
            )}

            {/* TAB 3: QUOTAS & TELEMETRY */}
            {activeTab === 'quotas' && (
              <div className="flex flex-col gap-6">
                {data.quotas && (
                  <Card className="flex flex-col gap-5 p-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                          <Icon name="tune" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-base font-bold text-on-surface">
                            Subscription Quota &amp; Capacity Limits
                          </h4>
                          <p className="text-xs text-muted">Real-time resource meters enforced by API gates</p>
                        </div>
                      </div>
                      <Badge tone="primary">{data.quotas.plan?.label ?? 'Plan Quotas'}</Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                        <div className="flex items-center justify-between text-label-sm text-muted">
                          <span className="font-bold text-on-surface">Seats Allocated</span>
                          <span>
                            {data.quotas.usage?.members ?? data.counts.members_count} / {data.quotas.plan?.seat_cap ?? '—'}
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container">
                          <div
                            className="h-full rounded-full bg-secondary transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((data.quotas.usage?.members ?? data.counts.members_count) /
                                  (data.quotas.plan?.seat_cap || 1)) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                        <div className="flex items-center justify-between text-label-sm text-muted">
                          <span className="font-bold text-on-surface">Places Tracked</span>
                          <span>
                            {data.quotas.usage?.places ?? data.counts.places_count} / {data.quotas.plan?.place_cap ?? '—'}
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((data.quotas.usage?.places ?? data.counts.places_count) /
                                  (data.quotas.plan?.place_cap || 1)) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                        <div className="flex items-center justify-between text-label-sm text-muted">
                          <span className="font-bold text-on-surface">Requests This Month</span>
                          <span>
                            {data.quotas.usage?.requests_this_month ?? data.counts.requests_count} /{' '}
                            {data.quotas.plan?.monthly_requests ?? '—'}
                          </span>
                        </div>
                        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-container">
                          <div
                            className="h-full rounded-full bg-tertiary transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                ((data.quotas.usage?.requests_this_month ?? data.counts.requests_count) /
                                  (data.quotas.plan?.monthly_requests || 1)) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </Card>
                )}

                <Card className="p-5">
                  <h3 className="mb-4 text-label-md font-bold uppercase tracking-wider text-muted">
                    Resource Allocations &amp; Live Telemetry
                  </h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <span className="text-xs text-muted">Members Registered</span>
                      <p className="mt-1 text-headline-sm font-bold text-on-surface">{data.counts.members_count}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <span className="text-xs text-muted">Places Tracked</span>
                      <p className="mt-1 text-headline-sm font-bold text-on-surface">{data.counts.places_count}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <span className="text-xs text-muted">Errands Created</span>
                      <p className="mt-1 text-headline-sm font-bold text-on-surface">{data.counts.requests_count}</p>
                    </div>
                    <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <span className="text-xs text-muted">Pantry Items</span>
                      <p className="mt-1 text-headline-sm font-bold text-on-surface">{data.counts.essentials_count}</p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: BILLING & TIER CONTROLS */}
            {activeTab === 'billing' && (
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-6 p-6">
                  <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                      <Icon name="workspace_premium" className="text-[20px]" />
                    </span>
                    <div>
                      <h4 className="text-base font-bold text-on-surface">
                        Subscription Tier &amp; Access Controls
                      </h4>
                      <p className="text-xs text-muted">Change membership plan or grant trial days</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <Label htmlFor="change-tier" className="text-sm font-bold text-on-surface">
                        Subscription Tier Override
                      </Label>
                      <select
                        id="change-tier"
                        value={tenant.subscription_tier}
                        disabled={updateTenant.isPending}
                        onChange={(e) => updateTenant.mutate({ subscription_tier: e.target.value })}
                        className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm font-medium text-on-surface shadow-xs focus:border-secondary focus:outline-none"
                      >
                        {plans.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <span className="text-xs text-muted">
                        Takes effect immediately. Quotas will automatically expand.
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4">
                      <span className="text-sm font-bold text-on-surface">
                        Extend Trial Access
                      </span>
                      <div className="flex items-center gap-2 mt-1">
                        {[7, 14, 30].map((days) => (
                          <Button
                            key={days}
                            size="md"
                            variant="outline"
                            disabled={updateTenant.isPending}
                            onClick={() => updateTenant.mutate({ trial_days: days, status: 'trial' })}
                          >
                            +{days} Days
                          </Button>
                        ))}
                      </div>
                      <span className="text-xs text-muted">
                        Extends evaluation period without charging card.
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
