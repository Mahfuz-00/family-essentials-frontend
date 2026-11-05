import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useQuota } from '@/hooks/useQuota';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useUiStore } from '@/stores/ui';
import type { RequestBoard, ServiceRequest } from '@/types';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const active = useTenantStore((state) => state.active);
  const openAddRequest = useUiStore((state) => state.openAddRequest);

  const quota = useQuota({ enabled: user?.is_platform_admin !== true });

  const board = useQuery({
    queryKey: ['requests', 'board'],
    queryFn: async () => (await api.get<RequestBoard>('/v1/requests/board')).data,
  });

  const counts = board.data?.counts;

  // Filter prioritized items for today (overdue, due today, assigned to me)
  const todayTasks = useMemo(() => {
    if (!board.data) return [];
    const map = new Map<number, ServiceRequest>();
    for (const item of board.data.overdue ?? []) {
      map.set(item.id, item);
    }
    for (const item of board.data.due_today ?? []) {
      map.set(item.id, item);
    }
    for (const item of board.data.assigned_to_me ?? []) {
      map.set(item.id, item);
    }
    return Array.from(map.values()).slice(0, 5);
  }, [board.data]);

  const overdueCount = counts?.overdue ?? 0;
  const dueTodayCount = counts?.due_today ?? 0;
  const assignedToMeCount = counts?.assigned_to_me ?? 0;
  const completedTodayCount = counts?.completed_today ?? 0;

  const seatsUsed = quota.data?.usage.members ?? active?.member_count ?? 1;
  const seatCap = quota.seatCap ?? 5;
  const seatPercent = Math.min(100, Math.round((seatsUsed / seatCap) * 100));

  const nextUrgentTask = board.data?.overdue?.[0] ?? board.data?.due_today?.[0];

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Page Header with Breadcrumb & Action Controls */}
        <PageHeader
          eyebrow={
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-secondary" />
              </span>
              <span className="text-xs font-semibold text-secondary">{active?.name ?? 'Household'} · Live Real-time Sync</span>
            </div>
          }
          title="Today's Household Overview"
          description={`${quota.planLabel} · ${seatsUsed} of ${seatCap} family members in sync`}
          actions={
            <div className="flex items-center gap-2.5">
              <Link to="/requests" className="inline-flex">
                <Button variant="primary" size="md" className="gap-2 shadow-sm transition-transform hover:scale-[1.02] active:scale-95">
                  <Icon name="view_kanban" className="text-[18px]" />
                  <span>Open Kanban</span>
                </Button>
              </Link>
              <button
                type="button"
                onClick={openAddRequest}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sage-soft px-3.5 text-xs font-semibold text-secondary transition-all hover:bg-forest-soft hover:scale-[1.02] active:scale-95 shadow-xs"
              >
                <Icon name="add" className="text-[18px]" />
                <span>Quick Add</span>
              </button>
            </div>
          }
        />

        {board.isError && (
          <QueryError
            error={board.error}
            what="today's numbers"
            onRetry={() => void board.refetch()}
          />
        )}

        {/* -------------------------------------------------------------------
            ROW 1: Floating Metric Cards with Motion & Squircles
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {board.isLoading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              {/* Card 1: Overdue Attention */}
              <Link to="/requests" className="group block">
                <div className="relative flex min-h-[104px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Overdue Errands
                    </span>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight leading-none ${overdueCount > 0 ? 'text-error' : 'text-on-surface'}`}>
                        {overdueCount}
                      </span>
                      {overdueCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-coral-soft px-2 py-0.5 text-xs font-semibold leading-none text-error">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-error" />
                          </span>
                          Needs Action
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                          All Clear
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-error to-tertiary text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon name="warning" className="text-[20px]" />
                  </div>
                </div>
              </Link>

              {/* Card 2: Due Today */}
              <Link to="/requests" className="group block">
                <div className="relative flex min-h-[104px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Due Today
                    </span>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                        {dueTodayCount}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-sage-soft px-2 py-0.5 text-xs font-semibold leading-none text-primary">
                        Scheduled
                      </span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-warning to-amber-600 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon name="schedule" className="text-[20px]" />
                  </div>
                </div>
              </Link>

              {/* Card 3: Assigned to Me */}
              <Link to="/requests" className="group block">
                <div className="relative flex min-h-[104px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Assigned to Me
                    </span>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-secondary">
                        {assignedToMeCount}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-secondary">
                        My Tasks
                      </span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-primary text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon name="assignment_ind" className="text-[20px]" />
                  </div>
                </div>
              </Link>

              {/* Card 4: Completed Today */}
              <Link to="/requests" className="group block">
                <div className="relative flex min-h-[104px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Completed Today
                    </span>
                    <div className="mt-2 flex items-center gap-2.5">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                        {completedTodayCount}
                      </span>
                      <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                        Done
                      </span>
                    </div>
                  </div>
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-success to-emerald-700 text-white shadow-sm transition-transform duration-300 group-hover:scale-110">
                    <Icon name="task_alt" className="text-[20px]" />
                  </div>
                </div>
              </Link>
            </>
          )}
        </section>

        {/* -------------------------------------------------------------------
            ROW 2: Purity UI Style Featured Hero Banner + Urgent Focus Widget
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: "Built for Family Logistics" Hero Feature Card (Purity UI style) */}
          <div className="relative overflow-hidden rounded-3xl border border-secondary/20 bg-gradient-to-br from-surface via-forest-soft/30 to-sage-soft/50 p-6 shadow-e1 lg:col-span-7 sm:p-8">
            <div className="relative z-10 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center gap-2 text-label-sm font-bold uppercase tracking-wider text-secondary">
                  <span>Household Live Sync</span>
                  <span>•</span>
                  <span>{active?.name ?? 'Family Workspace'}</span>
                </div>

                <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface leading-snug">
                  Domestic Coordination Without the Mental Load
                </h2>

                <p className="mt-2.5 max-w-xl text-body-md text-on-surface-variant leading-relaxed">
                  From grocery runs and urgent prescriptions to automated recurring staples, Family Essentials keeps everyone aligned with single named ownership and store geofencing.
                </p>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Link
                  to="/requests"
                  className="inline-flex items-center gap-1.5 text-label-md font-bold text-secondary transition-transform hover:translate-x-1"
                >
                  <span>Open Errand Kanban</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>

                <span className="text-muted">•</span>

                <Link
                  to="/places"
                  className="inline-flex items-center gap-1.5 text-label-md font-semibold text-on-surface-variant hover:text-secondary"
                >
                  <span>Store Geofences</span>
                </Link>

                <span className="text-muted">•</span>

                <Link
                  to="/recurring"
                  className="inline-flex items-center gap-1.5 text-label-md font-semibold text-on-surface-variant hover:text-secondary"
                >
                  <span>Recurring Staples</span>
                </Link>
              </div>
            </div>

            {/* Decorative background element */}
            <div className="pointer-events-none absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-secondary/5 blur-2xl" />
          </div>

          {/* Right: Urgent Priority Task Widget (Purity UI "Work with the rockets" card style) */}
          <div className="relative overflow-hidden rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-e1 lg:col-span-5 flex flex-col justify-between transition-all duration-300 hover:shadow-e2">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  {nextUrgentTask?.priority === 'urgent' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${nextUrgentTask?.priority === 'urgent' ? 'bg-error' : 'bg-secondary'}`} />
                </span>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Immediate Priority
                </h3>
              </div>
              {nextUrgentTask ? (
                <Badge tone={nextUrgentTask.priority === 'urgent' ? 'danger' : 'warning'}>
                  {nextUrgentTask.priority.toUpperCase()}
                </Badge>
              ) : (
                <Badge tone="success">ALL CLEAR</Badge>
              )}
            </div>

            {nextUrgentTask ? (
              <div className="my-4 flex flex-col gap-2">
                <span className="text-headline-sm font-bold text-on-surface">
                  {nextUrgentTask.title}
                </span>
                <div className="flex flex-wrap items-center gap-2 text-body-sm text-muted">
                  {nextUrgentTask.store_name && (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <Icon name="storefront" className="text-[14px]" />
                      {nextUrgentTask.store_name}
                    </span>
                  )}
                  {nextUrgentTask.assignee?.name && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="person" className="text-[14px]" />
                      {nextUrgentTask.assignee.name}
                    </span>
                  )}
                  {nextUrgentTask.due_at && (
                    <span className="inline-flex items-center gap-1 text-error font-medium">
                      <Icon name="schedule" className="text-[14px]" />
                      {new Date(nextUrgentTask.due_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2.5">
                  <Link
                    to="/requests"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-label-md font-bold text-white shadow-xs hover:bg-primary transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <span>View &amp; Check Off</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Link>

                  <Link
                    to="/requests"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-secondary/30 bg-forest-soft px-3.5 py-2 text-label-md font-bold text-secondary shadow-xs hover:bg-secondary hover:text-white transition-all active:scale-95"
                  >
                    <Icon name="phone" className="text-[16px]" />
                    <span>Call {nextUrgentTask.assignee?.name ? nextUrgentTask.assignee.name.split(' ')[0] : 'Assignee'}</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="my-6 flex flex-col items-center justify-center text-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="check_circle" className="text-[24px]" />
                </span>
                <span className="mt-2 text-body-md font-bold text-on-surface">All caught up</span>
                <p className="text-body-sm text-muted">No urgent tasks or overdue chores pending right now.</p>
              </div>
            )}

            {/* Micro status strip */}
            <div className="border-t border-outline-variant/15 pt-3 flex items-center justify-between text-xs text-muted">
              <span>Sync status: Active</span>
              <span className="text-secondary font-medium">Auto-refreshed</span>
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------------
            ROW 3: Purity UI Style "Active Tasks" List + Household Capacity Gauge
        -------------------------------------------------------------------- */}
        <section className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Left (8 Cols): Today's Active Tasks Table / List */}
          <div className="rounded-3xl border border-outline-variant/30 bg-surface p-6 shadow-e1 lg:col-span-8">
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Today&apos;s Active Errands
                </h3>
                <p className="text-body-sm text-muted">
                  High-priority tasks scheduled for your family today
                </p>
              </div>

              <Link
                to="/requests"
                className="flex items-center gap-1 text-label-md font-bold text-secondary hover:underline"
              >
                <span>View All In Kanban</span>
                <Icon name="arrow_forward" className="text-[14px]" />
              </Link>
            </div>

            <div className="pt-4">
              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                    <Icon name="task_alt" className="text-[28px]" />
                  </span>
                  <span className="mt-3 text-body-md font-bold text-on-surface">No pending tasks today</span>
                  <p className="mt-1 text-body-sm text-muted">Enjoy your day or add a new household need.</p>
                  <button
                    type="button"
                    onClick={openAddRequest}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-label-md font-bold text-white shadow-xs hover:bg-primary"
                  >
                    <Icon name="add" className="text-[18px]" />
                    <span>Add Request</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-outline-variant/15">
                  {todayTasks.map((task) => (
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
                          <span className="h-2 w-2 rounded-full bg-transparent group-hover:bg-secondary/20" />
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

            {/* Purity UI Bottom Summary Strip */}
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 border-t border-outline-variant/15 pt-5 text-center">
              <div>
                <span className="text-xs uppercase text-muted font-bold tracking-wider">Total Items</span>
                <p className="mt-1 text-lg font-extrabold text-on-surface">
                  {(board.data?.overdue?.length ?? 0) + (board.data?.due_today?.length ?? 0) + (board.data?.assigned_to_me?.length ?? 0) + (board.data?.backlog?.length ?? 0)}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted font-bold tracking-wider">Stores Active</span>
                <p className="mt-1 text-lg font-extrabold text-primary">
                  {quota.data?.usage.places ?? 2}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted font-bold tracking-wider">Seats In Sync</span>
                <p className="mt-1 text-lg font-extrabold text-secondary">
                  {seatsUsed} / {seatCap}
                </p>
              </div>
              <div>
                <span className="text-xs uppercase text-muted font-bold tracking-wider">Phone Calling</span>
                <p className="mt-1 text-base font-extrabold text-on-surface flex items-center justify-center gap-1">
                  <Icon name="phone" className="text-[15px] text-primary" />
                  <span>Direct Native</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right (4 Cols): Household Capacity & Quota (Purity UI "Orders overview" card style) */}
          <div className="flex flex-col gap-6 lg:col-span-4">
            {/* Household Capacity Card */}
            <Card className="rounded-3xl p-6 shadow-e1">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
                    <Icon name="cottage" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-surface">
                      {active?.name ?? 'Household'}
                    </h3>
                    <span className="text-label-sm text-muted">
                      {quota.planLabel}
                    </span>
                  </div>
                </div>
                {active && (
                  <Badge tone={active.status === 'suspended' ? 'danger' : 'success'}>
                    {active.status}
                  </Badge>
                )}
              </div>

              {/* Seat Capacity Gauge */}
              <div className="mt-5 flex flex-col gap-2">
                <div className="flex items-center justify-between text-label-sm">
                  <span className="font-semibold text-on-surface">Family Member Seats</span>
                  <span className="text-muted font-medium">
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

              {/* Direct Fast Navigation Links */}
              <div className="mt-6 flex flex-col gap-1 border-t border-outline-variant/15 pt-4">
                <Link
                  to="/requests"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-body-md font-medium text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="shopping_bag" className="text-[18px] text-primary" />
                    <span>Shopping Mode &amp; Pantry</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-muted" />
                </Link>

                <Link
                  to="/places"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-body-md font-medium text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="pin_drop" className="text-[18px] text-primary" />
                    <span>Saved Stores &amp; Geofences</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-muted" />
                </Link>

                <Link
                  to="/recurring"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-body-md font-medium text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="event_repeat" className="text-[18px] text-primary" />
                    <span>Recurring Staples</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-muted" />
                </Link>

                <Link
                  to="/members"
                  className="flex items-center justify-between rounded-xl px-3 py-2 text-body-md font-medium text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
                >
                  <span className="flex items-center gap-2.5">
                    <Icon name="group" className="text-[18px] text-primary" />
                    <span>Family Roles &amp; Invites</span>
                  </span>
                  <Icon name="chevron_right" className="text-[16px] text-muted" />
                </Link>
              </div>
            </Card>

            {/* Profile Snapshot Card */}
            <div className="flex items-center justify-between rounded-3xl border border-outline-variant/30 bg-surface p-4.5 shadow-e1">
              <div className="flex items-center gap-3">
                <Avatar name={user?.name ?? 'User'} size="md" />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-label-lg font-bold text-on-surface">
                    {user?.name}
                  </span>
                  <span className="truncate text-body-sm text-muted">
                    {user?.email}
                  </span>
                </div>
              </div>
              <Link
                to="/settings"
                title="Account Settings"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
              >
                <Icon name="tune" className="text-[18px]" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
