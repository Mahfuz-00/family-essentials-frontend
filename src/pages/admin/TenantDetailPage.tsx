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

interface TenantDetailPageProps {
  tenantId?: string | number;
}

export function TenantDetailPage({ tenantId: propTenantId }: TenantDetailPageProps) {
  const queryClient = useQueryClient();
  const routeParams = useParams({ strict: false }) as { tenantId?: string };
  const rawId = propTenantId ?? routeParams.tenantId;
  const tenantId = rawId ? String(rawId) : '';

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

        {notice && (
          <Alert tone="success">
            {notice}
          </Alert>
        )}
        {error && (
          <Alert tone="error">
            {error}
          </Alert>
        )}

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
                </div>
              }
            />

            {/* Quick Overview & Admin Controls */}
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

              {/* Action Toolbar for Landlord / Admin */}
              <div className="flex flex-wrap items-center gap-4 border-t border-surface-container pt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="change-tier" className="text-label-sm font-bold text-muted">
                    Change Tier:
                  </Label>
                  <select
                    id="change-tier"
                    value={tenant.subscription_tier}
                    disabled={updateTenant.isPending}
                    onChange={(e) => updateTenant.mutate({ subscription_tier: e.target.value })}
                    className="h-9 rounded-lg bg-canvas px-3 text-label-sm font-medium text-on-surface shadow-inner"
                  >
                    {plans.map((p) => (
                      <option key={p.key} value={p.key}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-label-sm font-bold text-muted">Extend Trial:</span>
                  {[7, 14, 30].map((days) => (
                    <Button
                      key={days}
                      size="sm"
                      variant="outline"
                      disabled={updateTenant.isPending}
                      onClick={() => updateTenant.mutate({ trial_days: days, status: 'trial' })}
                    >
                      +{days}d
                    </Button>
                  ))}
                </div>

                <div className="ml-auto flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ['platform', 'tenants', tenantId] });
                    }}
                  >
                    <Icon name="refresh" className="text-[16px]" />
                    Refresh
                  </Button>
                </div>
              </div>
            </Card>

            {/* Resource Counts & Telemetry */}
            <div>
              <h3 className="mb-3 text-label-md font-bold uppercase tracking-wider text-muted">
                Resource Allocations &amp; Live Telemetry
              </h3>
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
                  <span className="text-body-xs text-muted">
                    Active grocery items
                  </span>
                </Card>
              </div>
            </div>

            {/* Quotas & Capacity Breakdown */}
            {data.quotas && (
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-label-lg font-bold text-on-surface">
                    Subscription Quota &amp; Capacity Limits
                  </h4>
                  <Badge tone="primary">{data.quotas.plan?.label ?? 'Plan Quotas'}</Badge>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-canvas p-3">
                    <div className="flex items-center justify-between text-label-sm text-muted">
                      <span>Seats Allocated</span>
                      <span>
                        {data.quotas.usage?.members ?? data.counts.members_count} / {data.quotas.plan?.seat_cap ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-border-light">
                      <div
                        className="h-full bg-secondary"
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

                  <div className="rounded-xl bg-canvas p-3">
                    <div className="flex items-center justify-between text-label-sm text-muted">
                      <span>Places Tracked</span>
                      <span>
                        {data.quotas.usage?.places ?? data.counts.places_count} / {data.quotas.plan?.place_cap ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full bg-primary"
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

                  <div className="rounded-xl bg-canvas p-3">
                    <div className="flex items-center justify-between text-label-sm text-muted">
                      <span>Requests This Month</span>
                      <span>
                        {data.quotas.usage?.requests_this_month ?? data.counts.requests_count} /{' '}
                        {data.quotas.plan?.monthly_requests ?? '—'}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-border-light">
                      <div
                        className="h-full bg-tertiary"
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

            {/* Member Roster Table */}
            <div>
              <div className="mb-3 flex items-center justify-between">
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
          </>
        )}
      </div>
    </AppLayout>
  );
}
