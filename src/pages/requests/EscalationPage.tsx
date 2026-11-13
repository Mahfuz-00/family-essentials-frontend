import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
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

          <StatGridSkeleton count={4} />

          <div className="h-64 rounded-[1.25rem] border border-white/70 bg-surface p-5 shadow-e1" />
          <div className="h-80 rounded-[1.25rem] border border-white/70 bg-surface p-5 shadow-e1" />
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

        {/* Budget — 4 Unified StatCards */}
        <StatGrid count={4}>
          <StatCard
            title="Calls used today"
            value={quota.data ? `${quota.data.used_today} / ${quota.data.daily_budget}` : '0 / 0'}
            icon="ring_volume"
            tone="forest"
            highlight={<StatHighlight tone="success">Daily Cap</StatHighlight>}
          />
          <StatCard
            title="Attempts per item"
            value={quota.data?.max_attempts_per_request ?? 0}
            icon="repeat"
            tone="forest"
            highlight={<StatHighlight tone="success">Max Limit</StatHighlight>}
          />
          <StatCard
            title="Cooldown"
            value={quota.data ? `${quota.data.cooldown_minutes}m` : '0m'}
            icon="hourglass_bottom"
            tone="sage"
            highlight={<StatHighlight tone="primary">Cooldown</StatHighlight>}
          />
          <StatCard
            title="Your consent"
            value={user?.voice_opt_in ? 'Opted In' : 'Opted Out'}
            icon="verified_user"
            tone={user?.phone_verified ? 'forest' : 'coral'}
            highlight={
              <StatHighlight tone={user?.phone_verified ? 'success' : 'danger'}>
                {user?.phone_verified ? 'Verified' : 'Unverified'}
              </StatHighlight>
            }
          />
        </StatGrid>

        {/* Policy */}
        <Card className="p-6">
          <h2 className="text-headline-sm text-on-surface">How escalation decides</h2>
          <p className="text-body-sm text-muted">
            The order below is enforced server-side; the app cannot talk round it.
          </p>

          <ul className="mt-4 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
            {rules.map((rule) => (
              <li key={rule.title} className="flex items-start gap-3.5 rounded-2xl bg-canvas p-4 shadow-[var(--shadow-inset-sm)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
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
