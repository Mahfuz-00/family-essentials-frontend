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
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import type { Incident, IncidentSeverity, IncidentStatus, OpsHealth, OpsStatus } from '@/types';

const statusTone: Record<OpsStatus, 'success' | 'warning' | 'danger'> = {
  ok: 'success',
  warn: 'warning',
  fail: 'danger',
};

const statusLabel: Record<OpsStatus, string> = {
  ok: 'Healthy',
  warn: 'Degraded',
  fail: 'Failing',
};

const statusBar: Record<OpsStatus, string> = {
  ok: 'bg-success',
  warn: 'bg-warning',
  fail: 'bg-error',
};

/**
 * The operations console: measured system health, queue failures, and the
 * incident log. Every number here comes from a check that actually ran — a check
 * that cannot run reports as a failure rather than a green light.
 */
export function HealthPage() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    title: '',
    severity: 'minor' as IncidentSeverity,
    body: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const health = useQuery({
    queryKey: ['platform', 'health'],
    queryFn: async () => (await api.get<OpsHealth>('/v1/platform/health')).data,
    refetchInterval: 30_000,
  });

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform'] });
  };

  const retry = useMutation({
    mutationFn: async (id: number) => api.post(`/v1/platform/health/failed-jobs/${id}/retry`),
    onSuccess: async () => {
      setError(null);
      setNotice('Job requeued. It will run on the next queue pass.');
      await refresh();
    },
    onError,
  });

  const openIncident = useMutation({
    mutationFn: async () => api.post('/v1/platform/incidents', draft),
    onSuccess: async () => {
      setDraft({ title: '', severity: 'minor', body: '' });
      setError(null);
      setNotice('Incident opened. It is listed below and written to the audit ledger.');
      await refresh();
    },
    onError,
  });

  const setIncidentStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: IncidentStatus }) =>
      api.patch(`/v1/platform/incidents/${id}`, { status }),
    onSuccess: async () => {
      setError(null);
      setNotice('Incident updated.');
      await refresh();
    },
    onError,
  });

  const data = health.data;
  const report = data?.report;
  const open = (data?.incidents ?? []).filter((incident) => incident.status !== 'resolved');
  const resolved = (data?.incidents ?? []).filter((incident) => incident.status === 'resolved');

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <Icon name="monitor_heart" className="text-[16px]" />
              Platform Admin · Operations
            </>
          }
          title="System health"
          description="Measured checks, queue failures and the operator incident log."
          actions={
            <Button variant="outline" size="lg" onClick={refresh}>
              <Icon name="refresh" className="text-[16px]" />
              Re-check now
            </Button>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {health.isError && <Alert>{apiError(health.error)}</Alert>}

        {/* Overall */}
        {health.isLoading ? (
          <SkeletonCard />
        ) : (
          report && (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      report.status === 'ok'
                        ? 'bg-forest-soft text-secondary'
                        : report.status === 'warn'
                          ? 'bg-sage-soft text-primary'
                          : 'bg-coral-soft text-error'
                    }`}
                  >
                    <Icon
                      name={report.status === 'ok' ? 'check_circle' : 'error'}
                      filled
                      className="text-[28px]"
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <h2 className="text-headline-md text-on-surface">{statusLabel[report.status]}</h2>
                      <Badge tone={statusTone[report.status]}>{report.status}</Badge>
                    </span>
                    <span className="text-body-sm text-muted">
                      Checked {new Date(report.checked_at).toLocaleString()}
                    </span>
                    <span className="text-body-sm text-muted">
                      {data?.history.uptime_percent === null
                        ? 'Uptime needs samples — none recorded yet'
                        : `${data?.history.uptime_percent}% of samples healthy in the last 24h`}
                    </span>
                  </div>
                </div>

                {/* Uptime strip: one bar per sample, coloured by status. */}
                <div className="flex min-w-[220px] flex-1 flex-col gap-2">
                  <span className="text-label-sm uppercase tracking-wider text-muted">
                    Last 24 hours
                  </span>
                  <div className="flex h-8 items-end gap-[2px]" role="img" aria-label="Health samples over the last 24 hours">
                    {(data?.history.samples ?? []).map((sample, index) => (
                      <span
                        key={`${sample.checked_at}-${index}`}
                        title={`${sample.status} · ${new Date(sample.checked_at).toLocaleTimeString()}`}
                        className={`h-full flex-1 rounded-sm ${statusBar[sample.status]}`}
                      />
                    ))}
                    {(data?.history.samples ?? []).length === 0 && (
                      <span className="text-body-sm text-muted">No samples yet</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )
        )}

        {/* Checks */}
        <section
          aria-label="Health checks"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {(report?.checks ?? []).map((check) => (
            <Card key={check.key} className="flex flex-col gap-2 p-4">
              <span className="flex items-center justify-between gap-2">
                <span className="text-label-md font-bold text-on-surface">{check.label}</span>
                <Badge tone={statusTone[check.status]}>{check.status}</Badge>
              </span>
              {check.value !== undefined && (
                <span className="text-headline-md font-bold text-on-surface">
                  {check.value}
                  {check.unit && <span className="text-body-sm font-normal text-muted"> {check.unit}</span>}
                </span>
              )}
              <span className="text-body-sm text-muted">{check.message}</span>
            </Card>
          ))}
        </section>

        {/* Runtime detail */}
        {report?.checks.find((check) => check.key === 'runtime')?.details && (
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Runtime</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(report.checks.find((check) => check.key === 'runtime')?.details ?? {}).map(
                ([key, value]) => (
                  <li
                    key={key}
                    className="flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-body-sm"
                  >
                    <span className="text-muted">{key}</span>
                    <span className="font-mono text-on-surface">{String(value ?? '—')}</span>
                  </li>
                ),
              )}
            </ul>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {/* Failed jobs */}
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Failed jobs</h2>
            <p className="text-body-sm text-muted">
              Requeuing runs the job again; it is audited like any other operator action.
            </p>

            {(data?.failed_jobs ?? []).length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="Nothing has failed"
                  description="Background work is clearing. Failures appear here with the reason and a requeue action."
                  icon={<Icon name="task_alt" className="text-[24px]" />}
                />
              </div>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {(data?.failed_jobs ?? []).map((job) => (
                  <li key={job.id} className="flex flex-col gap-2 rounded-xl bg-canvas p-4">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <Badge tone="danger">{job.queue}</Badge>
                      <span className="text-body-sm text-muted">
                        {new Date(job.failed_at).toLocaleString()}
                      </span>
                    </span>
                    <span className="font-mono text-body-sm text-on-surface-variant">{job.reason}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={retry.isPending}
                      onClick={() => retry.mutate(job.id)}
                      className="self-start"
                    >
                      <Icon name="replay" className="text-[16px]" />
                      Requeue
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Incidents */}
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Incidents</h2>
            <p className="text-body-sm text-muted">
              Written by an operator, not detected automatically — this log records what a human
              observed.
            </p>

            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-canvas p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[2fr_1fr]">
                <div>
                  <Label htmlFor="incident-title">What happened?</Label>
                  <Input
                    id="incident-title"
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    placeholder="Queue worker restarted"
                  />
                </div>
                <div>
                  <Label htmlFor="incident-severity">Severity</Label>
                  <Select
                    id="incident-severity"
                    value={draft.severity}
                    onChange={(event) =>
                      setDraft({ ...draft, severity: event.target.value as IncidentSeverity })
                    }
                  >
                    <option value="minor">Minor</option>
                    <option value="major">Major</option>
                    <option value="critical">Critical</option>
                  </Select>
                </div>
              </div>
              <Button
                disabled={openIncident.isPending || draft.title.trim() === ''}
                onClick={() => openIncident.mutate()}
                className="self-start"
              >
                {openIncident.isPending ? 'Opening…' : 'Open incident'}
              </Button>
            </div>

            {open.length === 0 && resolved.length === 0 && (
              <p className="mt-4 rounded-xl bg-canvas px-4 py-6 text-center text-body-sm text-muted">
                No incidents recorded. That is good news, and it means nobody has logged one.
              </p>
            )}

            <ul className="mt-4 flex flex-col gap-2">
              {[...open, ...resolved].map((incident: Incident) => (
                <li key={incident.id} className="flex flex-col gap-2 rounded-xl bg-canvas p-4">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <Badge
                        tone={
                          incident.severity === 'critical'
                            ? 'danger'
                            : incident.severity === 'major'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {incident.severity}
                      </Badge>
                      <span className="text-label-lg text-on-surface">{incident.title}</span>
                    </span>
                    <Badge tone={incident.status === 'resolved' ? 'success' : 'warning'}>
                      {incident.status}
                    </Badge>
                  </span>
                  <span className="text-body-sm text-muted">
                    {new Date(incident.started_at).toLocaleString()}
                    {incident.author?.name ? ` · ${incident.author.name}` : ''}
                    {incident.duration_minutes !== null ? ` · ${incident.duration_minutes} min` : ''}
                  </span>
                  {incident.body && (
                    <span className="text-body-sm text-on-surface-variant">{incident.body}</span>
                  )}

                  <span className="flex flex-wrap gap-2">
                    {incident.status === 'resolved' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={setIncidentStatus.isPending}
                        onClick={() => setIncidentStatus.mutate({ id: incident.id, status: 'monitoring' })}
                      >
                        Reopen
                      </Button>
                    ) : (
                      <>
                        {incident.status !== 'monitoring' && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={setIncidentStatus.isPending}
                            onClick={() =>
                              setIncidentStatus.mutate({ id: incident.id, status: 'monitoring' })
                            }
                          >
                            Monitoring
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="soft"
                          disabled={setIncidentStatus.isPending}
                          onClick={() => setIncidentStatus.mutate({ id: incident.id, status: 'resolved' })}
                        >
                          Resolve
                        </Button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
