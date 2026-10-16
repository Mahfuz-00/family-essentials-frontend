import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouterState } from '@tanstack/react-router';
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
import { api, apiError } from '@/lib/api';
import type { FeedbackPayload, FeedbackPriority, FeedbackReport, FeedbackStatus, FeedbackType } from '@/types';

const statusTone: Record<FeedbackStatus, 'success' | 'warning' | 'danger' | 'neutral' | 'primary'> = {
  new: 'primary',
  triaged: 'neutral',
  in_progress: 'warning',
  resolved: 'success',
  wont_fix: 'neutral',
};

const statusLabel: Record<FeedbackStatus, string> = {
  new: 'Received',
  triaged: 'Being looked at',
  in_progress: 'In progress',
  resolved: 'Resolved',
  wont_fix: "Won't fix",
};

const typeLabel: Record<FeedbackType, string> = {
  bug: 'Something is broken',
  feedback: 'General feedback',
  feature_request: 'Something is missing',
};

/**
 * Report a problem, and follow what happened to it.
 *
 * The household can see the status of what it sent and the note an operator wrote
 * when closing it — a channel nobody hears back from is not a channel.
 */
export function FeedbackPage() {
  const queryClient = useQueryClient();
  // The router's location, not window.location: the router owns navigation here.
  const path = useRouterState({ select: (state) => state.location.pathname });
  const [draft, setDraft] = useState({
    type: 'bug' as FeedbackType,
    priority: 'normal' as FeedbackPriority,
    subject: '',
    body: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reports = useQuery({
    queryKey: ['feedback'],
    queryFn: async () => (await api.get<FeedbackPayload>('/v1/feedback')).data,
  });

  const send = useMutation({
    mutationFn: async () =>
      api.post('/v1/feedback', {
        ...draft,
        context: {
          platform: 'web',
          screen: path,
        },
      }),
    onSuccess: async () => {
      setDraft({ type: 'bug', priority: 'normal', subject: '', body: '' });
      setError(null);
      setNotice('Sent. It is in the platform team’s queue, and its status appears below.');
      await queryClient.invalidateQueries({ queryKey: ['feedback'] });
    },
    onError: (caught) => {
      setError(apiError(caught));
      setNotice(null);
    },
  });

  const list = reports.data?.data ?? [];
  const canSend = draft.subject.trim().length >= 4 && draft.body.trim().length >= 10;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Account', 'Help & feedback']}
          title="Help & feedback"
          description="Report a bug, ask for something, or tell us how it is going. A person reads every one."
          titleSize="headline"
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {reports.isError && <Alert>{apiError(reports.error)}</Alert>}

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
          {/* Write */}
          <Card className="flex flex-col gap-4 p-5 lg:col-span-7">
            <h2 className="text-headline-sm text-on-surface">Send a report</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="feedback-type">What kind of report?</Label>
                <Select
                  id="feedback-type"
                  value={draft.type}
                  onChange={(event) => setDraft({ ...draft, type: event.target.value as FeedbackType })}
                >
                  {(Object.keys(typeLabel) as FeedbackType[]).map((type) => (
                    <option key={type} value={type}>
                      {typeLabel[type]}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="feedback-priority">How urgent is it?</Label>
                <Select
                  id="feedback-priority"
                  value={draft.priority}
                  onChange={(event) =>
                    setDraft({ ...draft, priority: event.target.value as FeedbackPriority })
                  }
                >
                  <option value="low">Low — a nice-to-have</option>
                  <option value="normal">Normal</option>
                  <option value="high">High — it is getting in the way</option>
                  <option value="critical">Critical — we cannot work</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="feedback-subject">Subject</Label>
              <Input
                id="feedback-subject"
                value={draft.subject}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
                placeholder="Shopping list loses items on reload"
              />
            </div>

            <div>
              <Label htmlFor="feedback-body">What happened?</Label>
              <textarea
                id="feedback-body"
                rows={6}
                value={draft.body}
                onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                placeholder="What you did, what you expected, and what happened instead."
                className="w-full rounded-xl bg-canvas px-4 py-3 text-body-md text-on-surface outline-none shadow-inner placeholder:text-muted focus:ring-2 focus:ring-primary/40"
              />
              <p className="mt-1 text-body-sm text-muted">
                The screen you are on and your browser are attached automatically, which saves a round
                of "which page was that?".
              </p>
            </div>

            <Button
              size="lg"
              disabled={!canSend || send.isPending}
              onClick={() => send.mutate()}
              className="self-start"
            >
              <Icon name="send" className="text-[18px]" />
              {send.isPending ? 'Sending…' : 'Send report'}
            </Button>
          </Card>

          {/* What happened to it */}
          <Card className="flex flex-col gap-3 p-5 lg:col-span-5">
            <h2 className="text-headline-sm text-on-surface">Your reports</h2>

            {reports.isLoading && <p className="text-body-md text-muted">Loading…</p>}

            {reports.isSuccess && list.length === 0 && (
              <EmptyState
                title="Nothing sent yet"
                description="When something goes wrong, tell us here — the report lands in the platform team's queue."
                icon={<Icon name="forum" className="text-[24px]" />}
              />
            )}

            <ul className="flex flex-col gap-2">
              {list.map((report: FeedbackReport) => (
                <li key={report.id} className="flex flex-col gap-2 rounded-xl bg-canvas p-4">
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-label-lg text-on-surface">{report.subject}</span>
                    <Badge tone={statusTone[report.status]}>{statusLabel[report.status]}</Badge>
                  </span>
                  <span className="text-body-sm text-muted">
                    {typeLabel[report.type]} · sent{' '}
                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : '—'}
                  </span>
                  {report.resolution_note && (
                    <span className="flex items-start gap-2 rounded-lg bg-forest-soft/60 px-3 py-2 text-body-sm text-on-surface">
                      <Icon name="check_circle" className="mt-0.5 text-[16px] text-secondary" />
                      {report.resolution_note}
                    </span>
                  )}
                </li>
              ))}
            </ul>

            {(reports.data?.summary.open ?? 0) > 0 && (
              <p className="text-body-sm text-muted">
                {reports.data?.summary.open} of your reports {reports.data?.summary.open === 1 ? 'is' : 'are'} still open.
              </p>
            )}
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
