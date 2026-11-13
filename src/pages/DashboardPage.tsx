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
import { SkeletonCard } from '@/components/ui/skeleton';
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
          description={`Daily task coordination for ${active?.name ?? 'your family'} · ${seatsUsed} of ${seatCap} family members in sync`}
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="primary"
                size="md"
                onClick={openAddRequest}
                className="gap-2 shadow-xs transition-transform hover:scale-[1.02] active:scale-95"
              >
                <Icon name="add" className="text-[18px]" />
                <span>Quick Add Errand</span>
              </Button>
              <Link to="/requests" className="inline-flex">
                <Button
                  variant="outline"
                  size="md"
                  className="gap-2 transition-transform hover:scale-[1.02] active:scale-95"
                >
                  <Icon name="view_kanban" className="text-[18px]" />
                  <span>Open Kanban</span>
                </Button>
              </Link>
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
            ROW 1: Top Operational Pulse Strip (Summary of Software Metrics)
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
          {board.isLoading || essentialsQuery.isLoading || placesQuery.isLoading || ledgersQuery.isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              {/* Metric 1: Active Errands & Chores */}
              <Link to="/requests" className="group flex flex-col h-full w-full">
                <div className="relative flex flex-1 flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2 overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted truncate">
                        Active Errands & Tasks
                      </span>
                      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-on-surface truncate max-w-full">
                          {totalOpenCount}
                        </span>
                        {overdueCount > 0 ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-coral-soft px-2 py-0.5 text-xs font-semibold leading-none text-error">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-error" />
                            </span>
                            {overdueCount} Overdue
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                            {dueTodayCount} Due Today
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs transition-transform duration-300 group-hover:scale-110">
                      <Icon name="view_kanban" className="text-[22px]" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">
                    {completedTodayCount} completed today
                  </span>
                </div>
              </Link>

              {/* Metric 2: Pantry & Safety Stock */}
              <Link to="/requests" className="group flex flex-col h-full w-full">
                <div className="relative flex flex-1 flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2 overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted truncate">
                        Pantry & Staples
                      </span>
                      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-on-surface truncate max-w-full">
                          {essentialsSummary.total}
                        </span>
                        {essentialsSummary.due > 0 ? (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-coral-soft px-2 py-0.5 text-xs font-semibold leading-none text-error">
                            {essentialsSummary.due} Low / Due
                          </span>
                        ) : (
                          <span className="inline-flex shrink-0 items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                            Well Stocked
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary shadow-xs transition-transform duration-300 group-hover:scale-110">
                      <Icon name="inventory_2" className="text-[22px]" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">
                    {essentialsSummary.due > 0 ? 'Restock errands needed' : 'All safety levels green'}
                  </span>
                </div>
              </Link>

              {/* Metric 3: Saved Stores & Geofences */}
              <Link to="/places" className="group flex flex-col h-full w-full">
                <div className="relative flex flex-1 flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2 overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted truncate">
                        Saved Stores & Geofences
                      </span>
                      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-on-surface truncate max-w-full">
                          {places.length}
                        </span>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-surface-container-low px-2 py-0.5 text-xs font-semibold leading-none text-muted">
                          Active Bounds
                        </span>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs transition-transform duration-300 group-hover:scale-110">
                      <Icon name="pin_drop" className="text-[22px]" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">
                    Arrival triggers & store routing
                  </span>
                </div>
              </Link>

              {/* Metric 4: Shared Household Ledgers */}
              <Link to="/money" className="group flex flex-col h-full w-full">
                <div className="relative flex flex-1 flex-col justify-between h-full w-full min-h-[120px] rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2 overflow-hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col min-w-0 flex-1 pr-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-muted truncate">
                        Shared Ledgers & Budget
                      </span>
                      <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                        <span className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight text-on-surface truncate max-w-full">
                          {ledgers.length}
                        </span>
                        <span className="inline-flex shrink-0 items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-secondary">
                          Active
                        </span>
                      </div>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary shadow-xs transition-transform duration-300 group-hover:scale-110">
                      <Icon name="account_balance_wallet" className="text-[22px]" />
                    </div>
                  </div>
                  <span className="mt-2 text-xs text-muted truncate block max-w-full border-t border-outline-variant/20 pt-2">
                    Domestic expenses & shared totals
                  </span>
                </div>
              </Link>
            </>
          )}
        </section>

        {/* -------------------------------------------------------------------
            ROW 2: Active Operations Hub (Tasks List + Operational Widgets)
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left (8 Cols): Today's Active Errands & Chores Hub */}
          <div className="rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-e1 lg:col-span-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-headline-sm font-bold text-on-surface">
                    Today&apos;s Active Errands
                  </h3>
                  <Badge tone={overdueCount > 0 ? 'danger' : 'neutral'}>
                    {displayedTasks.length} Shown
                  </Badge>
                </div>
                <p className="text-body-sm text-muted">
                  Real-time status of domestic chores, assigned owners, and locations
                </p>
              </div>

              {/* Segmented Filter Pills */}
              <div className="flex items-center gap-1 rounded-xl bg-surface-container-low p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setTaskFilter('focus')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    taskFilter === 'focus'
                      ? 'bg-surface text-secondary shadow-xs'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Immediate Focus ({overdueCount + dueTodayCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('my')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    taskFilter === 'my'
                      ? 'bg-surface text-secondary shadow-xs'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Assigned to Me ({assignedToMeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setTaskFilter('completed')}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    taskFilter === 'completed'
                      ? 'bg-surface text-secondary shadow-xs'
                      : 'text-muted hover:text-on-surface'
                  }`}
                >
                  Done Today ({completedTodayCount})
                </button>
              </div>
            </div>

            <div className="pt-4">
              {board.isLoading ? (
                <div className="flex flex-col gap-3 animate-pulse">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-xl px-3 py-3 border border-outline-variant/15"
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                    <Icon name="task_alt" className="text-[28px]" />
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
                <div className="flex flex-col divide-y divide-outline-variant/15">
                  {displayedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="group -mx-2 flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-sage-soft/40"
                    >
                      <div className="flex min-w-0 items-center gap-3.5">
                        <Link
                          to="/requests"
                          title="View task in Kanban"
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-outline-variant/60 bg-surface transition-colors hover:border-secondary hover:text-secondary group-hover:border-secondary"
                        >
                          <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-secondary/40" />
                        </Link>

                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-body-md font-semibold text-on-surface">
                              {task.title}
                            </span>
                            {task.quantity && (
                              <span className="rounded-md bg-surface-container-low px-2 py-0.5 text-label-sm font-medium text-muted">
                                {task.quantity}
                              </span>
                            )}
                            {task.priority === 'urgent' && (
                              <span className="rounded-md bg-coral-soft px-1.5 py-0.5 text-label-sm font-bold text-error">
                                Urgent
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-body-sm text-muted">
                            {task.store_name && (
                              <span className="inline-flex items-center gap-1">
                                <Icon name="storefront" className="text-[14px] text-primary" />
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
                              <span className="inline-flex items-center gap-1 text-success font-medium">
                                <Icon name="check" className="text-[14px]" />
                                Completed
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        {task.assignee ? (
                          <div className="flex items-center gap-1.5 rounded-lg bg-surface-container-low px-2.5 py-1">
                            <Avatar name={task.assignee.name ?? 'Member'} size="sm" />
                            <span className="hidden text-label-sm font-medium text-on-surface sm:inline">
                              {(task.assignee.name ?? 'Member').split(' ')[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-label-sm text-muted">Unassigned</span>
                        )}

                        <Link
                          to="/requests"
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-sage-soft hover:text-on-surface group-hover:opacity-100"
                        >
                          <Icon name="arrow_forward" className="text-[16px]" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Link to Full Kanban */}
            <div className="mt-6 flex items-center justify-between border-t border-outline-variant/15 pt-4 text-xs">
              <span className="text-muted">
                Looking for the full backlog or multi-lane board?
              </span>
              <Link
                to="/requests"
                className="inline-flex items-center gap-1 font-bold text-secondary hover:underline"
              >
                <span>Go to Errand Kanban</span>
                <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>
          </div>

          {/* Right (4 Cols): Operational Summary Widgets */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Widget 1: Pantry & Low-Stock Alert with 1-Tap Errand Creation */}
            <Card className="rounded-3xl p-5 shadow-e1">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-soft text-primary">
                    <Icon name="inventory_2" className="text-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Pantry & Staples</h4>
                    <span className="text-[11px] text-muted">Safety stock thresholds</span>
                  </div>
                </div>
                <Badge tone={lowStockItems.length > 0 ? 'warning' : 'success'}>
                  {lowStockItems.length > 0 ? `${lowStockItems.length} Due` : 'Stocked'}
                </Badge>
              </div>

              <div className="mt-3.5 flex flex-col gap-2.5">
                {essentialsQuery.isLoading ? (
                  <div className="flex flex-col gap-2.5 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-2.5"
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
                  <div className="py-4 text-center">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest-soft text-secondary">
                      <Icon name="done_all" className="text-[18px]" />
                    </span>
                    <p className="mt-1.5 text-xs font-semibold text-on-surface">Pantry is well-stocked</p>
                    <p className="text-[11px] text-muted">No items are below minimum safety levels.</p>
                  </div>
                ) : (
                  lowStockItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-outline-variant/20 bg-surface-container-low p-2.5"
                    >
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate text-xs font-bold text-on-surface">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-muted">
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
            <Card className="rounded-3xl p-5 shadow-e1">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="event_repeat" className="text-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">Standing Chores</h4>
                    <span className="text-[11px] text-muted">Upcoming recurring cadences</span>
                  </div>
                </div>
                <Link
                  to="/recurring"
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  Manage →
                </Link>
              </div>

              <div className="mt-3.5 flex flex-col gap-2">
                {recurringQuery.isLoading ? (
                  <div className="flex flex-col gap-2 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-xl bg-surface-container-low p-2.5 text-xs"
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
                  <div className="py-4 text-center text-xs text-muted">
                    No recurring habits configured yet.
                  </div>
                ) : (
                  recurringRules.slice(0, 3).map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between rounded-xl bg-surface-container-low p-2.5 text-xs"
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
                        <span className="truncate text-[11px] font-medium text-secondary">
                          {(rule.assignee.name ?? 'Member').split(' ')[0]}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>

            {/* Widget 3: Household Sync & Subscription Quotas */}
            <Card className="rounded-3xl p-5 shadow-e1">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-soft text-primary">
                    <Icon name="cottage" className="text-[18px]" />
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-on-surface">
                      {active?.name ?? 'Household'}
                    </h4>
                    <span className="text-[11px] text-muted">
                      {quota.planLabel}
                    </span>
                  </div>
                </div>
                <Link
                  to="/billing"
                  className="text-xs font-bold text-secondary hover:underline"
                >
                  Plan →
                </Link>
              </div>

              {quota.isLoading ? (
                <div className="mt-4 flex flex-col gap-2 animate-pulse">
                  <div className="flex justify-between">
                    <div className="h-3 w-20 rounded bg-forest-soft/50" />
                    <div className="h-3 w-16 rounded bg-forest-soft/30" />
                  </div>
                  <div className="h-2 w-full rounded-full bg-forest-soft/40" />
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-on-surface">Family Seats</span>
                    <span className="text-muted">
                      {seatsUsed} of {seatCap} used
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                    <div
                      className="h-full rounded-full bg-secondary transition-all duration-300"
                      style={{ width: `${seatPercent}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-outline-variant/15 pt-3 text-xs text-muted">
                <Link to="/members" className="font-semibold text-secondary hover:underline">
                  Manage Family Seats →
                </Link>
                <Link to="/billing" className="font-semibold text-muted hover:text-on-surface">
                  Tier Limits
                </Link>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
