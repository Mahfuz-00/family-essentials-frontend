import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import type {
  FeedbackPriority,
  FeedbackStatus,
  FeedbackType,
  PlatformFeedbackPayload,
  PlatformFeedbackReport,
} from '@/types';

const statusTone: Record<FeedbackStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  new: 'primary',
  triaged: 'neutral',
  in_progress: 'warning',
  resolved: 'success',
  wont_fix: 'neutral',
};

const priorityTone: Record<FeedbackPriority, 'danger' | 'warning' | 'neutral' | 'primary'> = {
  critical: 'danger',
  high: 'warning',
  normal: 'neutral',
  low: 'neutral',
};

const typeLabel: Record<FeedbackType, string> = {
  bug: 'Bug',
  feedback: 'Feedback',
  feature_request: 'Feature request',
};

/**
 * The feedback inbox: everything households have reported, in one queue.
 *
 * Triage is the whole point — a report that nobody can move through the states is
 * just a mailbox. Status changes are written to the security ledger.
 */
export function PlatformFeedbackPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ status: '', type: '', priority: '', open_only: true });
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const inbox = useQuery({
    queryKey: ['platform', 'feedback', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== false) {
          params.set(key, value === true ? '1' : String(value));
        }
      });

      const suffix = params.toString();

      return (await api.get<PlatformFeedbackPayload>(`/v1/platform/feedback${suffix ? `?${suffix}` : ''}`))
        .data;
    },
  });

  const triage = useMutation({
    mutationFn: async ({
      id,
      status,
      priority,
      resolutionNote,
    }: {
      id: number;
      status?: FeedbackStatus;
      priority?: FeedbackPriority;
      resolutionNote?: string;
    }) =>
      api.patch(`/v1/platform/feedback/${id}`, {
        status,
        priority,
        ...(resolutionNote === undefined ? {} : { resolution_note: resolutionNote }),
      }),
    onSuccess: async () => {
      setError(null);
      setNotice('Saved. The household sees the new status the next time it looks.');
      setNote('');
      await queryClient.invalidateQueries({ queryKey: ['platform', 'feedback'] });
    },
    onError: (caught) => {
      setError(apiError(caught));
      setNotice(null);
    },
  });

  const data = inbox.data;
  const list = data?.data ?? [];
  const active: PlatformFeedbackReport | undefined =
    list.find((report) => report.id === selected) ?? list[0];

  const tiles = [
    { label: 'Open', value: data?.summary.open ?? 0, icon: 'inbox', tone: 'bg-sage-soft text-primary' },
    {
      label: 'Critical open',
      value: data?.summary.critical_open ?? 0,
      icon: 'priority_high',
      tone: 'bg-coral-soft text-error',
    },
    { label: 'Unseen', value: data?.summary.unseen ?? 0, icon: 'fiber_new', tone: 'bg-forest-soft text-secondary' },
    { label: 'Ever received', value: data?.summary.total ?? 0, icon: 'forum', tone: 'bg-surface-container text-primary' },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <Icon name="forum" className="text-[16px]" />
              Platform Admin · Operations
            </>
          }
          title="Feedback inbox"
          description="What households are telling us, and what has been done about it."
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {inbox.isError && <Alert>{apiError(inbox.error)}</Alert>}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <Card key={tile.label} className="flex items-center justify-between p-4">
              <span className="flex flex-col">
                <span className="text-display-lg font-bold text-on-surface">{tile.value}</span>
                <span className="text-body-sm text-muted">{tile.label}</span>
              </span>
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tile.tone}`}>
                <Icon name={tile.icon} className="text-[20px]" />
              </span>
            </Card>
          ))}
        </section>

        {/* Filters */}
        <Card className="flex flex-wrap items-end gap-3 p-4">
          <label className="flex flex-col gap-1">
            <span className="text-label-sm uppercase tracking-wider text-muted">Filter status</span>
            <Select
              className="h-10 w-auto"
              value={filters.status}
              onChange={(event) => setFilters({ ...filters, status: event.target.value })}
            >
              <option value="">Any</option>
              <option value="new">Received</option>
              <option value="triaged">Triaged</option>
              <option value="in_progress">In progress</option>
              <option value="resolved">Resolved</option>
              <option value="wont_fix">Won&apos;t fix</option>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-sm uppercase tracking-wider text-muted">Filter type</span>
            <Select
              className="h-10 w-auto"
              value={filters.type}
              onChange={(event) => setFilters({ ...filters, type: event.target.value })}
            >
              <option value="">Any</option>
              {(Object.keys(typeLabel) as FeedbackType[]).map((type) => (
                <option key={type} value={type}>
                  {typeLabel[type]}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-label-sm uppercase tracking-wider text-muted">Filter priority</span>
            <Select
              className="h-10 w-auto"
              value={filters.priority}
              onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
            >
              <option value="">Any</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </label>

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-canvas px-3 py-2.5">
            <input
              type="checkbox"
              checked={filters.open_only}
              onChange={(event) => setFilters({ ...filters, open_only: event.target.checked })}
              className="h-4 w-4 accent-secondary"
            />
            <span className="text-body-md text-on-surface">Only what needs action</span>
          </label>

          <span className="ml-auto text-body-sm text-muted">
            {list.length} report{list.length === 1 ? '' : 's'} shown
          </span>
        </Card>

        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          {/* Queue */}
          <div className="flex flex-col gap-2 xl:col-span-5">
            {inbox.isLoading && <SkeletonCard />}

            {inbox.isSuccess && list.length === 0 && (
              <EmptyState
                title="Nothing waiting"
                description="Households have nothing outstanding. Reports appear here the moment one is sent."
                icon={<Icon name="inbox" className="text-[24px]" />}
              />
            )}

            {list.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => {
                  setSelected(report.id);
                  setNote('');
                }}
                aria-pressed={active?.id === report.id}
                className={`flex cursor-pointer flex-col gap-2 rounded-2xl p-4 text-left transition-all ${
                  active?.id === report.id
                    ? 'border-2 border-secondary bg-surface shadow-e2'
                    : 'border border-[rgba(43,45,66,0.05)] bg-surface shadow-e1 hover:shadow-e2'
                }`}
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone={priorityTone[report.priority]}>{report.priority}</Badge>
                  <span className="text-label-sm text-muted">
                    {report.age_hours === null
                      ? '—'
                      : report.age_hours < 24
                        ? `${report.age_hours} h old`
                        : `${Math.round(report.age_hours / 24)} d old`}
                  </span>
                </span>
                <span className="text-label-lg text-on-surface">{report.subject}</span>
                <span className="flex flex-wrap items-center gap-1.5 text-body-sm text-muted">
                  <span>{report.tenant?.name ?? 'Unknown household'}</span>
                  <span>·</span>
                  <span>{report.reporter?.name ?? 'Former member'}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Badge tone={statusTone[report.status]}>{report.status.replace('_', ' ')}</Badge>
                  <Badge tone="neutral">{typeLabel[report.type]}</Badge>
                </span>
              </button>
            ))}
          </div>

          {/* Triage */}
          <div className="flex flex-col gap-5 xl:col-span-7">
            {active ? (
              <>
                <Card className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h2 className="text-headline-md text-on-surface">{active.subject}</h2>
                      <span className="text-body-sm text-muted">
                        {typeLabel[active.type]} from {active.reporter?.name ?? 'a former member'}
                        {active.reporter?.email ? ` (${active.reporter.email})` : ''} ·{' '}
                        {active.tenant?.name ?? 'unknown household'} on{' '}
                        <span className="font-mono">{active.tenant?.subscription_tier}</span>
                      </span>
                    </div>
                    <Badge tone={statusTone[active.status]}>{active.status.replace('_', ' ')}</Badge>
                  </div>

                  <p className="whitespace-pre-wrap rounded-xl bg-canvas p-4 text-body-md text-on-surface">
                    {active.body}
                  </p>

                  {active.context && Object.keys(active.context).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(active.context).map(([key, value]) => (
                        <span
                          key={key}
                          className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1 text-label-sm"
                        >
                          <span className="text-muted">{key}</span>
                          <span className="font-mono text-on-surface">{value}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="flex flex-col gap-4 p-5">
                  <h3 className="text-headline-sm text-on-surface">Triage</h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="triage-status">Status</Label>
                      <Select
                        id="triage-status"
                        value={active.status}
                        disabled={triage.isPending}
                        onChange={(event) =>
                          triage.mutate({ id: active.id, status: event.target.value as FeedbackStatus })
                        }
                      >
                        <option value="new">Received</option>
                        <option value="triaged">Triaged</option>
                        <option value="in_progress">In progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="wont_fix">Won&apos;t fix</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="triage-priority">Priority</Label>
                      <Select
                        id="triage-priority"
                        value={active.priority}
                        disabled={triage.isPending}
                        onChange={(event) =>
                          triage.mutate({ id: active.id, priority: event.target.value as FeedbackPriority })
                        }
                      >
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="triage-note">Note for the household</Label>
                    <textarea
                      id="triage-note"
                      rows={3}
                      value={note || active.resolution_note || ''}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="What was wrong, or why this is not being done. The household sees this."
                      className="w-full rounded-xl bg-canvas px-4 py-3 text-body-md text-on-surface outline-none shadow-inner placeholder:text-muted focus:ring-2 focus:ring-primary/40"
                    />
                  </div>

                  <Button
                    disabled={triage.isPending}
                    onClick={() => triage.mutate({ id: active.id, resolutionNote: note })}
                    className="self-start"
                  >
                    {triage.isPending ? 'Saving…' : 'Save note'}
                  </Button>

                  {active.resolved_at && (
                    <p className="text-body-sm text-muted">
                      Resolved {new Date(active.resolved_at).toLocaleString()}
                      {active.resolver?.name ? ` by ${active.resolver.name}` : ''}.
                    </p>
                  )}

                  <p className="flex items-start gap-2 rounded-xl bg-sage-soft/60 px-4 py-3 text-body-sm text-on-surface-variant">
                    <Icon name="history" className="mt-0.5 text-[16px]" />
                    Every status and priority change is written to the security ledger with your name on it.
                  </p>
                </Card>
              </>
            ) : (
              <Card className="p-5">
                <EmptyState
                  title="Pick a report"
                  description="Select something from the queue to read it in full and move it along."
                  icon={<Icon name="forum" className="text-[24px]" />}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
