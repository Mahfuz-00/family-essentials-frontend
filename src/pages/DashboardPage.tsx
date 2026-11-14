import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { useQuota } from '@/hooks/useQuota';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useUiStore } from '@/stores/ui';
import type {
  EssentialsResponse,
  Ledger,
  Place,
  RecurringRule,
  RequestBoard,
  ServiceRequest,
} from '@/types';

type TaskFilterTab = 'focus' | 'my' | 'completed';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const active = useTenantStore((state) => state.active);
  const openAddRequest = useUiStore((state) => state.openAddRequest);

  const [taskFilter, setTaskFilter] = useState<TaskFilterTab>('focus');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const quota = useQuota({ enabled: user?.is_platform_admin !== true });

  // 1. Board and Errands Query
  const board = useQuery({
    queryKey: ['requests', 'board'],
    queryFn: async () => (await api.get<RequestBoard>('/v1/requests/board')).data,
  });

  // 2. Saved Places and Geofences Query
  const placesQuery = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  // 3. Recurring Staples Query
  const recurringQuery = useQuery({
    queryKey: ['recurring-rules'],
    queryFn: async () =>
      (await api.get<{ data: RecurringRule[] }>('/v1/recurring-rules')).data.data,
  });

  // 4. Pantry Essentials Query
  const essentialsQuery = useQuery({
    queryKey: ['essentials'],
    queryFn: async () => (await api.get<EssentialsResponse>('/v1/essentials')).data,
  });

  // 5. Shared Ledgers Query
  const ledgersQuery = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  // 1-Tap Replenish Errand Mutation
  const createRestockErrand = useMutation({
    mutationFn: async (essentialId: number) => {
      return (await api.post(`/v1/essentials/${essentialId}/create-errand`)).data;
    },
    onSuccess: (data: any) => {
      setNotice(data.message ?? 'Restock errand added to household board!');
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['requests', 'board'] });
      void queryClient.invalidateQueries({ queryKey: ['essentials'] });
    },
    onError: (err: any) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const counts = board.data?.counts;
  const overdueCount = counts?.overdue ?? 0;
  const dueTodayCount = counts?.due_today ?? 0;
  const assignedToMeCount = counts?.assigned_to_me ?? 0;
  const backlogCount = counts?.backlog ?? 0;
  const completedTodayCount = counts?.completed_today ?? 0;
  const totalOpenCount = overdueCount + dueTodayCount + backlogCount;

  const places = placesQuery.data ?? [];
  const recurringRules = recurringQuery.data ?? [];
  const essentials = essentialsQuery.data?.data ?? [];
  const essentialsSummary = essentialsQuery.data?.summary ?? {
    total: essentials.length,
    due: essentials.filter((e) => e.is_due || e.stock_level <= e.threshold).length,
    safety_stock: 0,
    cadence: 0,
  };
  const lowStockItems = useMemo(() => {
    return essentials
      .filter((e) => e.is_due || e.stock_level <= e.threshold)
      .slice(0, 4);
  }, [essentials]);

  const ledgers = ledgersQuery.data ?? [];

  const seatsUsed = quota.data?.usage.members ?? active?.member_count ?? 1;
  const seatCap = quota.seatCap ?? 5;
  const seatPercent = Math.min(100, Math.round((seatsUsed / seatCap) * 100));

  // Filter tasks based on selected tab
  const displayedTasks = useMemo(() => {
    if (!board.data) return [];
    if (taskFilter === 'focus') {
      const map = new Map<number, ServiceRequest>();
      for (const item of board.data.overdue ?? []) map.set(item.id, item);
      for (const item of board.data.due_today ?? []) map.set(item.id, item);
      return Array.from(map.values()).slice(0, 6);
    }
    if (taskFilter === 'my') {
      return (board.data.assigned_to_me ?? []).slice(0, 6);
    }
    if (taskFilter === 'completed') {
      return (board.data.completed_today ?? []).slice(0, 6);
    }
    return [];
  }, [board.data, taskFilter]);

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Page Header as Single Unified Command Hub */}
        <PageHeader
          title="Activities Hub"
          titleSize="headline"
          description={`Daily task coordination for ${active?.name ?? 'your family'} · ${seatsUsed} of ${seatCap} family members in sync`}
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/requests"
                className="inline-flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-2.5 text-label-md font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:bg-forest-soft active:translate-y-0 active:shadow-[var(--shadow-inset-sm)]"
              >
                <Icon name="view_kanban" className="text-[18px]" />
                <span>Open Kanban</span>
              </Link>
              <button
                type="button"
                onClick={openAddRequest}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-label-md font-bold text-on-primary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                <Icon name="add" className="text-[18px]" />
                <span>Quick Add Errand</span>
              </button>
            </div>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {board.isError && (
          <QueryError
            error={board.error}
            what="today's operational summary"
            onRetry={() => void board.refetch()}
          />
        )}

        {/* -------------------------------------------------------------------
            ROW 1: Top Operational Pulse Strip (Unified StatCards)
        -------------------------------------------------------------------- */}
        {board.isLoading ? (
          <StatGridSkeleton count={4} />
        ) : (
          <StatGrid count={4}>
            <StatCard
              to="/requests"
              title="Active Errands & Tasks"
              value={totalOpenCount}
              icon="view_kanban"
              tone="forest"
              highlight={
                overdueCount > 0 ? (
                  <StatHighlight tone="danger" pulse>
                    {overdueCount} Overdue
                  </StatHighlight>
                ) : (
                  <StatHighlight tone="success">{dueTodayCount} Due Today</StatHighlight>
                )
              }
            />
            <StatCard
              to="/pantry"
              title="Pantry & Staples"
              value={essentialsQuery.isLoading ? '—' : essentialsSummary.total}
              icon="inventory_2"
              tone={essentialsSummary.due > 0 ? 'coral' : 'sage'}
              highlight={
                essentialsSummary.due > 0 ? (
                  <StatHighlight tone="danger">{essentialsSummary.due} Low / Due</StatHighlight>
                ) : (
                  <StatHighlight tone="success">Well Stocked</StatHighlight>
                )
              }
            />
            <StatCard
              to="/places"
              title="Saved Stores & Geofences"
              value={placesQuery.isLoading ? '—' : places.length}
              icon="pin_drop"
              tone="forest"
              highlight={<StatHighlight tone="neutral">Active Bounds</StatHighlight>}
            />
            <StatCard
              to="/money"
              title="Shared Ledgers & Budget"
              value={ledgersQuery.isLoading ? '—' : ledgers.length}
              icon="account_balance_wallet"
              tone="sage"
              highlight={<StatHighlight tone="success">Active</StatHighlight>}
            />
          </StatGrid>
        )}

        {/* -------------------------------------------------------------------
            ROW 2: Active Operations Hub (Tasks List + Operational Widgets)
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left (8 Cols): Today's Active Errands & Chores Hub */}
          <Card
            className="stagger-item flex flex-col gap-5 p-6 lg:col-span-8"
            style={{ '--sibling-index': 4 } as React.CSSProperties}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="task_alt" className="text-[20px]" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-title-md font-bold text-on-surface">
                      Today&apos;s Active Errands
                    </h2>
                    <Badge tone={overdueCount > 0 ? 'danger' : 'neutral'}>
                      {displayedTasks.length} Shown
                    </Badge>
                  </div>
                  <p className="text-xs text-muted">
                    Real-time status of domestic chores, assigned owners, and locations
                  </p>
                </div>
              </div>

              {/* Segmented Filter Pills (Sunken Clay Track) */}
              <div className="flex shrink-0 flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 text-xs shadow-[var(--shadow-inset)]">
                <button
                  type="button"
                  onClick={() => setTaskFilter('focus')}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 font-semibold transition-all duration-300 ease-[var(--spring-easing)] ${
                    taskFilter === 'focus'
                      ? 'bg-surface text-secondary shadow-[var(--shadow-clay-sm)]'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Immediate Focus ({overdueCount + dueTodayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('my')}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 font-semibold transition-all duration-300 ease-[var(--spring-easing)] ${
                    taskFilter === 'my'
                      ? 'bg-surface text-secondary shadow-[var(--shadow-clay-sm)]'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Assigned to Me ({assignedToMeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`cursor-pointer whitespace-nowrap rounded-xl px-3 py-1.5 font-semibold transition-all duration-300 ease-[var(--spring-easing)] ${
                    taskFilter === 'completed'
                      ? 'bg-surface text-secondary shadow-[var(--shadow-clay-sm)]'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Done Today ({completedTodayCount})
                </button>
              </div>
            </div>

            <div>
              {board.isLoading ? (
                <div className="flex flex-col gap-2.5 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-6 w-6 rounded-full bg-forest-soft/50" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-44 rounded bg-forest-soft/50" />
                          <div className="h-3 w-28 rounded bg-forest-soft/30" />
                        </div>
                      </div>
                      <div className="h-6 w-16 rounded-lg bg-forest-soft/40" />
                    </div>
                  ))}
                </div>
              ) : displayedTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl bg-canvas py-12 text-center shadow-[var(--shadow-inset-sm)]">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-clay-sm)]">
                    <Icon name="task_alt" className="text-[26px]" />
                  </span>
                  <span className="mt-3 text-body-md font-bold text-on-surface">
                    {taskFilter === 'completed'
                      ? 'No tasks completed yet today'
                      : 'All caught up in this view!'}
                  </span>
                  <p className="mt-1 text-body-sm text-muted max-w-sm">
                    {taskFilter === 'completed'
                      ? 'Completed chores and groceries will show here with appreciation records.'
                      : 'No pending errands requiring attention. You can add a new household need anytime.'}
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    onClick={openAddRequest}
                    className="mt-4 gap-1.5"
                  >
                    <Icon name="add" className="text-[18px]" />
                    <span>Add Household Request</span>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {displayedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group flex items-center justify-between rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:translate-x-0.5 hover:bg-surface-container-low"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <Link
                          to="/requests"
                          title="View task in Kanban"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant/60 bg-surface shadow-[var(--shadow-clay-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:border-secondary hover:scale-110 group-hover:border-secondary"
                        >
                          <span className="h-2 w-2 rounded-full bg-transparent transition-colors group-hover:bg-secondary/50" />
                        </Link>

                        <div className="flex min-w-0 flex-col gap-0.5">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-on-surface">
                              {task.title}
                            </span>
                            {task.quantity && (
                              <span className="rounded-lg bg-surface px-2 py-0.5 text-label-sm font-semibold text-muted shadow-[var(--shadow-clay-sm)]">
                                {task.quantity}
                              </span>
                            )}
                            {task.priority === 'urgent' && (
                              <Badge tone="danger">Urgent</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                            {task.store_name && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="storefront" className="text-[14px] text-secondary" />
                                <span>{task.store_name}</span>
                              </span>
                            )}
                            {task.due_at && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="schedule" className="text-[14px]" />
                                <span>
                                  {new Date(task.due_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </span>
                            )}
                            {task.status === 'completed' && (
                              <span className="inline-flex items-center gap-1 text-secondary font-semibold">
                                <Icon name="check" className="text-[14px]" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2.5">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5 rounded-xl bg-surface px-2.5 py-1 shadow-[var(--shadow-clay-sm)]">
                            <Avatar name={task.assignee.name ?? 'Member'} size="sm" />
                            <span className="hidden text-label-sm font-semibold text-on-surface sm:inline">
                              {(task.assignee.name ?? 'Member').split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="rounded-xl bg-surface px-2.5 py-1 text-label-sm font-medium text-muted shadow-[var(--shadow-clay-sm)]">
                            Unassigned
                          </span>
                        )}

                        <Link
                          to="/requests"
                          className="flex h-7 w-7 items-center justify-center rounded-xl bg-surface text-muted opacity-0 shadow-[var(--shadow-clay-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:text-secondary group-hover:translate-x-0.5 group-hover:opacity-100"
                        >
                          <Icon name="arrow_forward" className="text-[15px]" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Link to Full Kanban */}
            <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs">
              <span className="text-muted">
                Looking for the full backlog or multi-lane board?
              </span>
              <Link
                to="/requests"
                className="inline-flex items-center gap-1 font-semibold text-secondary hover:underline"
              >
                <span>Go to Errand Kanban &rarr;</span>
              </Link>
            </div>
          </Card>

          {/* Right (4 Cols): Operational Summary Widgets */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Widget 1: Pantry & Low-Stock Alert with 1-Tap Errand Creation */}
            <Card
              className="stagger-item flex flex-col gap-4 p-6"
              style={{ '--sibling-index': 5 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                    <Icon name="inventory_2" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Pantry &amp; Staples</h4>
                    <span className="text-xs text-muted">Safety stock thresholds</span>
                  </div>
                </div>
                <Badge tone={lowStockItems.length > 0 ? 'warning' : 'success'}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} Due` : 'Stocked'}
                </Badge>
              </div>

              <div className="flex flex-col gap-2.5">
                {essentialsQuery.isLoading ? (
                  <div className="flex flex-col gap-2.5 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl bg-canvas p-3 shadow-[var(--shadow-inset-sm)]"
                      >
                        <div className="space-y-1.5 flex-1 mr-2">
                          <div className="h-3.5 w-24 rounded bg-forest-soft/50" />
                          <div className="h-3 w-32 rounded bg-forest-soft/30" />
                        </div>
                        <div className="h-7 w-16 rounded bg-forest-soft/40" />
                      </div>
                    ))}
                  </div>
                ) : lowStockItems.length === 0 ? (
                  <div className="rounded-2xl bg-canvas py-4 text-center shadow-[var(--shadow-inset-sm)]">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="done_all" className="text-[18px]" />
                    </span>
                    <p className="mt-1.5 text-xs font-semibold text-on-surface">Pantry is well-stocked</p>
                    <p className="text-[11px] text-muted">No items are below minimum safety levels.</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-canvas p-3 shadow-[var(--shadow-inset-sm)] transition-transform duration-300 ease-[var(--spring-easing)] hover:translate-x-0.5"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-on-surface">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-muted tabular-nums">
                          Stock: {item.stock_level} (Safety: {item.threshold})
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="soft"
                        disabled={createRestockErrand.isPending}
                        onClick={() => createRestockErrand.mutate(item.id)}
                        className="h-7 text-[11px] px-2.5"
                      >
                        + Errand
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Widget 2: Upcoming Recurring Chores */}
            <Card
              className="stagger-item flex flex-col gap-4 p-6"
              style={{ '--sibling-index': 6 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                    <Icon name="event_repeat" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Standing Chores</h4>
                    <span className="text-xs text-muted">Upcoming recurring cadences</span>
                  </div>
                </div>
                <Link
                  to="/recurring"
                  className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all"
                >
                  Manage &rarr;
                </Link>
              </div>

              <div className="flex flex-col gap-2.5">
                {recurringQuery.isLoading ? (
                  <div className="flex flex-col gap-2.5 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-2xl bg-canvas p-3 text-xs shadow-[var(--shadow-inset-sm)]"
                      >
                        <div className="space-y-1.5 flex-1 mr-2">
                          <div className="h-3.5 w-28 rounded bg-forest-soft/50" />
                          <div className="h-3 w-20 rounded bg-forest-soft/30" />
                        </div>
                        <div className="h-3 w-12 rounded bg-forest-soft/40" />
                      </div>
                    ))}
                  </div>
                ) : recurringRules.length === 0 ? (
                  <div className="rounded-2xl bg-canvas py-4 text-center text-xs text-muted shadow-[var(--shadow-inset-sm)]">
                    No recurring habits configured yet.
                  </div>
                ) : (
                  recurringRules.slice(0, 3).map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-2xl bg-canvas p-3 text-xs shadow-[var(--shadow-inset-sm)] transition-transform duration-300 ease-[var(--spring-easing)] hover:translate-x-0.5"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-on-surface">
                          {rule.title}
                        </span>
                        <span className="text-[11px] capitalize text-muted">
                          {rule.cadence} · Next: {rule.next_run_on ?? 'Scheduled'}
                        </span>
                      </div>
                      {rule.assignee && (
                        <Badge tone="primary">
                          {(rule.assignee.name ?? 'Member').split(' ')[0]}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Widget 3: Household Sync & Subscription Quotas */}
            <Card
              className="stagger-item flex flex-col gap-4 p-6"
              style={{ '--sibling-index': 7 } as React.CSSProperties}
            >
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                    <Icon name="cottage" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">
                      {active?.name ?? 'Household'}
                    </h4>
                    <span className="text-xs text-muted">
                      {quota.planLabel}
                    </span>
                  </div>
                </div>
                <Link
                  to="/billing"
                  className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all"
                >
                  Plan &rarr;
                </Link>
              </div>

              {quota.isLoading ? (
                <div className="flex flex-col gap-2 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-forest-soft/50" />
                    <div className="h-3 w-16 rounded bg-forest-soft/30" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-forest-soft/40" />
                </div>
              ) : (
                <div className="rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)] flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">Family Seats</span>
                    <span className="font-bold text-muted tabular-nums">
                      {seatsUsed} of {seatCap} used
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="animate-bar-x h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                      style={{ width: `${seatPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3 text-xs text-muted">
                <Link to="/members" className="font-semibold text-secondary hover:underline">
                  Manage Family Seats &rarr;
                </Link>
                <Link to="/billing" className="font-medium text-muted hover:text-on-surface transition-colors">
                  Tier Limits &rarr;
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
