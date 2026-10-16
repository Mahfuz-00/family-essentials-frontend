import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Requests', 'Escalation & voice']}
          title="Escalation & voice"
          description="When the household gets called, how often, and what has actually been dialled."
          titleSize="headline"
          actions={
            <Link to="/settings" className="inline-flex">
              <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                <Icon name="tune" className="text-[18px]" />
                Consent & settings
              </span>
            </Link>
          }
        />

        {quota.isError && <Alert>{apiError(quota.error)}</Alert>}

        {/* Budget */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="flex flex-col gap-2 p-5">
            <span className="text-label-sm uppercase tracking-wider text-muted">Calls used today</span>
            <span className="text-display-lg font-bold text-on-surface">
              {quota.data ? `${quota.data.used_today} / ${quota.data.daily_budget}` : '—'}
            </span>
            <span className="text-body-sm text-muted">Daily household budget</span>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <span className="text-label-sm uppercase tracking-wider text-muted">Attempts per item</span>
            <span className="text-display-lg font-bold text-on-surface">
              {quota.data?.max_attempts_per_request ?? '—'}
            </span>
            <span className="text-body-sm text-muted">Then the item waits for a human</span>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <span className="text-label-sm uppercase tracking-wider text-muted">Cooldown</span>
            <span className="text-display-lg font-bold text-on-surface">
              {quota.data ? `${quota.data.cooldown_minutes}m` : '—'}
            </span>
            <span className="text-body-sm text-muted">Between attempts on one item</span>
          </Card>
          <Card className="flex flex-col gap-2 p-5">
            <span className="text-label-sm uppercase tracking-wider text-muted">Your consent</span>
            <span className="text-display-lg font-bold text-on-surface">
              {user?.voice_opt_in ? 'On' : 'Off'}
            </span>
            <span className="text-body-sm text-muted">
              {user?.phone_verified ? 'Number verified' : 'Verify your number to opt in'}
            </span>
          </Card>
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

          {(calls.data ?? []).length === 0 ? (
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
