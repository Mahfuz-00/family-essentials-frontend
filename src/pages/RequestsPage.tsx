import { useMemo, useRef, useState } from 'react';
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
import { formatMoney, parseMoneyToMinor } from '@/lib/money';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import type {
  Ledger,
  Place,
  RequestBoard,
  RequestItem,
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
  category: 'grocery',
  notes: '',
  place_id: '',
  trigger_place_id: '',
  trigger_direction: '',
  priority: 'normal' as RequestPriority,
  due_at: '',
  assignee_id: '',
  amount: '',
  ledger_id: '',
  items: [{ name: '', quantity_asked: '' }] as Array<{ name: string; quantity_asked: string }>,
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

  const kanbanScrollRef = useRef<HTMLDivElement>(null);

  const scrollKanban = (direction: 'prev' | 'next') => {
    if (kanbanScrollRef.current) {
      const scrollAmount = direction === 'next' ? 340 : -340;
      kanbanScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const [focusMode, setFocusMode] = useState<'all' | 'today' | 'backlog' | 'completed'>('all');
  const [view, setView] = useState<'board' | 'list'>('board');
  const globalSearchQuery = useUiStore((state) => state.searchQuery);
  const [query, setQuery] = useState(globalSearchQuery);

  // Sync with global header search query
  if (globalSearchQuery !== query) {
    setQuery(globalSearchQuery);
  }
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
  const [calendarModalOpen, setCalendarModalOpen] = useState(false);
  const [calendarCopied, setCalendarCopied] = useState(false);
  const [nlpPrompt, setNlpPrompt] = useState('');

  const calendarQuery = useQuery({
    queryKey: ['calendar', 'feed-url'],
    queryFn: async () =>
      (await api.get<{ data: { feed_url: string; webcal_url: string; token: string } }>('/v1/calendar/feed-url'))
        .data.data,
    enabled: calendarModalOpen,
  });

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

  const ledgersQuery = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const [fulfillRequest, setFulfillRequest] = useState<ServiceRequest | null>(null);
  const [fulfillItems, setFulfillItems] = useState<RequestItem[]>([]);
  const [fulfillAmount, setFulfillAmount] = useState('');
  const [fulfillLedgerId, setFulfillLedgerId] = useState('');
  const [fulfillQuantityGot, setFulfillQuantityGot] = useState('');

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { name: '', quantity_asked: '' }],
    });
  };

  const removeItemRow = (index: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const updateItemRow = (index: number, field: 'name' | 'quantity_asked', value: string) => {
    const updated = [...form.items];
    updated[index][field] = value;
    setForm({ ...form, items: updated });
  };

  const openFulfillModal = (req: ServiceRequest) => {
    const items: RequestItem[] =
      req.items && req.items.length > 0
        ? req.items.map((it) => ({
            ...it,
            quantity_got: it.quantity_got ?? it.quantity_asked ?? '',
            is_picked: it.is_picked ?? true,
          }))
        : [
            {
              name: req.title,
              quantity_asked: req.quantity ?? '1',
              quantity_got: req.quantity_got ?? req.quantity ?? '1',
              is_picked: true,
            },
          ];

    setFulfillRequest(req);
    setFulfillItems(items);
    setFulfillAmount(req.amount_minor != null ? (req.amount_minor / 100).toFixed(2) : '');
    setFulfillLedgerId(
      req.ledger_id ? String(req.ledger_id) : ledgersQuery.data?.[0]?.id ? String(ledgersQuery.data[0].id) : ''
    );
    setFulfillQuantityGot(req.quantity_got ?? '');
  };

  const submitFulfill = () => {
    if (!fulfillRequest) return;
    const minor = fulfillAmount ? parseMoneyToMinor(fulfillAmount) : null;
    act.mutate({
      id: fulfillRequest.id,
      action: 'complete',
      payload: {
        quantity_got:
          fulfillQuantityGot.trim() ||
          `${fulfillItems.filter((i) => i.is_picked).length} of ${fulfillItems.length} items picked`,
        items: fulfillItems,
        amount_minor: minor,
        ledger_id: fulfillLedgerId ? Number(fulfillLedgerId) : null,
      },
    });
  };

  // Today's escalation usage moved to the Escalation & voice module.
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['requests'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const nlpDispatcherMutation = useMutation({
    mutationFn: async (text: string) =>
      (await api.post<{ parsed: any; created: boolean }>('/v1/requests/parse-nlp', { text, execute: true })).data,
    onSuccess: async (data) => {
      setNlpPrompt('');
      setNotice(
        `AI Dispatcher created errand: "${data.parsed.title}" (${data.parsed.assignee_name ? `Assigned to ${data.parsed.assignee_name}` : 'Unassigned'}${data.parsed.store_name ? ` at ${data.parsed.store_name}` : ''})`
      );
      setNoticeTone('success');
      setError(null);
      await refresh();
    },
    onError,
  });

  const create = useMutation({
    mutationFn: async () => {
      const validItems = form.items
        .filter((it) => it.name.trim() !== '')
        .map((it) => ({
          name: it.name.trim(),
          quantity_asked: it.quantity_asked.trim() || null,
          is_picked: false,
        }));

      const title =
        form.title.trim() ||
        (validItems.length > 0 ? validItems.map((it) => it.name).join(', ') : 'Household Errand');

      const minor = form.amount ? parseMoneyToMinor(form.amount) : null;

      return api.post('/v1/requests', {
        title,
        quantity: form.quantity || (validItems.length > 0 ? `${validItems.length} items` : null),
        items: validItems.length > 0 ? validItems : undefined,
        store_name: form.store_name || null,
        category: form.category || null,
        notes: form.notes || null,
        place_id: form.place_id ? Number(form.place_id) : null,
        location_trigger_place_id: form.trigger_place_id ? Number(form.trigger_place_id) : null,
        location_trigger_direction: form.trigger_direction || null,
        priority: form.priority,
        due_at: form.due_at || null,
        assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
        amount_minor: minor,
        ledger_id: form.ledger_id ? Number(form.ledger_id) : null,
      });
    },
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
    mutationFn: async ({
      id,
      action,
      payload,
    }: {
      id: number;
      action: string;
      payload?: Record<string, any>;
    }) => api.post(`/v1/requests/${id}/${action}`, payload ?? {}),
    onSuccess: async () => {
      setError(null);
      setNotice('Request updated.');
      setFulfillRequest(null);
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

  const thank = useMutation({
    mutationFn: async (id: number) =>
      (await api.post<{ message: string }>(`/v1/requests/${id}/thank`)).data,
    onSuccess: (data) => {
      setNotice(data.message);
      setNoticeTone('success');
      setError(null);
      void refresh();
    },
    onError,
  });

  const busy = create.isPending || act.isPending || assign.isPending || snooze.isPending || escalate.isPending || thank.isPending;
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

  const visibleColumns = useMemo(() => {
    if (focusMode === 'today') {
      return columns.filter((c) => c.key === 'overdue' || c.key === 'due_today' || c.key === 'assigned_to_me');
    }
    if (focusMode === 'backlog') {
      return columns.filter((c) => c.key === 'backlog');
    }
    if (focusMode === 'completed') {
      return columns.filter((c) => c.key === 'completed_today');
    }
    return columns;
  }, [focusMode]);

  const overdueList = filtered?.overdue ?? [];

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
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCalendarModalOpen(true)}
              >
                <Icon name="calendar_month" className="text-[18px]" />
                Sync Calendar (.ics)
              </Button>
              <Button
                variant="primary"
                onClick={openAddRequest}
              >
                <Icon name="add" className="text-[18px]" />
                New Errand
              </Button>
            </div>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone={noticeTone}>{notice}</Alert>}

        {/* Gap G: AI Family Dispatcher Natural Language Quick-Add */}
        <section className="relative overflow-hidden rounded-2xl border border-secondary/25 bg-forest-soft/30 p-3.5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
              <Icon name="psychology" className="text-[22px]" />
            </span>
            <div className="flex flex-1 flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={nlpPrompt}
                onChange={(e) => setNlpPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nlpPrompt.trim() && !nlpDispatcherMutation.isPending) {
                    nlpDispatcherMutation.mutate(nlpPrompt.trim());
                  }
                }}
                placeholder="AI Dispatcher: e.g. 'Pick up organic whole milk at Trader Joe\'s tomorrow 5pm for Sarah ASAP'"
                className="h-10 flex-1 rounded-xl border border-outline-variant/40 bg-surface px-3.5 text-xs sm:text-sm text-on-surface placeholder:text-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 shadow-xs"
              />
              <Button
                variant="primary"
                disabled={!nlpPrompt.trim() || nlpDispatcherMutation.isPending}
                onClick={() => nlpDispatcherMutation.mutate(nlpPrompt.trim())}
              >
                <Icon name="auto_awesome" className="text-[16px]" />
                {nlpDispatcherMutation.isPending ? 'Dispatching...' : 'AI Quick-Dispatch'}
              </Button>
            </div>
          </div>
        </section>

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

        {/* Focus Mode Navigation */}
        <div className="flex border-b border-outline-variant/30 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFocusMode('all')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
              focusMode === 'all'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="view_kanban" className="text-[16px]" />
            Full Board
          </button>
          <button
            type="button"
            onClick={() => setFocusMode('today')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
              focusMode === 'today'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="bolt" className="text-[16px]" />
            Today&apos;s Focus
          </button>
          <button
            type="button"
            onClick={() => setFocusMode('backlog')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
              focusMode === 'backlog'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="inventory_2" className="text-[16px]" />
            Backlog {board.isLoading ? '' : `(${filtered?.backlog?.length ?? 0})`}
          </button>
          <button
            type="button"
            onClick={() => setFocusMode('completed')}
            className={`flex items-center gap-1.5 border-b-2 px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
              focusMode === 'completed'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="check_circle" className="text-[16px]" />
            Completed Archive {board.isLoading ? '' : `(${filtered?.completed_today?.length ?? 0})`}
          </button>
        </div>

        {/* Filter bar */}
        <section className="flex flex-col gap-3 rounded-2xl bg-surface p-3.5 shadow-e1 border border-outline-variant/30">
          {/* Row 1: Search & Assignee Segmented Filter */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative w-full lg:max-w-sm shrink-0">
              <Icon
                name="filter_list"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
              />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter requests, stores, notes…"
                aria-label="Filter requests"
                className="h-9.5 pl-9 pr-8 text-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface p-1"
                  aria-label="Clear filter"
                >
                  <Icon name="close" className="text-[16px]" />
                </button>
              )}
            </div>

            {/* Assignee segmented control */}
            <div
              className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1 overflow-x-auto no-scrollbar"
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
          </div>

          {/* Row 2: Secondary Dropdown Filters, Columns Scroller & View Switcher */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-outline-variant/15">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Icon
                  name="local_grocery_store"
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-primary"
                />
                <Select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  aria-label="Filter by category"
                  className="h-9 w-auto min-w-[155px] pl-8.5 pr-8 text-label-sm"
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
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-primary"
                  />
                  <Select
                    value={store}
                    onChange={(event) => setStore(event.target.value)}
                    aria-label="Filter by store"
                    className="h-9 w-auto min-w-[155px] pl-8.5 pr-8 text-label-sm"
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

            {/* View switcher & Column Navigation */}
            <div className="flex items-center gap-2.5 ml-auto">
              {view === 'board' && (
                <div className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1 border border-outline-variant/30">
                  <button
                    type="button"
                    onClick={() => scrollKanban('prev')}
                    aria-label="Previous columns"
                    title="Scroll back to previous column"
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
                  >
                    <Icon name="arrow_back" className="text-[17px]" />
                  </button>
                  <span className="text-[11px] font-bold text-muted px-1.5 uppercase tracking-wider">Columns</span>
                  <button
                    type="button"
                    onClick={() => scrollKanban('next')}
                    aria-label="Next columns"
                    title="Scroll forward to next column"
                    className="flex h-7.5 w-7.5 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface hover:text-on-surface transition-colors"
                  >
                    <Icon name="arrow_forward" className="text-[17px]" />
                  </button>
                </div>
              )}

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
          <div ref={kanbanScrollRef} className="w-full overflow-x-auto pb-4 pt-1 scroll-smooth">
            <section
              className={`flex items-start gap-4 ${
                focusMode === 'today'
                  ? 'grid grid-cols-1 md:grid-cols-3 w-full'
                  : focusMode === 'backlog' || focusMode === 'completed'
                    ? 'grid grid-cols-1 max-w-3xl mx-auto w-full'
                    : 'flex-col lg:flex-row lg:flex-nowrap min-w-full'
              }`}
            >
              {visibleColumns.map((column) => {
                const requests = filtered[column.key];

                return (
                  <div
                    key={column.key}
                    className={`flex flex-col gap-3 rounded-2xl bg-surface-container-low/60 p-2.5 ${
                      focusMode === 'backlog' || focusMode === 'completed'
                        ? 'w-full'
                        : focusMode === 'today'
                          ? 'w-full min-w-0'
                          : 'w-full lg:w-72 xl:w-80 lg:min-w-[280px] lg:shrink-0 flex-1'
                    }`}
                  >
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
                        onFulfill={() => openFulfillModal(request)}
                        onHandover={(assigneeId) => assign.mutate({ id: request.id, assigneeId })}
                        onSnooze={() => snooze.mutate(request.id)}
                        onThank={() => thank.mutate(request.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </section>
          </div>
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
                    <th className="px-5 py-3 font-bold text-right">Action</th>
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
                            {request.items && request.items.length > 0 ? (
                              <span className="text-body-sm text-muted">
                                {request.items.map((it) => `${it.name}${it.quantity_asked ? ` (${it.quantity_asked})` : ''}`).join(', ')}
                              </span>
                            ) : request.quantity ? (
                              <span className="text-body-sm text-muted">
                                Asked: {request.quantity}
                                {request.quantity_got ? ` · Got: ${request.quantity_got}` : ''}
                              </span>
                            ) : null}
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
                        <td className="px-5 py-3.5 text-right">
                          {request.status !== 'completed' && (
                            <button
                              type="button"
                              onClick={() => openFulfillModal(request)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg bg-sage-soft px-2.5 py-1 text-xs font-semibold text-secondary hover:bg-forest-soft hover:scale-105 active:scale-95 transition-all shadow-xs mr-2"
                              title="Pick and complete items"
                            >
                              <Icon name="task_alt" className="text-[14px]" />
                              <span>Pick &amp; Complete</span>
                            </button>
                          )}
                          {request.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => thank.mutate(request.id)}
                              disabled={busy}
                              className="inline-flex items-center gap-1 rounded-lg bg-sage-soft px-2.5 py-1 text-xs font-semibold text-secondary hover:bg-forest-soft hover:scale-105 active:scale-95 transition-all shadow-xs"
                              title="Send appreciation"
                            >
                              <Icon name="favorite" className="text-[14px] text-error" />
                              <span>Say Thanks 🙌</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Empty board. The create action is the shell's "Add Request", which is
            on every screen — one action, in one place, not a second one here. */}
        {board.data && filtered && !hasAnyCard && (
          <EmptyState
            title="All caught up"
            description="No pending requests for your family right now. Add one and the right person gets notified."
          />
        )}
      </div>

      {/* Quick add */}
      <Modal
        open={addOpen}
        onClose={closeAddRequest}
        title="Add a request"
        description="List items to pick up and assign to a family member."
        footer={
          <>
            <Button variant="ghost" onClick={closeAddRequest}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={busy || (form.title.trim() === '' && form.items.every((it) => it.name.trim() === ''))}
              onClick={() => create.mutate()}
            >
              {create.isPending ? 'Saving…' : 'Save & notify'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="title">Task / Errand Title</Label>
            <Input
              id="title"
              autoFocus
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="e.g. Grocery Run, Hardware Store, Pharmacy"
            />
            <span className="text-[12px] text-muted">Optional if you list items below; will auto-generate from items.</span>
          </div>

          {/* Multi-Item List Builder */}
          <div className="rounded-2xl border border-outline-variant bg-canvas p-3.5 flex flex-col gap-2.5 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-label-md font-bold text-on-surface flex items-center gap-1.5">
                <Icon name="checklist" className="text-[18px] text-secondary" />
                Items to Pick Up (List)
              </span>
              <button
                type="button"
                onClick={addItemRow}
                className="text-label-sm font-semibold text-secondary hover:underline cursor-pointer flex items-center gap-1"
              >
                <Icon name="add" className="text-[15px]" /> Add Item
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {form.items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-2 w-full min-w-0">
                  <Input
                    placeholder="Item name (e.g. Whole Milk)"
                    value={it.name}
                    onChange={(e) => updateItemRow(idx, 'name', e.target.value)}
                    className="flex-1 min-w-0"
                  />
                  <Input
                    placeholder="Asked Qty (e.g. 2 gal)"
                    value={it.quantity_asked}
                    onChange={(e) => updateItemRow(idx, 'quantity_asked', e.target.value)}
                    className="w-28 sm:w-36 shrink-0 min-w-0"
                  />
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItemRow(idx)}
                      className="p-1 shrink-0 text-muted hover:text-error transition-colors flex items-center justify-center h-9 w-9 rounded-lg hover:bg-surface"
                      title="Remove item"
                    >
                      <Icon name="close" className="text-[18px]" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="store_name">Store / Destination</Label>
              <Input
                id="store_name"
                value={form.store_name}
                onChange={(event) => setForm({ ...form, store_name: event.target.value })}
                placeholder="Trader Joe's, Costco, CVS"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="grocery, utility_bill, rent, etc."
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
              <Label htmlFor="trigger-place">Remind me at</Label>
              <Select
                id="trigger-place"
                value={form.trigger_place_id}
                onChange={(event) =>
                  setForm({
                    ...form,
                    trigger_place_id: event.target.value,
                    trigger_direction: event.target.value
                      ? form.trigger_direction || 'enter'
                      : '',
                  })
                }
              >
                <option value="">Time only</option>
                {placeList.map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
              </Select>
            </div>

            {form.trigger_place_id !== '' && (
              <div>
                <Label htmlFor="trigger-direction">When</Label>
                <Select
                  id="trigger-direction"
                  value={form.trigger_direction || 'enter'}
                  onChange={(event) =>
                    setForm({ ...form, trigger_direction: event.target.value })
                  }
                >
                  <option value="enter">On arriving</option>
                  <option value="exit">On leaving</option>
                </Select>
              </div>
            )}

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

            <div>
              <Label htmlFor="due">Due</Label>
              <Input
                id="due"
                type="datetime-local"
                value={form.due_at}
                onChange={(event) => setForm({ ...form, due_at: event.target.value })}
              />
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
          </div>

          {/* Household Expense / Ledger Charge Link */}
          <div className="rounded-2xl border border-outline-variant/60 bg-surface p-3.5 flex flex-col gap-2">
            <span className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
              <Icon name="account_balance_wallet" className="text-[16px] text-secondary" />
              Household Expense Tracker Link (Optional)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="form-ledger">Charge to Ledger</Label>
                <Select
                  id="form-ledger"
                  value={form.ledger_id}
                  onChange={(e) => setForm({ ...form, ledger_id: e.target.value })}
                >
                  <option value="">Do not charge to a ledger</option>
                  {(ledgersQuery.data ?? []).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.currency})
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="form-amount">Estimated Cost ($)</Label>
                <Input
                  id="form-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 35.00"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* Fulfill / Pick Items & Complete Modal */}
      {fulfillRequest && (
        <Modal
          open
          onClose={() => setFulfillRequest(null)}
          title={`Pick & Fulfill: ${fulfillRequest.title}`}
          description="Confirm what was asked versus what was actually got, and optionally record the expense to your household ledger."
          footer={
            <>
              <Button variant="ghost" onClick={() => setFulfillRequest(null)}>
                Cancel
              </Button>
              <Button disabled={act.isPending} onClick={submitFulfill}>
                {act.isPending ? 'Saving…' : 'Complete & Record'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-outline-variant bg-canvas p-3.5 flex flex-col gap-2.5 overflow-hidden">
              <span className="text-label-md font-bold text-on-surface">Items Picked</span>
              <p className="text-[12px] text-muted">
                Input the quantity you actually got. It can be the same as asked or different.
              </p>

              <div className="flex flex-col gap-2.5">
                {fulfillItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col gap-1 rounded-xl bg-surface p-2.5 border border-outline-variant/60 overflow-hidden">
                    <div className="flex items-center justify-between">
                      {item.quantity_asked !== null && item.quantity_asked !== undefined ? (
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-on-surface text-label-md">
                          <input
                            type="checkbox"
                            checked={item.is_picked ?? true}
                            onChange={(e) => {
                              const updated = [...fulfillItems];
                              updated[idx].is_picked = e.target.checked;
                              setFulfillItems(updated);
                            }}
                            className="rounded text-secondary focus:ring-secondary"
                          />
                          <span>{item.name}</span>
                        </label>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] bg-forest-soft text-secondary px-2 py-0.5 rounded font-bold uppercase tracking-wider">Extra item</span>
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const updated = [...fulfillItems];
                              updated[idx].name = e.target.value;
                              setFulfillItems(updated);
                            }}
                            placeholder="Item name (e.g. Extra Avocado)"
                            className="h-8 text-sm flex-1 min-w-0"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = fulfillItems.filter((_, i) => i !== idx);
                              setFulfillItems(updated);
                            }}
                            className="text-muted hover:text-error p-1"
                            title="Remove extra item"
                          >
                            <Icon name="close" className="text-[16px]" />
                          </button>
                        </div>
                      )}
                      {item.quantity_asked && (
                        <span className="text-xs bg-sage-soft text-secondary px-2 py-0.5 rounded-full font-medium">
                          Asked: {item.quantity_asked}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 w-full min-w-0">
                      <span className="text-xs text-muted w-24 shrink-0 font-medium">Quantity got:</span>
                      <Input
                        value={item.quantity_got ?? ''}
                        onChange={(e) => {
                          const updated = [...fulfillItems];
                          updated[idx].quantity_got = e.target.value;
                          setFulfillItems(updated);
                        }}
                        placeholder="e.g. 2 gal, or 1 box"
                        className="h-9 text-sm flex-1 min-w-0"
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 flex items-center justify-center gap-1.5 text-xs text-secondary border-dashed border-secondary/40 hover:bg-forest-soft/30"
                  onClick={() => {
                    setFulfillItems([
                      ...fulfillItems,
                      { name: '', quantity_asked: null, quantity_got: '1', is_picked: true },
                    ]);
                  }}
                >
                  <Icon name="add" className="text-[16px]" />
                  Add extra grocery / item bought
                </Button>
              </div>
            </div>

            {/* Expense Amount & Ledger */}
            <div className="rounded-2xl border border-outline-variant/60 bg-surface p-3.5 flex flex-col gap-2.5">
              <span className="text-label-sm font-bold text-on-surface flex items-center gap-1.5">
                <Icon name="account_balance_wallet" className="text-[16px] text-secondary" />
                Post to Household Expense Tracker
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="fulfill-amount">Actual Spent Amount ($)</Label>
                  <Input
                    id="fulfill-amount"
                    inputMode="decimal"
                    value={fulfillAmount}
                    onChange={(e) => setFulfillAmount(e.target.value)}
                    placeholder="e.g. 32.50"
                  />
                </div>
                <div>
                  <Label htmlFor="fulfill-ledger">Household Ledger</Label>
                  <Select
                    id="fulfill-ledger"
                    value={fulfillLedgerId}
                    onChange={(e) => setFulfillLedgerId(e.target.value)}
                  >
                    <option value="">None (do not record expense)</option>
                    {(ledgersQuery.data ?? []).map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.currency})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Gap A: Calendar Feed (.ics) Sync Modal */}
      <Modal
        open={calendarModalOpen}
        onClose={() => setCalendarModalOpen(false)}
        title="Shared Family Calendar &amp; External Sync (.ics)"
      >
        <div className="flex flex-col gap-4 p-1">
          <p className="text-xs text-muted leading-relaxed">
            Subscribe to your live household errands and schedule directly in Google Calendar, Apple Calendar, or Microsoft Outlook. Changes made in FairShare automatically sync to your calendar.
          </p>

          {calendarQuery.isLoading ? (
            <div className="p-6 text-center text-xs text-muted">Generating tokenized feed link...</div>
          ) : calendarQuery.data ? (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface">Subscription Feed URL (RFC 5545 iCalendar)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={calendarQuery.data.feed_url}
                    className="h-9 flex-1 rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 font-mono text-[11px] text-on-surface select-all"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void navigator.clipboard.writeText(calendarQuery.data.feed_url);
                      setCalendarCopied(true);
                      setTimeout(() => setCalendarCopied(false), 2000);
                    }}
                  >
                    <Icon name={calendarCopied ? 'check' : 'content_copy'} className="text-[14px]" />
                    {calendarCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs flex flex-col gap-2">
                <span className="font-bold text-secondary flex items-center gap-1.5">
                  <Icon name="sync" className="text-[16px]" />
                  One-Click 1-Tap Subscription
                </span>
                <p className="text-muted text-[11px]">
                  Clicking below registers the live feed with Apple Calendar or your default device calendar client via the WebCal protocol.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    window.location.href = calendarQuery.data.webcal_url;
                  }}
                >
                  <Icon name="calendar_add_on" className="text-[16px]" />
                  Subscribe in Default / Apple Calendar
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setCalendarModalOpen(false)}>
              Close
            </Button>
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
  onFulfill,
  onHandover,
  onSnooze,
  onThank,
}: {
  request: ServiceRequest;
  busy: boolean;
  isMine: boolean;
  members: TenantMember[];
  onAction: (action: string) => void;
  onFulfill?: () => void;
  onHandover: (assigneeId: number) => void;
  onSnooze: () => void;
  onThank?: () => void;
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

      <div className="flex flex-wrap items-start justify-between gap-2 min-w-0">
        <span
          className={`rounded-md px-2 py-0.5 text-label-sm capitalize shrink-0 ${priorityChip[request.priority]}`}
        >
          {chip}
        </span>
        {request.due_at && !isOverdue && (
          <span className="text-label-sm text-muted shrink-0">
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
        className={`text-label-lg font-bold text-on-surface transition-colors group-hover:text-primary break-words min-w-0 ${
          isDone ? 'line-through' : ''
        }`}
      >
        {request.title}
      </h3>

      {/* Items list with dual quantities: asked and got */}
      {request.items && request.items.length > 0 ? (
        <div className="flex flex-col gap-1.5 rounded-xl bg-canvas p-2.5 border border-outline-variant/40 min-w-0 overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Items to Pick ({request.items.length})
          </span>
          <ul className="flex flex-col gap-1.5 min-w-0">
            {request.items.map((it, idx) => (
              <li key={idx} className="flex items-center justify-between gap-1.5 text-body-sm min-w-0">
                <span className="flex items-center gap-1.5 font-medium text-on-surface min-w-0 flex-1 truncate">
                  <Icon
                    name={it.is_picked || isDone ? 'check_box' : 'check_box_outline_blank'}
                    className={`text-[16px] shrink-0 ${it.is_picked || isDone ? 'text-secondary' : 'text-muted'}`}
                  />
                  <span className={`truncate ${it.is_picked || isDone ? 'line-through text-muted' : ''}`}>
                    {it.name}
                  </span>
                </span>
                <span className="text-[12px] text-muted shrink-0 text-right ml-1">
                  {it.quantity_asked ? `${it.quantity_asked}` : ''}
                  {it.quantity_got ? ` · Got: ${it.quantity_got}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        (request.quantity || request.quantity_got) && (
          <p className="truncate text-body-sm text-muted min-w-0" title={request.quantity ?? ''}>
            {request.quantity ? `Asked: ${request.quantity}` : ''}
            {request.quantity_got ? ` · Got: ${request.quantity_got}` : ''}
          </p>
        )
      )}

      {request.amount_minor != null && (
        <p className="flex items-center gap-1.5 text-body-sm font-semibold text-secondary min-w-0 truncate">
          <Icon name="account_balance_wallet" className="text-[15px] shrink-0" />
          <span className="truncate">Expense: {formatMoney(request.amount_minor, 'USD')}</span>
        </p>
      )}

      {request.store_name && (
        <p className="flex items-center gap-1.5 truncate text-body-sm text-muted min-w-0" title={request.store_name}>
          <Icon name="storefront" className="text-[16px] text-primary shrink-0" />
          <span className="truncate">{request.store_name}</span>
        </p>
      )}

      {request.notes && (
        <p className="rounded-xl bg-canvas p-2 text-body-sm italic text-on-surface-variant break-words min-w-0">
          {request.notes}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-canvas pt-2.5 min-w-0">
        <span className="flex items-center gap-2 min-w-0 max-w-[140px] truncate">
          <Avatar name={request.assignee?.name ?? 'Unassigned'} size="sm" />
          <span className="text-label-sm text-on-surface-variant truncate">
            {request.assignee?.name ?? 'Unassigned'}
          </span>
        </span>

        {/* Step Forward / Backward Quick Arrow Controls */}
        <div className="flex items-center gap-1">
          {request.status !== 'pending' && request.status !== 'completed' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('accept')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-sage-soft hover:text-secondary disabled:opacity-40"
              title="Move backward by 1 step"
            >
              <Icon name="arrow_back" className="text-[14px]" />
            </button>
          )}
          {request.status === 'pending' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('accept')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-sage-soft hover:text-secondary disabled:opacity-40"
              title="Move forward to Accepted"
            >
              <Icon name="arrow_forward" className="text-[14px]" />
            </button>
          )}
          {request.status === 'accepted' && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onAction('start')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-sage-soft hover:text-secondary disabled:opacity-40"
              title="Move forward to In Progress"
            >
              <Icon name="arrow_forward" className="text-[14px]" />
            </button>
          )}
          {request.status === 'in_progress' && (
            <button
              type="button"
              disabled={busy}
              onClick={onFulfill ? onFulfill : () => onAction('complete')}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-outline-variant/50 text-on-surface-variant hover:bg-sage-soft hover:text-secondary disabled:opacity-40"
              title="Move forward to Completed"
            >
              <Icon name="arrow_forward" className="text-[14px]" />
            </button>
          )}
        </div>

        {isOpen && (
          <span className="flex items-center gap-1 shrink-0 ml-auto">
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
              <button
                type="button"
                onClick={onFulfill ? onFulfill : () => onAction('complete')}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-sage-soft px-2.5 py-1 text-xs font-semibold text-secondary hover:bg-forest-soft hover:scale-105 active:scale-95 transition-all shadow-xs"
                title={`Pick & Complete ${request.title}`}
              >
                <Icon name="task_alt" className="text-[14px]" />
                <span>Pick &amp; Complete</span>
              </button>
            )}
            <IconAction icon="snooze" label={`Snooze ${request.title}`} disabled={busy} onClick={onSnooze} />
            <HandoverMenu request={request} members={members} disabled={busy} onHandover={onHandover} />
          </span>
        )}

        {isDone && (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-label-sm text-secondary font-semibold">
              <Icon name="check_circle" filled className="text-[16px]" />
              Completed
            </span>
            {onThank && (
              <button
                type="button"
                onClick={onThank}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-lg bg-sage-soft px-2 py-0.5 text-xs font-semibold text-secondary hover:bg-forest-soft hover:scale-105 active:scale-95 transition-all shadow-xs"
                title="Send appreciation"
              >
                <Icon name="favorite" className="text-[13px] text-error" />
                <span>Say Thanks 🙌</span>
              </button>
            )}
          </div>
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
