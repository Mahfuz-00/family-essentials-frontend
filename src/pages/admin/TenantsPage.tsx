import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  const kpis = [
    {
      label: 'Total Tenants',
      value: String(metrics.data?.total_tenants ?? meta?.total ?? 0),
      icon: 'apartment',
      tone: 'bg-sage-soft text-primary',
    },
    {
      label: 'Active Families',
      value: String(byStatus.active ?? 0),
      icon: 'verified',
      tone: 'bg-forest-soft text-secondary',
    },
    {
      label: 'In Free Trial',
      value: String(byStatus.trial ?? 0),
      icon: 'hourglass_top',
      tone: 'bg-surface-container text-primary',
    },
    {
      label: 'Suspended',
      value: String(byStatus.suspended ?? 0),
      icon: 'pause_circle',
      tone: 'bg-coral-soft text-error',
    },
    {
      label: 'Active Members',
      value: String(metrics.data?.active_members ?? 0),
      icon: 'group',
      tone: 'bg-sage-soft text-secondary',
    },
  ];

  const toggle = (id: number) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Platform Admin', 'Tenant Workspaces']}
          title="Tenant Workspaces & Client Families"
          description="Provision, suspend and inspect every client household workspace. Each tenant is isolated at the database row level."
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        <section className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-5">
          {kpis.map((kpi) => (
            <Card key={kpi.label} className="flex flex-col gap-2 p-4">
              <span className="flex items-center justify-between">
                <span className="text-body-sm text-muted">{kpi.label}</span>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${kpi.tone}`}>
                  <Icon name={kpi.icon} className="text-[18px]" />
                </span>
              </span>
              <span className="text-headline-md font-bold text-on-surface">{kpi.value}</span>
            </Card>
          ))}
        </section>

        {/* Toolbar */}
        <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md">
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
                className="h-10 pl-9"
              />
            </div>

            <div
              className="flex flex-wrap items-center gap-1 rounded-xl bg-canvas p-1"
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
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-label-md capitalize transition-all ${
                    status === option
                      ? 'bg-surface font-bold text-secondary shadow-sm'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  {option === 'all' ? 'All statuses' : option}
                </button>
              ))}
            </div>

            <Select
              value={tier}
              onChange={(event) => {
                setTier(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by tier"
              className="h-10 w-auto min-w-[170px] text-label-md"
            >
              <option value="all">All tiers</option>
              {plans.map((plan) => (
                <option key={plan.key} value={plan.key}>
                  {plan.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selected.length > 0 && (
              <>
                <Badge tone="primary">{selected.length} selected</Badge>
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => bulk.mutate('suspend')}
                >
                  Bulk suspend
                </Button>
                <Button variant="outline" disabled={busy} onClick={() => bulk.mutate('activate')}>
                  Bulk activate
                </Button>
              </>
            )}
            <Button variant="outline" onClick={exportCsv} disabled={exporting}>
              <Icon name="download" className="text-[16px]" />
              {exporting ? 'Preparing…' : 'Export CSV'}
            </Button>
            <Button onClick={() => setProvisionOpen(true)}>
              <Icon name="add_circle" className="text-[18px]" />
              Provision New Tenant
            </Button>
          </div>
        </Card>

        {tenants.isLoading && <p className="text-body-md text-muted">Loading tenants…</p>}
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
                              <span
                                className={`text-label-lg text-on-surface ${suspended ? 'line-through' : ''}`}
                              >
                                {tenant.name}
                              </span>
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
                          <span className="flex flex-col gap-1.5">
                            <span className="text-body-sm text-on-surface-variant">
                              {used} of {plan.seatCap} members
                            </span>
                            <span className="block h-1.5 w-24 overflow-hidden rounded-full bg-canvas">
                              <span
                                className="block h-1.5 rounded-full bg-secondary"
                                style={{ width: `${Math.min(100, (used / plan.seatCap) * 100)}%` }}
                              />
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

        <Alert tone="info">
          Member seat caps come from the presentation plan catalogue, not from the server. The API returns
          the member count only.
        </Alert>
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
                    {plan.label} ({plan.price})
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
            Tier prices come from the presentation catalogue; no payment provider is connected.
          </p>
        </div>
      </Modal>
    </AppLayout>
  );
}
