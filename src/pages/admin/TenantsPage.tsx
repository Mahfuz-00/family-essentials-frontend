import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonTable } from '@/components/ui/skeleton';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { plans, planFor } from '@/lib/plans';
import type { Paginated, PlatformMetrics, Tenant, TenantStatus } from '@/types';

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

export function TenantsPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'all' | TenantStatus>('all');
  const [tier, setTier] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selected, setSelected] = useState<number[]>([]);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    subscription_tier: 'pilot',
    status: 'trial' as TenantStatus,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters = {
    ...(search.trim() !== '' ? { search: search.trim() } : {}),
    ...(status !== 'all' ? { status } : {}),
    ...(tier !== 'all' ? { tier } : {}),
  };

  const tenants = useQuery({
    queryKey: ['platform', 'tenants', filters, page, perPage],
    queryFn: async () =>
      (await api.get<Paginated<Tenant>>('/v1/platform/tenants', {
        params: { ...filters, page, per_page: perPage },
      })).data,
  });

  const metrics = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: async () => (await api.get<PlatformMetrics>('/v1/platform/metrics')).data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform'] });
    setSelected([]);
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const provision = useMutation({
    mutationFn: async () => api.post('/v1/platform/tenants', form),
    onSuccess: async () => {
      setForm({ name: '', subscription_tier: 'pilot', status: 'trial' });
      setProvisionOpen(false);
      setError(null);
      setNotice('Tenant provisioned.');
      await refresh();
    },
    onError,
  });

  const setStatusOf = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: 'suspend' | 'activate' }) =>
      api.post(`/v1/platform/tenants/${id}/${action}`),
    onSuccess: async (_data, variables) => {
      setError(null);
      setNotice(variables.action === 'suspend' ? 'Tenant suspended.' : 'Tenant reactivated.');
      await refresh();
    },
    onError,
  });

  const bulk = useMutation({
    mutationFn: async (action: 'suspend' | 'activate') =>
      (await api.post<{ affected: number }>(`/v1/platform/tenants/bulk/${action}`, { ids: selected }))
        .data,
    onSuccess: async (data, action) => {
      setError(null);
      setNotice(
        `${data.affected} tenant${data.affected === 1 ? '' : 's'} ${
          action === 'suspend' ? 'suspended' : 'reactivated'
        }.`,
      );
      await refresh();
    },
    onError,
  });

  const exportCsv = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await api.get('/v1/platform/tenants/export', {
        params: filters,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'tenants.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setExporting(false);
    }
  };

  const busy = provision.isPending || setStatusOf.isPending || bulk.isPending;

  const list = tenants.data?.data ?? [];
  const meta = tenants.data?.meta;
  const allSelected = list.length > 0 && list.every((tenant) => selected.includes(tenant.id));

  const byStatus = metrics.data?.by_status ?? {};

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Tenants"
          titleSize="headline"
          description="Provision, suspend and inspect every client household workspace. Each tenant is isolated at the database row level."
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {metrics.isLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <StatGrid count={4}>
            <StatCard
              title="Total Tenants"
              value={metrics.data?.total_tenants ?? meta?.total ?? 0}
              subtitle="Provisioned household workspaces"
              icon="apartment"
              tone="forest"
              highlight={
                <StatHighlight
                  tone="forest"
                  icon="dns"
                  label="Row-level isolated"
                />
              }
            />
            <StatCard
              title="Active Families"
              value={byStatus.active ?? 0}
              subtitle="Live active subscriptions"
              icon="verified"
              tone="sage"
              highlight={
                <StatHighlight
                  tone="sage"
                  icon="check_circle"
                  label={`${byStatus.trial ?? 0} in free trial`}
                />
              }
            />
            <StatCard
              title="Active Members"
              value={metrics.data?.active_members ?? 0}
              subtitle="Total household seats in use"
              icon="group"
              tone="forest"
              highlight={
                <StatHighlight
                  tone="forest"
                  icon="people"
                  label="Across all workspaces"
                />
              }
            />
            <StatCard
              title="Suspended"
              value={byStatus.suspended ?? 0}
              subtitle="Workspaces paused by admin"
              icon="pause_circle"
              tone={byStatus.suspended ? 'coral' : 'amber'}
              highlight={
                <StatHighlight
                  tone={byStatus.suspended ? 'coral' : 'amber'}
                  icon="shield"
                  label={byStatus.suspended ? 'Requires review' : '0 suspended'}
                />
              }
            />
          </StatGrid>
        )}

        {/* Single-Line Unified Toolbar */}
        <Card className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5 lg:flex-nowrap">
            <div className="relative min-w-[180px] flex-1 max-w-xs">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
              />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Filter by household name…"
                aria-label="Filter tenants"
                className="h-10 pl-9 text-sm"
              />
            </div>

            <div
              className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-canvas p-1 shadow-[var(--shadow-inset)] whitespace-nowrap"
              role="group"
              aria-label="Filter by status"
            >
              {(['all', 'active', 'trial', 'suspended'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setStatus(option);
                    setPage(1);
                  }}
                  aria-pressed={status === option}
                  className={`inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg px-2.5 text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                    status === option
                      ? 'bg-surface font-bold text-secondary shadow-xs'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  {option === 'all' ? 'All statuses' : option}
                </button>
              ))}
            </div>

            <div className="w-36 shrink-0">
              <Select
                value={tier}
                onChange={(event) => {
                  setTier(event.target.value);
                  setPage(1);
                }}
                aria-label="Filter by tier"
                className="h-10 w-full text-xs font-semibold"
              >
                <option value="all">All tiers</option>
                {plans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
            {selected.length > 0 && (
              <>
                <Badge tone="primary">{selected.length} selected</Badge>
                <Button
                  variant="outline"
                  className="h-10 shrink-0 whitespace-nowrap"
                  disabled={busy}
                  onClick={() => bulk.mutate('suspend')}
                >
                  Bulk suspend
                </Button>
                <Button
                  variant="outline"
                  className="h-10 shrink-0 whitespace-nowrap"
                  disabled={busy}
                  onClick={() => bulk.mutate('activate')}
                >
                  Bulk activate
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="h-10 shrink-0 whitespace-nowrap"
              onClick={exportCsv}
              disabled={exporting}
            >
              <Icon name="download" className="text-[16px]" />
              <span>{exporting ? 'Preparing…' : 'Export CSV'}</span>
            </Button>
            <Button
              className="h-10 shrink-0 whitespace-nowrap"
              onClick={() => setProvisionOpen(true)}
            >
              <Icon name="add_circle" className="text-[18px]" />
              <span>Provision New Tenant</span>
            </Button>
          </div>
        </Card>

        {tenants.isLoading && <SkeletonTable rows={6} columns={7} />}
        {tenants.isError && <Alert>{apiError(tenants.error)}</Alert>}

        {tenants.isSuccess && list.length === 0 && (
          <EmptyState
            title="No tenants match"
            description="Adjust the filter or search, or provision a new household workspace."
            action={<Button size="lg" onClick={() => setProvisionOpen(true)}>Provision New Tenant</Button>}
          />
        )}

        {list.length > 0 && (
          <>
            <Card className="overflow-hidden p-0">
              <Table className="min-w-[980px]">
                <THead>
                  <TH className="w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all tenants on this page"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? [] : list.map((tenant) => tenant.id))
                      }
                      className="h-4 w-4 cursor-pointer accent-secondary"
                    />
                  </TH>
                  <TH>Household / workspace</TH>
                  <TH>Tier</TH>
                  <TH>Member usage</TH>
                  <TH>Provisioned</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </THead>
                <tbody>
                  {list.map((tenant) => {
                    const plan = planFor(tenant.subscription_tier);
                    const used = tenant.member_count ?? 0;
                    const suspended = tenant.status === 'suspended';

                    return (
                      <TR key={tenant.id} className={suspended ? 'bg-canvas/30' : ''}>
                        <TD>
                          <input
                            type="checkbox"
                            aria-label={`Select ${tenant.name}`}
                            checked={selected.includes(tenant.id)}
                            onChange={() => toggle(tenant.id)}
                            className="h-4 w-4 cursor-pointer accent-secondary"
                          />
                        </TD>
                        <TD>
                          <span className="flex items-center gap-3">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-label-sm font-bold ${
                                suspended
                                  ? 'bg-surface-container-low text-muted'
                                  : 'bg-forest-soft text-secondary'
                              }`}
                            >
                              {initials(tenant.name)}
                            </span>
                            <span className="flex flex-col">
                              <Link
                                to="/admin/tenants/$tenantId"
                                params={{ tenantId: String(tenant.id) }}
                                className={`text-label-lg font-semibold text-on-surface hover:text-secondary hover:underline ${suspended ? 'line-through' : ''}`}
                              >
                                {tenant.name}
                              </Link>
                              <span className="font-mono text-body-sm text-muted">
                                #{tenant.id} · {tenant.slug}
                              </span>
                            </span>
                          </span>
                        </TD>

                        <TD>
                          <span className="flex flex-col">
                            <span className="text-body-md text-on-surface">{plan.label}</span>
                            <span className="font-mono text-body-sm text-muted">
                              tier: {tenant.subscription_tier}
                            </span>
                          </span>
                        </TD>

                        <TD>
                          <span className="flex flex-col">
                            <span className="text-body-md text-on-surface">{used}</span>
                            <span className="text-body-sm text-muted">
                              {used === 1 ? 'member' : 'members'}
                            </span>
                          </span>
                        </TD>

                        <TD>
                          <span className="flex flex-col">
                            <span className="text-body-sm text-on-surface">
                              {new Date(tenant.created_at).toLocaleDateString()}
                            </span>
                            <span className="text-body-sm text-muted">
                              {relativeDate(tenant.created_at)}
                            </span>
                          </span>
                        </TD>

                        <TD>
                          <Badge
                            tone={suspended ? 'danger' : tenant.status === 'active' ? 'success' : 'warning'}
                          >
                            {tenant.status}
                          </Badge>
                        </TD>

                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to="/admin/tenants/$tenantId"
                              params={{ tenantId: String(tenant.id) }}
                            >
                              <Button
                                variant="outline"
                                size="sm"
                              >
                                <Icon name="visibility" className="text-[16px]" />
                                Details
                              </Button>
                            </Link>
                            {suspended ? (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => setStatusOf.mutate({ id: tenant.id, action: 'activate' })}
                              >
                                Reactivate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={busy}
                                onClick={() => setStatusOf.mutate({ id: tenant.id, action: 'suspend' })}
                              >
                                Suspend
                              </Button>
                            )}
                          </div>
                        </TD>
                      </TR>
                    );
                  })}
                </tbody>
              </Table>
            </Card>

            {meta && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-body-sm text-muted">
                  Showing {(meta.current_page - 1) * meta.per_page + 1} to{' '}
                  {Math.min(meta.current_page * meta.per_page, meta.total)} of {meta.total} tenant
                  workspaces
                </span>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-body-sm text-muted">
                    Rows
                    <select
                      value={perPage}
                      onChange={(event) => {
                        setPerPage(Number(event.target.value));
                        setPage(1);
                      }}
                      className="h-9 cursor-pointer rounded-lg bg-canvas px-2 text-label-md text-on-surface shadow-inner"
                    >
                      {[10, 20, 50, 100].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>

                  <Button
                    variant="outline"
                    disabled={meta.current_page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-body-sm text-muted">
                    {meta.current_page} / {meta.last_page}
                  </span>
                  <Button
                    variant="outline"
                    disabled={meta.current_page >= meta.last_page}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <Modal
        open={provisionOpen}
        onClose={() => setProvisionOpen(false)}
        title="Provision New Tenant"
        description="Creates an isolated household workspace with its own database row-level security boundary."
        footer={
          <>
            <Button variant="ghost" onClick={() => setProvisionOpen(false)}>
              Cancel
            </Button>
            <Button size="lg" disabled={busy || form.name.trim() === ''} onClick={() => provision.mutate()}>
              {provision.isPending ? 'Provisioning…' : 'Provision tenant'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="tenant-name">Workspace name</Label>
            <Input
              id="tenant-name"
              autoFocus
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="The Rahman Household"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tenant-tier">Subscription tier</Label>
              <Select
                id="tenant-tier"
                value={form.subscription_tier}
                onChange={(event) => setForm({ ...form, subscription_tier: event.target.value })}
              >
                {plans.map((plan) => (
                  <option key={plan.key} value={plan.key}>
                    {plan.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="tenant-status">Initial status</Label>
              <Select
                id="tenant-status"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as TenantStatus })}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
              </Select>
            </div>
          </div>

          <p className="text-body-sm text-muted">
            The tier key is what the API validates; this build has no payment provider, so no price is
            attached to a provision.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}
