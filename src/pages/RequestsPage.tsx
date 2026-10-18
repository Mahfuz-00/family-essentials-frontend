import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type {
  Place,
  RequestBoard,
  RequestPriority,
  ServiceRequest,
  TenantMember,
  VoiceCall,
} from '@/types';

type ColumnKey = 'overdue' | 'due_today' | 'assigned_to_me' | 'backlog' | 'completed_today';

const columns: {
  key: ColumnKey;
  title: string;
  dot: string;
  pill: string;
  empty: string;
}[] = [
  {
    key: 'overdue',
    title: 'Overdue',
    dot: 'bg-error',
    pill: 'bg-coral-soft text-error',
    empty: 'No overdue items pending.',
  },
  {
    key: 'due_today',
    title: 'Due Today',
    dot: 'bg-warning',
    pill: 'bg-tertiary-fixed/60 text-tertiary',
    empty: 'Nothing due today.',
  },
  {
    key: 'assigned_to_me',
    title: 'Assigned to Me',
    dot: 'bg-secondary',
    pill: 'bg-sage-soft text-secondary',
    empty: 'No items assigned to you.',
  },
  {
    // Catches everything open that the other columns do not: no due date, due
    // later, or assigned to someone else. Without it a new request with no date
    // and no assignee appeared in no column at all.
    key: 'backlog',
    title: 'Backlog',
    dot: 'bg-outline',
    pill: 'bg-surface-container-low text-on-surface-variant',
    empty: 'Nothing waiting in the backlog.',
  },
  {
    key: 'completed_today',
    title: 'Completed Today',
    dot: 'bg-success',
    pill: 'bg-forest-soft text-secondary',
    empty: 'Nothing completed yet today.',
  },
];

// Member dot colours, as used by the design's assignee segmented control.
const memberDots = ['bg-secondary', 'bg-warning', 'bg-primary-container', 'bg-tertiary'];

const priorityChip: Record<RequestPriority, string> = {
  low: 'bg-surface-container-low text-muted',
  normal: 'bg-sage-soft text-secondary',
  high: 'bg-coral-soft text-error',
  urgent: 'bg-coral-soft text-tertiary',
};

const emptyForm = {
  title: '',
  quantity: '',
  store_name: '',
  category: '',
  notes: '',
  place_id: '',
  priority: 'normal' as RequestPriority,
  due_at: '',
  assignee_id: '',
};

// Reasons the escalation policy can decline a call, in plain language.
const escalationReason: Record<string, string> = {
  opt_out: 'the assignee has not opted in to voice escalation',
  quiet_hours: 'household quiet hours are active',
  no_phone: 'the assignee has no verified phone number',
  attempts_exhausted: 'the daily attempt budget is used up',
  not_eligible: 'the request is not eligible for escalation',
};

function relativeDue(due: string | null): string | null {
  if (!due) {
    return null;
  }

  const hours = Math.round((Date.now() - new Date(due).getTime()) / 3_600_000);

  if (hours > 0) {
    return `${hours}h overdue`;
  }

  return `Due ${new Date(due).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
}

export function RequestsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;

  const [view, setView] = useState<'board' | 'list'>('board');
  const [query, setQuery] = useState('');
  const [assignee, setAssignee] = useState('all');
  const [category, setCategory] = useState('all');
  const [store, setStore] = useState('all');
  const addOpen = useUiStore((state) => state.addRequestOpen);
  const openAddRequest = useUiStore((state) => state.openAddRequest);
  const closeAddRequest = useUiStore((state) => state.closeAddRequest);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticeTone, setNoticeTone] = useState<'success' | 'info'>('success');

  const board = useQuery({
    queryKey: ['requests', 'board'],
    queryFn: async () => (await api.get<RequestBoard>('/v1/requests/board')).data,
  });

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
  });

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  // Today's escalation usage moved to the Escalation & voice module.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const create = useMutation({
    mutationFn: async () =>
      api.post('/v1/requests', {
        title: form.title,
        quantity: form.quantity || null,
        store_name: form.store_name || null,
        category: form.category || null,
        notes: form.notes || null,
        place_id: form.place_id ? Number(form.place_id) : null,
        priority: form.priority,
        due_at: form.due_at || null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
      }),
    onSuccess: async () => {
      setForm(emptyForm);
      closeAddRequest();
      setError(null);
      setNotice('Request added. Your family has been notified.');
      await refresh();
    },
    onError,
  });

  const act = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: string }) =>
      api.post(`/v1/requests/${id}/${action}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Request updated.');
      await refresh();
    },
    onError,
  });

  const assign = useMutation({
    mutationFn: async ({ id, assigneeId }: { id: number; assigneeId: number }) =>
      api.post(`/v1/requests/${id}/assign`, { assignee_id: assigneeId }),
    onSuccess: async () => {
      setError(null);
      setNotice('Handover recorded.');
      await refresh();
    },
    onError,
  });

  const snooze = useMutation({
    mutationFn: async (id: number) =>
      api.post(`/v1/requests/${id}/snooze`, {
        until: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      }),
    onSuccess: async () => {
      setError(null);
      setNotice('Snoozed for 2 hours.');
      await refresh();
    },
    onError,
  });

  const escalate = useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ data: VoiceCall }>(`/v1/requests/${id}/voice-escalation`)).data.data,
    onSuccess: async (call) => {
      const placed = ['queued', 'dispatched', 'answered', 'completed'].includes(call.status);

      setError(null);
      setNoticeTone(placed ? 'success' : 'info');
      setNotice(
        placed
          ? 'Voice escalation dispatched to the household admins.'
          : `No call was placed — ${
              call.reason
                ? (escalationReason[call.reason] ?? `the escalation policy returned "${call.reason}"`)
                : 'the escalation policy declined'
            }.`,
      );
      await refresh();
    },
    onError,
  });

  const busy = create.isPending || act.isPending || assign.isPending || snooze.isPending || escalate.isPending;
  const memberList = members.data ?? [];
  const placeList = places.data ?? [];
  const firstName = user?.name?.split(' ')[0] ?? 'me';

  const matches = (request: ServiceRequest) => {
    if (query.trim() !== '') {
      const needle = query.toLowerCase();
      const haystack =
        `${request.title} ${request.quantity ?? ''} ${request.store_name ?? ''} ${
          request.assignee?.name ?? ''
        }`.toLowerCase();

      if (!haystack.includes(needle)) {
        return false;
      }
    }

    if (assignee === 'me' && request.assignee?.id !== userId) {
      return false;
    }

    if (assignee === 'unassigned' && request.assignee != null) {
      return false;
    }

    if (
      assignee !== 'all' &&
      assignee !== 'me' &&
      assignee !== 'unassigned' &&
      String(request.assignee?.id ?? '') !== assignee
    ) {
      return false;
    }

    if (category !== 'all' && (request.category ?? 'uncategorised') !== category) {
      return false;
    }

    if (store !== 'all' && (request.store_name ?? 'No store') !== store) {
      return false;
    }

    return true;
  };

  const filtered = useMemo(() => {
    if (!board.data) {
      return null;
    }

    return {
      overdue: board.data.overdue.filter(matches),
      due_today: board.data.due_today.filter(matches),
      assigned_to_me: board.data.assigned_to_me.filter(matches),
      backlog: board.data.backlog.filter(matches),
      completed_today: board.data.completed_today.filter(matches),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.data, query, assignee, category, store, userId]);

  const distinct = (pick: (request: ServiceRequest) => string | null) => {
    if (!board.data) {
      return [] as string[];
    }

    const all = [
      ...board.data.overdue,
      ...board.data.due_today,
      ...board.data.assigned_to_me,
      ...board.data.backlog,
      ...board.data.completed_today,
    ];

    return Array.from(new Set(all.map(pick).filter((value): value is string => Boolean(value)))).sort();
  };

  const categories = useMemo(() => distinct((request) => request.category ?? 'uncategorised'), [board.data]);
  const stores = useMemo(() => distinct((request) => request.store_name), [board.data]);

  const overdueList = filtered?.overdue ?? [];

  const counts = board.data?.counts;

  const filtersActive = query.trim() !== '' || assignee !== 'all' || category !== 'all' || store !== 'all';

  /**
   * Each tile matches its column exactly. The household-wide aggregate appears
   * only when no filter is applied, because open items can appear in more than
   * one column (overdue *and* assigned to me) — a sum would be a lie, and a
   * filtered aggregate could not reconcile with what is on screen.
   */
  const metrics: { label: string; value: number; pill: string; dot: string; icon: boolean }[] = filtered
    ? [
        ...(filtersActive
          ? []
          : [
              {
                label: 'Open items',
                value: counts?.open ?? 0,
                pill: 'bg-surface-container-low text-on-surface',
                dot: 'bg-primary',
                icon: false,
              },
            ]),
        {
          label: 'Overdue',
          value: filtered.overdue.length,
          pill: 'bg-coral-soft text-error',
          dot: 'bg-error',
          icon: false,
        },
        {
          label: 'Due Today',
          value: filtered.due_today.length,
          pill: 'bg-tertiary-fixed/40 text-tertiary',
          dot: 'bg-warning',
          icon: false,
        },
        {
          label: `Assigned to ${firstName}`,
          value: filtered.assigned_to_me.length,
          pill: 'bg-sage-soft text-secondary',
          dot: 'bg-secondary',
          icon: false,
        },
        {
          label: 'Backlog',
          value: filtered.backlog.length,
          pill: 'bg-surface-container-low text-on-surface-variant',
          dot: 'bg-outline',
          icon: false,
        },
        {
          label: 'Completed',
          value: filtered.completed_today.length,
          pill: 'bg-forest-soft text-secondary',
          dot: 'bg-success',
          icon: true,
        },
      ]
    : [];

  const hasAnyCard = filtered
    ? filtered.overdue.length +
        filtered.due_today.length +
        filtered.assigned_to_me.length +
        filtered.backlog.length +
        filtered.completed_today.length >
      0
    : false;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              Household Logistics · Live Sync
            </>
          }
          title="Household Kanban & Errand Hub"
          description="Real-time domestic coordination for your household, synced across every paired device."
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone={noticeTone}>{notice}</Alert>}

        {/* Metric strip */}
        {metrics.length > 0 && (
          <section
            aria-label="Board summary"
            className="flex flex-wrap items-center gap-2 rounded-2xl bg-surface p-1.5 shadow-e1"
          >
            {metrics.map((metric) => (
              <span
                key={metric.label}
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-label-md ${metric.pill}`}
              >
                {metric.icon ? (
                  <Icon name="check_circle" className="text-[15px]" />
                ) : (
                  <span className={`h-2 w-2 rounded-full ${metric.dot}`} />
                )}
                <span className="font-bold">{metric.value}</span>
                <span>{metric.label}</span>
              </span>
            ))}
          </section>
        )}

        {/* Overdue banner */}
        {overdueList.length > 0 && (
          <section className="relative overflow-hidden rounded-2xl bg-coral-soft p-4 shadow-e1">
            <span className="pointer-events-none absolute -bottom-10 -right-10 h-44 w-44 rounded-full bg-error/10 blur-xl" />
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-error text-on-error">
                  <Icon name="warning" filled className="text-[22px]" />
                </span>
                <div className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <Badge tone="danger">
                      Overdue Attention Required ({overdueList.length}{' '}
                      {overdueList.length === 1 ? 'Item' : 'Items'})
                    </Badge>
                    {relativeDue(overdueList[0].due_at) && (
                      <span className="flex items-center gap-1 rounded-full bg-surface/70 px-2 py-0.5 text-label-sm text-error">
                        <Icon name="schedule" className="text-[13px]" />
                        {relativeDue(overdueList[0].due_at)}
                      </span>
                    )}
                  </span>
                  <p className="text-headline-sm text-on-surface">{overdueList[0].title}</p>
                  <p className="text-body-sm text-on-surface-variant">
                    {overdueList[0].store_name ? `${overdueList[0].store_name} · ` : ''}
                    {overdueList[0].assignee?.name
                      ? `Assigned to ${overdueList[0].assignee.name}`
                      : 'Unassigned'}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="md" disabled={busy} onClick={() => snooze.mutate(overdueList[0].id)}>
                  <Icon name="alarm_add" className="text-[16px]" />
                  Snooze 2h
                </Button>
                <Button
                  size="md"
                  variant="danger"
                  disabled={busy}
                  onClick={() => escalate.mutate(overdueList[0].id)}
                >
                  <Icon name="ring_volume" className="text-[16px]" />
                  Trigger Voice Alert
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Filter bar */}
        <section className="flex flex-col gap-3 rounded-2xl bg-surface p-3 shadow-e1 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1">
              <Icon
                name="filter_list"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter requests, stores, notes…"
                aria-label="Filter requests"
                className="h-10 pl-9"
              />
            </div>

            {/* Assignee segmented control */}
            <div
              className="flex flex-wrap items-center gap-1 rounded-xl bg-surface-container-low p-1"
              role="group"
              aria-label="Filter by assignee"
            >
              <Segmented active={assignee === 'all'} onClick={() => setAssignee('all')}>
                All
              </Segmented>
              <Segmented active={assignee === 'me'} onClick={() => setAssignee('me')} dot="bg-secondary">
                {firstName}
              </Segmented>
              {memberList
                .filter((member) => member.user_id !== userId)
                .map((member, index) => (
                  <Segmented
                    key={member.user_id}
                    active={assignee === String(member.user_id)}
                    onClick={() => setAssignee(String(member.user_id))}
                    dot={memberDots[(index + 1) % memberDots.length]}
                  >
                    {member.name?.split(' ')[0] ?? 'Member'}
                  </Segmented>
                ))}
              <Segmented
                active={assignee === 'unassigned'}
                onClick={() => setAssignee('unassigned')}
              >
                Unassigned
              </Segmented>
            </div>

            <div className="relative">
              <Icon
                name="local_grocery_store"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-primary"
              />
              <Select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                aria-label="Filter by category"
                className="h-10 w-auto min-w-[170px] pl-9 text-label-md"
              >
                <option value="all">All Categories</option>
                {categories.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>

            {stores.length > 0 && (
              <div className="relative">
                <Icon
                  name="storefront"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-primary"
                />
                <Select
                  value={store}
                  onChange={(event) => setStore(event.target.value)}
                  aria-label="Filter by store"
                  className="h-10 w-auto min-w-[170px] pl-9 text-label-md"
                >
                  <option value="all">All Stores</option>
                  {stores.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>

          {/* View switcher */}
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1"
              role="group"
              aria-label="View"
            >
              <Segmented active={view === 'board'} onClick={() => setView('board')} icon="view_kanban">
                Kanban
              </Segmented>
              <Segmented active={view === 'list'} onClick={() => setView('list')} icon="view_list">
                List
              </Segmented>
            </div>
          </div>
        </section>

        {board.isLoading && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <SkeletonCard key={column.key} />
            ))}
          </div>
        )}

        {board.isError && <Alert>{apiError(board.error)}</Alert>}

        {board.data && filtered && view === 'board' && (
          <section className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => {
              const requests = filtered[column.key];

              return (
                <div key={column.key} className="flex flex-col gap-3 rounded-2xl bg-surface-container-low/60 p-2">
                  <header className="flex items-center justify-between px-2 pt-1">
                    <span className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
                      <h2 className="text-headline-sm text-on-surface">{column.title}</h2>
                      <span className={`rounded-full px-2 py-0.5 text-label-sm ${column.pill}`}>
                        {requests.length}
                      </span>
                    </span>
                    <Icon name="more_horiz" className="text-[18px] text-muted" />
                  </header>

                  {requests.length === 0 && (
                    <p className="rounded-xl bg-surface/60 px-3 py-6 text-center text-body-sm text-muted">
                      {column.empty}
                    </p>
                  )}

                  {requests.map((request) => (
                    <TaskCard
                      key={request.id}
                      request={request}
                      busy={busy}
                      isMine={request.assignee?.id === userId}
                      members={memberList}
                      onAction={(action) => act.mutate({ id: request.id, action })}
                      onHandover={(assigneeId) => assign.mutate({ id: request.id, assigneeId })}
                      onSnooze={() => snooze.mutate(request.id)}
                    />
                  ))}
                </div>
              );
            })}
          </section>
        )}

        {board.data && filtered && view === 'list' && (
          <Card className="overflow-hidden p-0">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse text-left text-body-md">
                <thead className="bg-canvas/70">
                  <tr className="text-label-sm uppercase tracking-wider text-muted">
                    <th className="px-5 py-3 font-bold">Item</th>
                    <th className="px-5 py-3 font-bold">Store</th>
                    <th className="px-5 py-3 font-bold">Assignee</th>
                    <th className="px-5 py-3 font-bold">Due</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ...filtered.overdue,
                    ...filtered.due_today,
                    ...filtered.assigned_to_me,
                    ...filtered.completed_today,
                  ]
                    .filter(
                      (request, index, all) => all.findIndex((item) => item.id === request.id) === index,
                    )
                    .map((request) => (
                      <tr key={request.id} className="border-t border-canvas">
                        <td className="px-5 py-3.5">
                          <span className="flex flex-col">
                            <span className="font-semibold text-on-surface">{request.title}</span>
                            {request.quantity && (
                              <span className="text-body-sm text-muted">{request.quantity}</span>
                            )}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted">{request.store_name ?? '—'}</td>
                        <td className="px-5 py-3.5">
                          {request.assignee?.name ? (
                            <span className="flex items-center gap-2">
                              <Avatar name={request.assignee.name} size="sm" />
                              <span className="text-body-sm">{request.assignee.name}</span>
                            </span>
                          ) : (
                            <span className="text-body-sm text-muted">Unassigned</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-muted">
                          {request.due_at ? new Date(request.due_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge tone={request.status === 'completed' ? 'success' : 'neutral'}>
                            {request.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {board.data && filtered && !hasAnyCard && (
          <EmptyState
            title="All caught up"
            description="No pending requests for your family right now. Add one and the right person gets notified."
            action={
              <Button size="lg" onClick={openAddRequest}>
                <Icon name="add" className="text-[18px]" />
                Add request
              </Button>
            }
          />
        )}
      </div>

      {/* Floating action button */}
      <button
        type="button"
        onClick={openAddRequest}
        title="Add request"
        aria-label="Add request"
        className="fixed bottom-6 right-8 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl bg-secondary text-on-secondary shadow-e3 transition-all hover:bg-primary active:scale-95"
      >
        <Icon name="add" className="text-[28px]" />
      </button>

      {/* Quick add */}
      <Modal
        open={addOpen}
        onClose={closeAddRequest}
        title="Add a request"
        description="Capture what the family needs. The assignee gets notified."
        footer={
          <>
            <Button variant="ghost" onClick={closeAddRequest}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={busy || form.title.trim() === ''}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Saving…' : 'Save & notify'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="title">What does the family need?</Label>
            <Input
              id="title"
              autoFocus
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Milk 2 litres"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                value={form.quantity}
                onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                placeholder="2 litres"
              />
            </div>

            <div>
              <Label htmlFor="store_name">Store</Label>
              <Input
                id="store_name"
                value={form.store_name}
                onChange={(event) => setForm({ ...form, store_name: event.target.value })}
                placeholder="Whole Foods"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="grocery"
              />
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                id="priority"
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value as RequestPriority })}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="place">Saved place</Label>
              <Select
                id="place"
                value={form.place_id}
                onChange={(event) => setForm({ ...form, place_id: event.target.value })}
              >
                <option value="">No saved place</option>
                {placeList.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                    {place.kind_label ? ` · ${place.kind_label}` : ''}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label htmlFor="assignee">Assign to</Label>
              <Select
                id="assignee"
                value={form.assignee_id}
                onChange={(event) => setForm({ ...form, assignee_id: event.target.value })}
              >
                <option value="">Unassigned</option>
                {memberList.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="Anything the runner should know"
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="due">Due</Label>
              <Input
                id="due"
                type="datetime-local"
                value={form.due_at}
                onChange={(event) => setForm({ ...form, due_at: event.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

function Segmented({
  active,
  onClick,
  children,
  dot,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  dot?: string;
  icon?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-label-md transition-all ${
        active ? 'bg-surface font-semibold text-on-surface shadow-sm' : 'text-muted hover:text-on-surface'
      }`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {icon && <Icon name={icon} className="text-[16px]" />}
      {children}
    </button>
  );
}

function TaskCard({
  request,
  busy,
  isMine,
  members,
  onAction,
  onHandover,
  onSnooze,
}: {
  request: ServiceRequest;
  busy: boolean;
  isMine: boolean;
  members: TenantMember[];
  onAction: (action: string) => void;
  onHandover: (assigneeId: number) => void;
  onSnooze: () => void;
}) {
  const isOpen = ['pending', 'accepted', 'in_progress'].includes(request.status);
  const isOverdue = request.due_at != null && new Date(request.due_at) < new Date() && isOpen;
  const isDone = request.status === 'completed';

  const chip =
    isOverdue && isOpen
      ? `${request.priority} · Overdue`
      : request.priority === 'high' || request.priority === 'urgent'
        ? `${request.priority} Priority`
        : (relativeDue(request.due_at) ?? `${request.priority} Priority`);

  return (
    <article
      className={`group relative flex flex-col gap-2.5 overflow-hidden rounded-2xl border border-[rgba(43,45,66,0.05)] bg-surface p-4 shadow-e1 transition-shadow hover:shadow-e2 ${
        isDone ? 'opacity-80' : ''
      }`}
    >
      {isOverdue && isOpen && <span className="absolute left-0 top-0 h-full w-1.5 bg-error" />}

      <div className="flex items-start justify-between gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-label-sm capitalize ${priorityChip[request.priority]}`}
        >
          {chip}
        </span>
        {request.due_at && !isOverdue && (
          <span className="text-label-sm text-muted">
            {new Date(request.due_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      <h3
        className={`text-label-lg font-bold text-on-surface transition-colors group-hover:text-primary ${
          isDone ? 'line-through' : ''
        }`}
      >
        {request.title}
      </h3>

      {request.quantity && (
        <p className="truncate text-body-sm text-muted" title={request.quantity}>
          {request.quantity}
        </p>
      )}

      {request.store_name && (
        <p className="flex items-center gap-1.5 truncate text-body-sm text-muted" title={request.store_name}>
          <Icon name="storefront" className="text-[16px] text-primary" />
          {request.store_name}
        </p>
      )}

      {request.notes && (
        <p className="rounded-xl bg-canvas p-2 text-body-sm italic text-on-surface-variant">
          {request.notes}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-canvas pt-2.5">
        <span className="flex items-center gap-2">
          <Avatar name={request.assignee?.name ?? 'Unassigned'} size="sm" />
          <span className="text-label-sm text-on-surface-variant">
            {request.assignee?.name ?? 'Unassigned'}
          </span>
        </span>

        {isOpen && (
          <span className="flex items-center gap-1">
            {request.status === 'pending' && (isMine || request.assignee == null) && (
              <IconAction
                icon="check"
                label={`Accept ${request.title}`}
                tone="success"
                disabled={busy}
                onClick={() => onAction('accept')}
              />
            )}
            {request.status === 'accepted' && (
              <IconAction
                icon="play_arrow"
                label={`Start ${request.title}`}
                tone="primary"
                disabled={busy}
                onClick={() => onAction('start')}
              />
            )}
            {request.status !== 'pending' && (
              <IconAction
                icon="task_alt"
                label={`Complete ${request.title}`}
                tone="success"
                disabled={busy}
                onClick={() => onAction('complete')}
              />
            )}
            <IconAction icon="snooze" label={`Snooze ${request.title}`} disabled={busy} onClick={onSnooze} />
            <HandoverMenu request={request} members={members} disabled={busy} onHandover={onHandover} />
          </span>
        )}

        {isDone && (
          <span className="flex items-center gap-1.5 text-label-sm text-secondary">
            <Icon name="check_circle" filled className="text-[16px]" />
            Completed
          </span>
        )}
      </div>
    </article>
  );
}

function IconAction({
  icon,
  label,
  onClick,
  disabled,
  tone = 'neutral',
}: {
  icon: string;
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone?: 'neutral' | 'primary' | 'success';
}) {
  const tones = {
    neutral: 'bg-surface-container-low text-on-surface-variant hover:text-on-surface',
    primary: 'bg-sage-soft text-primary hover:bg-forest-soft',
    success: 'bg-forest-soft text-secondary hover:bg-secondary hover:text-on-secondary',
  } as const;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg transition-colors disabled:opacity-40 ${tones[tone]}`}
    >
      <Icon name={icon} className="text-[16px]" />
    </button>
  );
}

function HandoverMenu({
  request,
  members,
  disabled,
  onHandover,
}: {
  request: ServiceRequest;
  members: TenantMember[];
  disabled: boolean;
  onHandover: (assigneeId: number) => void;
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">Hand over {request.title}</span>
      <span className="relative flex h-8 items-center">
        <Icon
          name="swap_horiz"
          className="pointer-events-none absolute left-2 text-[16px] text-on-surface-variant"
        />
        <select
          value=""
          disabled={disabled}
          onChange={(event) => {
            if (event.target.value) {
              onHandover(Number(event.target.value));
            }
          }}
          className="h-8 w-8 cursor-pointer appearance-none rounded-lg bg-surface-container-low pl-7 text-transparent outline-none transition-all hover:text-on-surface-variant focus:w-auto focus:pr-2 focus:text-on-surface-variant"
        >
          <option value="">Hand over</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.name}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
