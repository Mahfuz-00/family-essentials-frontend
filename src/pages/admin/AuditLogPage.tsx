import { Fragment, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonTable } from '@/components/ui/skeleton';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { AuditLevel, Paginated, PlatformAuditEvent, PlatformMetrics } from '@/types';

const levels: { value: AuditLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'All severities' },
  { value: 'critical', label: 'Critical' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

const actions = [
  'auth.login',
  'auth.login_failed',
  'auth.logout',
  'auth.registered',
  'auth.platform_access_denied',
  'tenant.created',
  'tenant.updated',
  'tenant.suspended',
  'tenant.activated',
  'tenant.bulk_suspended',
  'member.role_changed',
  'member.removed',
  'invitation.created',
  'invitation.revoked',
  'voice_escalation.dispatched',
];

const ranges: { value: string; label: string; hours: number | null }[] = [
  { value: '1h', label: '1h', hours: 1 },
  { value: '24h', label: '24h', hours: 24 },
  { value: '7d', label: '7d', hours: 24 * 7 },
  { value: 'all', label: 'All time', hours: null },
];

const levelTone: Record<AuditLevel, 'danger' | 'warning' | 'neutral'> = {
  critical: 'danger',
  warning: 'warning',
  info: 'neutral',
};

export function AuditLogPage() {
  const [level, setLevel] = useState<AuditLevel | 'all'>('all');
  const [action, setAction] = useState('all');
  const [range, setRange] = useState('24h');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeRange = ranges.find((option) => option.value === range) ?? ranges[1];

  // Derived once per range, not on every render: a window computed from
  // Date.now() inside the render body changes the query key every time, which
  // makes the query refetch in a loop.
  const from = useMemo(
    () =>
      activeRange.hours === null
        ? undefined
        : new Date(Date.now() - activeRange.hours * 3_600_000).toISOString(),
    [activeRange.hours],
  );

  const params = useMemo(
    () => ({
      ...(level !== 'all' ? { level } : {}),
      ...(action !== 'all' ? { action } : {}),
      ...(search.trim() !== '' ? { q: search.trim() } : {}),
      ...(from ? { from } : {}),
      page,
    }),
    [level, action, search, from, page],
  );

  const events = useQuery({
    queryKey: ['platform', 'audit-logs', params],
    queryFn: async () =>
      (await api.get<Paginated<PlatformAuditEvent>>('/v1/platform/audit-logs', { params })).data,
    refetchInterval: live ? 5000 : false,
  });

  const metrics = useQuery({
    queryKey: ['platform', 'metrics'],
    queryFn: async () => (await api.get<PlatformMetrics>('/v1/platform/metrics')).data,
  });

  const exportCsv = async () => {
    setExporting(true);
    setError(null);

    try {
      const response = await api.get('/v1/platform/audit-logs/export', { params, responseType: 'blob' });
      const url = URL.createObjectURL(response.data as Blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'audit-log.csv';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setExporting(false);
    }
  };

  const audit = metrics.data?.audit;
  const rows = events.data?.data ?? [];
  const meta = events.data?.meta;

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Audit Logs"
          titleSize="headline"
          description="Every privileged and security-relevant action, written to an append-only platform ledger."
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={live ? 'primary' : 'outline'}
                onClick={() => setLive((current) => !current)}
                aria-pressed={live}
              >
                <Icon name={live ? 'pause' : 'play_arrow'} className="text-[16px]" />
                {live ? 'Live tail on (5s)' : 'Live tail off'}
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={exporting}>
                <Icon name="download" className="text-[16px]" />
                {exporting ? 'Preparing…' : 'Export CSV'}
              </Button>
            </div>
          }
        />

        {error && <Alert>{error}</Alert>}
        {events.isError && <Alert>{apiError(events.error)}</Alert>}

        {metrics.isLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <StatGrid count={4}>
            <StatCard
              title="Security Events (24h)"
              value={audit?.events_24h ?? 0}
              subtitle="Logged in the last 24 hours"
              icon="receipt_long"
              tone="forest"
              highlight={
                <StatHighlight
                  tone="forest"
                  icon="verified_user"
                  label="Append-only ledger"
                />
              }
            />
            <StatCard
              title="Critical (24h)"
              value={audit?.critical_24h ?? 0}
              subtitle="High-severity events"
              icon="report"
              tone={audit?.critical_24h ? 'coral' : 'sage'}
              highlight={
                <StatHighlight
                  tone={audit?.critical_24h ? 'coral' : 'sage'}
                  icon="security"
                  label={audit?.critical_24h ? 'Requires review' : 'Zero critical alerts'}
                />
              }
            />
            <StatCard
              title="Warnings (24h)"
              value={audit?.warning_24h ?? 0}
              subtitle="Auth & policy warnings"
              icon="warning"
              tone="amber"
              highlight={
                <StatHighlight
                  tone="amber"
                  icon="policy"
                  label="Monitored anomalies"
                />
              }
            />
            <StatCard
              title="Denied Platform Access"
              value={audit?.denied_platform_access_24h ?? 0}
              subtitle="Blocked unauthorized attempts"
              icon="gpp_bad"
              tone={audit?.denied_platform_access_24h ? 'coral' : 'forest'}
              highlight={
                <StatHighlight
                  tone={audit?.denied_platform_access_24h ? 'coral' : 'forest'}
                  icon="shield_lock"
                  label="Zero-trust guard active"
                />
              }
            />
          </StatGrid>
        )}

        {/* Filters */}
        <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
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
                placeholder="Search actor email, action, IP or trace ID…"
                aria-label="Search the audit ledger"
                className="h-10 pl-9"
              />
            </div>

            <div className="flex items-center gap-1 rounded-xl bg-canvas p-1" role="group" aria-label="Time range">
              {ranges.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRange(option.value);
                    setPage(1);
                  }}
                  aria-pressed={range === option.value}
                  className={`cursor-pointer rounded-lg px-3 py-1.5 text-label-md transition-all ${
                    range === option.value
                      ? 'bg-surface font-bold text-secondary shadow-sm'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <Select
              value={level}
              onChange={(event) => {
                setLevel(event.target.value as AuditLevel | 'all');
                setPage(1);
              }}
              aria-label="Filter by severity"
              className="h-10 w-auto min-w-[170px] text-label-md"
            >
              {levels.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              value={action}
              onChange={(event) => {
                setAction(event.target.value);
                setPage(1);
              }}
              aria-label="Filter by action"
              className="h-10 w-auto min-w-[210px] text-label-md"
            >
              <option value="all">All actions</option>
              {actions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        {events.isLoading && <SkeletonTable rows={8} columns={8} />}

        {events.isSuccess && rows.length === 0 && (
          <EmptyState
            title="No matching events"
            description="Nothing in the ledger matches these filters. Widen the time range or clear the search."
            icon={<Icon name="shield_search" className="text-[24px]" />}
          />
        )}

        {!events.isLoading && rows.length > 0 && (
          <Card className="overflow-hidden p-0">
            <Table className="min-w-[1000px]">
              <THead>
                <TH>Timestamp</TH>
                <TH>Level</TH>
                <TH>Action type</TH>
                <TH>Tenant</TH>
                <TH>Actor / origin</TH>
                <TH>Source IP</TH>
                <TH>Status</TH>
                <TH className="text-right">Inspect</TH>
              </THead>
              <tbody>
                {rows.map((event) => (
                  <Fragment key={event.id}>
                    <TR>
                      <TD className="whitespace-nowrap font-mono text-body-sm text-muted">
                        {new Date(event.occurred_at).toLocaleString()}
                      </TD>
                      <TD>
                        <Badge tone={levelTone[event.level]}>{event.level}</Badge>
                      </TD>
                      <TD className="font-mono text-body-sm text-on-surface">{event.action}</TD>
                      <TD className="text-body-sm text-muted">
                        {event.tenant_name ?? (event.tenant_id ? `#${event.tenant_id}` : '—')}
                      </TD>
                      <TD>
                        <span className="flex flex-col">
                          <span className="text-body-sm text-on-surface">{event.actor_email ?? '—'}</span>
                          <span className="text-body-sm text-muted">{event.actor_role ?? 'guest'}</span>
                        </span>
                      </TD>
                      <TD className="font-mono text-body-sm text-muted">{event.source_ip ?? '—'}</TD>
                      <TD>
                        {event.http_status ? (
                          <Badge tone={event.http_status >= 400 ? 'danger' : 'success'}>
                            {event.http_status}
                          </Badge>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={expanded === event.id}
                          onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                        >
                          {expanded === event.id ? 'Hide' : 'Payload'}
                        </Button>
                      </TD>
                    </TR>

                    {expanded === event.id && (
                      <TR>
                        <TD colSpan={8} className="bg-canvas">
                          <div className="flex flex-col gap-2">
                            <span className="flex flex-wrap items-center gap-3 text-body-sm text-muted">
                              <span className="font-mono">trace {event.trace_id}</span>
                              <button
                                type="button"
                                className="cursor-pointer font-semibold text-secondary hover:underline"
                                onClick={() => navigator.clipboard?.writeText(event.trace_id)}
                              >
                                Copy trace ID
                              </button>
                              {event.user_agent && <span className="truncate">{event.user_agent}</span>}
                            </span>
                            <pre className="max-h-64 overflow-auto rounded-xl bg-inverse-surface p-4 font-mono text-body-sm text-inverse-on-surface">
                              {JSON.stringify(event.payload ?? {}, null, 2)}
                            </pre>
                          </div>
                        </TD>
                      </TR>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </Table>
          </Card>
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-body-sm text-muted">
              Showing page {meta.current_page} of {meta.last_page} · {meta.total} events
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                disabled={meta.current_page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
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
      </div>
    </AppLayout>
  );
}
