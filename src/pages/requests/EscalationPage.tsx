import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { VoiceCall, VoiceQuota } from '@/types';

/**
 * The escalation module: what the policy does, what it costs, and what it has
 * actually done. Split off the kanban, which was carrying the policy, the budget,
 * the consent toggle and the call history alongside the day's work.
 */
export function EscalationPage() {
  const user = useAuthStore((state) => state.user);

  const quota = useQuery({
    queryKey: ['voice', 'quota'],
    queryFn: async () => (await api.get<VoiceQuota>('/v1/voice-calls/quota')).data,
  });

  const calls = useQuery({
    queryKey: ['voice', 'calls'],
    queryFn: async () => (await api.get<{ data: VoiceCall[] }>('/v1/voice-calls')).data.data,
  });

  const rules = [
    {
      icon: 'schedule',
      title: 'Time-based first',
      detail: 'Push reminders fire at the due time. A call is only considered once an item is overdue.',
    },
    {
      icon: 'priority_high',
      title: 'Urgency gate',
      detail: 'Only high or urgent items escalate. A manual trigger bypasses this, nothing else.',
    },
    {
      icon: 'nightlight',
      title: 'Quiet hours',
      detail: 'No calls during the household quiet window, whatever the priority.',
    },
    {
      icon: 'phone_enabled',
      title: 'Consent and a verified number',
      detail: 'Each person opts in individually, and their number must be verified first.',
    },
    {
      icon: 'snooze',
      title: 'Cooldown between attempts',
      detail: 'A per-request attempt limit and a cooldown stop repeat calls for the same item.',
    },
  ];

  if (quota.isLoading || calls.isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="space-y-2">
            <div className="h-8 w-60 rounded-xl bg-forest-soft/60" />
            <div className="h-4 w-96 rounded-lg bg-forest-soft/40" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1"
              >
                <div className="space-y-2.5">
                  <div className="h-3 w-28 rounded bg-forest-soft/40" />
                  <div className="h-7 w-20 rounded-lg bg-forest-soft/60" />
                  <div className="h-3 w-36 rounded bg-forest-soft/30" />
                </div>
                <div className="h-11 w-11 rounded-xl bg-forest-soft/50" />
              </div>
            ))}
          </div>

          <div className="h-64 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1" />
          <div className="h-80 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Voice Escalations"
          description="When the household gets called, how often, and what has actually been dialled."
          titleSize="headline"
        />

        {quota.isError && (
          <QueryError error={quota.error} what="the call budget" onRetry={() => void quota.refetch()} />
        )}

        {/* Budget */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
          <div className="relative flex flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Calls used today</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {quota.data ? `${quota.data.used_today} / ${quota.data.daily_budget}` : '0 / 0'}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-secondary">
                    Daily Cap
                  </span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
                <Icon name="ring_volume" className="text-[22px]" />
              </div>
            </div>
            <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">Daily household budget</span>
          </div>

          <div className="relative flex flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Attempts per item</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {quota.data?.max_attempts_per_request ?? 0}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-secondary">
                    Max Limit
                  </span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
                <Icon name="repeat" className="text-[22px]" />
              </div>
            </div>
            <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">Then the item waits for a human</span>
          </div>

          <div className="relative flex flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Cooldown</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {quota.data ? `${quota.data.cooldown_minutes}m` : '0m'}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-secondary">
                    Cooldown
                  </span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
                <Icon name="hourglass_bottom" className="text-[22px]" />
              </div>
            </div>
            <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">Between attempts on one item</span>
          </div>

          <div className="relative flex flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col min-w-0 flex-1 pr-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Your consent</span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {user?.voice_opt_in ? 'Opted In' : 'Opted Out'}
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold leading-none ${
                    user?.phone_verified ? 'bg-forest-soft text-success' : 'bg-coral-soft text-error'
                  }`}>
                    {user?.phone_verified ? 'Verified' : 'Unverified'}
                  </span>
                </div>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
                <Icon name="verified_user" className="text-[22px]" />
              </div>
            </div>
            <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">
              {user?.phone_verified ? 'Direct voice notifications active' : 'Verify phone number to opt in'}
            </span>
          </div>
        </section>

        {/* Policy */}
        <Card className="p-5">
          <h2 className="text-headline-sm text-on-surface">How escalation decides</h2>
          <p className="text-body-sm text-muted">
            The order below is enforced server-side; the app cannot talk round it.
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.title} className="flex items-start gap-3 rounded-xl bg-canvas p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name={rule.icon} className="text-[20px]" />
                </span>
                <span className="flex flex-col">
                  <span className="text-label-lg text-on-surface">{rule.title}</span>
                  <span className="text-body-sm text-muted">{rule.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* History */}
        <Card className="overflow-hidden p-0">
          <div className="p-5">
            <h2 className="text-headline-sm text-on-surface">Call history</h2>
            <p className="text-body-sm text-muted">
              Including calls the policy declined, with the reason — a skipped call is information too.
            </p>
          </div>

          {calls.isError ? (
            <div className="p-5 pt-0">
              <QueryError
                error={calls.error}
                what="the call history"
                onRetry={() => void calls.refetch()}
              />
            </div>
          ) : calls.isLoading ? (
            <p className="p-5 pt-0 text-body-md text-muted">Loading calls…</p>
          ) : (calls.data ?? []).length === 0 ? (
            <div className="p-5 pt-0">
              <EmptyState
                title="No calls yet"
                description="When an urgent item goes overdue and somebody has opted in, the attempt shows up here with its outcome."
                icon={<Icon name="ring_volume" className="text-[24px]" />}
              />
            </div>
          ) : (
            <Table className="min-w-[720px]">
              <THead>
                <TH>When</TH>
                <TH>Item</TH>
                <TH>Status</TH>
                <TH>Reason</TH>
                <TH className="text-right">Attempts</TH>
              </THead>
              <tbody>
                {(calls.data ?? []).map((call) => (
                  <TR key={call.id}>
                    <TD className="whitespace-nowrap text-body-sm text-muted">
                      {new Date(call.created_at).toLocaleString()}
                    </TD>
                    <TD className="text-on-surface">{call.request?.title ?? '—'}</TD>
                    <TD>
                      <Badge
                        tone={
                          call.status === 'skipped'
                            ? 'warning'
                            : call.status === 'failed'
                              ? 'danger'
                              : 'success'
                        }
                      >
                        {call.status}
                      </Badge>
                    </TD>
                    <TD className="text-body-sm text-muted">{call.reason ?? '—'}</TD>
                    <TD className="text-right text-body-sm text-on-surface">{call.attempts}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
