import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { BackupReadiness, BackupRecord, BackupStatus, BackupsPayload } from '@/types';

const statusTone: Record<BackupStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  completed: 'success',
  failed: 'danger',
  skipped: 'warning',
  running: 'neutral',
};

function humanSize(bytes: number | null): string {
  if (bytes === null) {
    return '—';
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * Backups and disaster recovery.
 *
 * The panel leads with what is actually possible here: which dump tool answered,
 * which connection the dump would be taken as, and how old the newest backup is
 * against the recovery objectives. A green light has to be earned.
 */
export function BackupsPage() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const backups = useQuery({
    queryKey: ['platform', 'backups'],
    queryFn: async () => (await api.get<BackupsPayload>('/v1/platform/backups')).data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['platform'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const run = useMutation({
    mutationFn: async () => (await api.post<{ data: BackupRecord }>('/v1/platform/backups')).data.data,
    onSuccess: async (backup) => {
      setError(null);
      setNotice(
        backup.status === 'completed'
          ? `Backup written and verified (${humanSize(backup.size_bytes)}).`
          : `No backup was taken: ${backup.error ?? backup.status}.`,
      );
      await refresh();
    },
    onError,
  });

  const verify = useMutation({
    mutationFn: async (id: number) => api.post(`/v1/platform/backups/${id}/verify`),
    onSuccess: async () => {
      setError(null);
      setNotice('Re-checksummed against what was recorded when the dump was written.');
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/platform/backups/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Backup deleted, file and registry entry both.');
      await refresh();
    },
    onError,
  });

  const readiness: BackupReadiness | undefined = backups.data?.readiness;
  const list = backups.data?.backups ?? [];
  const runbook = backups.data?.runbook;

  const rpoState = (() => {
    if (!readiness) {
      return null;
    }

    if (readiness.latest_backup === null || readiness.latest_backup.age_hours === null) {
      return { tone: 'danger' as const, label: 'No backup yet' };
    }

    if (readiness.latest_backup.age_hours > readiness.rpo_hours) {
      return {
        tone: 'danger' as const,
        label: `${readiness.latest_backup.age_hours} h old — past the ${readiness.rpo_hours} h objective`,
      };
    }

    return {
      tone: 'success' as const,
      label: `${readiness.latest_backup.age_hours} h old — within the ${readiness.rpo_hours} h objective`,
    };
  })();

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <Icon name="cloud_sync" className="text-[16px]" />
              Platform Admin · Operations
            </>
          }
          title="Backups & disaster recovery"
          description="What has been dumped, whether it can still be restored, and how to bring the platform back."
          actions={
            <Button size="lg" disabled={run.isPending} onClick={() => run.mutate()}>
              <Icon name="cloud_upload" className="text-[18px]" />
              {run.isPending ? 'Dumping…' : 'Take a backup now'}
            </Button>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {backups.isError && <Alert>{apiError(backups.error)}</Alert>}

        {/* Readiness */}
        {backups.isLoading ? (
          <SkeletonCard />
        ) : (
          readiness && (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
                      readiness.ready ? 'bg-forest-soft text-secondary' : 'bg-coral-soft text-error'
                    }`}
                  >
                    <Icon
                      name={readiness.ready ? 'verified' : 'report'}
                      filled
                      className="text-[28px]"
                    />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h2 className="text-headline-md text-on-surface">
                      {readiness.ready ? 'Recoverable' : 'Not recoverable yet'}
                    </h2>
                    <span className="text-body-sm text-muted">
                      Dump tool <span className="font-mono">{readiness.driver}</span> · connection{' '}
                      <span className="font-mono">{readiness.connection}</span> ·{' '}
                      {readiness.completed_count} completed backup
                      {readiness.completed_count === 1 ? '' : 's'}
                    </span>
                    {rpoState && <Badge tone={rpoState.tone}>{rpoState.label}</Badge>}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-body-sm">
                  <dt className="text-muted">RPO</dt>
                  <dd className="text-on-surface">{readiness.rpo_hours} h</dd>
                  <dt className="text-muted">RTO target</dt>
                  <dd className="text-on-surface">{readiness.rto_minutes} min</dd>
                  <dt className="text-muted">Retention</dt>
                  <dd className="text-on-surface">{readiness.retention_days} days</dd>
                  <dt className="text-muted">Destination</dt>
                  <dd className="font-mono text-on-surface">
                    {readiness.disk}:{readiness.directory}
                  </dd>
                </dl>
              </div>

              {!readiness.ready && (
                <ul className="mt-4 flex flex-col gap-2">
                  {readiness.gaps.map((gap) => (
                    <li
                      key={gap}
                      className="flex items-start gap-2 rounded-xl bg-coral-soft/60 px-4 py-3 text-body-sm text-on-surface"
                    >
                      <Icon name="error" className="mt-0.5 text-[16px] text-error" />
                      {gap}
                    </li>
                  ))}
                </ul>
              )}

              {readiness.requirement && !readiness.dumper_available && (
                <p className="mt-3 rounded-xl bg-canvas px-4 py-3 text-body-sm text-muted">
                  {readiness.requirement}
                </p>
              )}
            </Card>
          )
        )}

        {/* History */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <h2 className="text-headline-sm text-on-surface">Backup registry</h2>
              <p className="text-body-sm text-muted">
                A dump is only listed as restorable once its checksum has been verified against the
                file on disk.
              </p>
            </div>
            <Badge tone="neutral">{list.length} entries</Badge>
          </div>

          {list.length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                title="No backups recorded"
                description="Nothing has been dumped yet. Take one manually, or let the nightly schedule run."
                icon={<Icon name="cloud_off" className="text-[24px]" />}
              />
            </div>
          ) : (
            <Table className="min-w-[900px]">
              <THead>
                <TH>Started</TH>
                <TH>File</TH>
                <TH>Type</TH>
                <TH>Status</TH>
                <TH className="text-right">Size</TH>
                <TH>Restorable</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <tbody>
                {list.map((backup) => (
                  <TR key={backup.id}>
                    <TD className="whitespace-nowrap text-body-sm text-muted">
                      {backup.started_at ? new Date(backup.started_at).toLocaleString() : '—'}
                    </TD>
                    <TD className="font-mono text-body-sm text-on-surface">{backup.filename}</TD>
                    <TD className="text-body-sm text-muted">{backup.type}</TD>
                    <TD>
                      <Badge tone={statusTone[backup.status]}>{backup.status}</Badge>
                      {backup.error && (
                        <span className="mt-1 block max-w-[280px] text-body-sm text-error">
                          {backup.error}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right text-body-sm text-on-surface">
                      {humanSize(backup.size_bytes)}
                    </TD>
                    <TD>
                      {backup.restorable ? (
                        <Badge tone="success">verified</Badge>
                      ) : backup.has_drifted ? (
                        <Badge tone="danger">drifted</Badge>
                      ) : backup.status === 'completed' ? (
                        <Badge tone="warning">unverified</Badge>
                      ) : (
                        <span className="text-body-sm text-muted">—</span>
                      )}
                    </TD>
                    <TD>
                      <span className="flex items-center justify-end gap-1.5">
                        {backup.status === 'completed' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={verify.isPending}
                              onClick={() => verify.mutate(backup.id)}
                            >
                              Verify
                            </Button>
                            <a
                              href={`/api/v1/platform/backups/${backup.id}/download`}
                              className="text-body-md font-semibold text-secondary hover:underline"
                            >
                              Download
                            </a>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-coral-soft"
                          disabled={remove.isPending || backup.status === 'running'}
                          onClick={() => remove.mutate(backup.id)}
                        >
                          Delete
                        </Button>
                      </span>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Runbook */}
        {runbook && (
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Restore procedure</h2>
            <p className="text-body-sm text-muted">
              Generated from the live configuration, so the commands name the right database and file.
              Target: back inside the {runbook.rto_minutes} minute objective.
            </p>

            <ol className="mt-4 flex flex-col gap-3">
              {runbook.steps.map((step, index) => (
                <li key={step.label} className="flex flex-col gap-2 rounded-xl bg-canvas p-4">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-label-sm font-bold text-on-secondary">
                      {index + 1}
                    </span>
                    <span className="text-label-lg text-on-surface">{step.label}</span>
                  </span>
                  <code className="block overflow-x-auto rounded-lg bg-surface-container-low px-3 py-2 font-mono text-body-sm text-on-surface-variant">
                    {step.command}
                  </code>
                </li>
              ))}
            </ol>

            <p className="mt-4 flex items-start gap-2 rounded-xl bg-sage-soft/60 px-4 py-3 text-body-sm text-on-surface-variant">
              <Icon name="info" className="mt-0.5 text-[16px]" />
              {runbook.iaas}
            </p>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
