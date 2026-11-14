import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { api } from '@/lib/api';

interface BoardPayload {
  overdue: Array<{ id: number; title: string; assignee?: { name: string } }>;
  due_today: Array<{ id: number; title: string; store_name?: string; assignee?: { name: string } }>;
  open_count?: number;
}

interface FinancialSnapshot {
  currency: string;
  net_worth_minor: number;
  total_assets_minor: number;
  total_liabilities_minor: number;
  taxes_pending_count: number;
  taxes_pending_minor: number;
  active_goals_count: number;
  monthly_budget_minor: number;
  monthly_spend_minor: number;
}

interface EssentialItem {
  id: number;
  name: string;
  in_stock: boolean;
  alert_threshold?: number;
  current_quantity?: number;
}

import { formatMoney as formatMoneyGlobal } from '@/lib/money';

function formatMoney(minor: number, currency: string = 'BDT'): string {
  return formatMoneyGlobal(minor, currency);
}

export function HomeOverviewPage() {
  const [toast, setToast] = useState<string | null>(null);

  const boardQuery = useQuery({
    queryKey: ['requests-board-summary'],
    queryFn: async () => {
      const { data } = await api.get('/v1/requests/board');
      return data as BoardPayload;
    },
  });

  const financesQuery = useQuery({
    queryKey: ['finances-overview-summary'],
    queryFn: async () => {
      try {
        const res = await api.get('/v1/finances/overview');
        const raw = res.data?.data ?? res.data ?? {};
        return {
          ...raw,
          net_worth_minor: Number(raw?.net_worth_minor ?? 0),
          total_assets_minor: Number(raw?.total_assets_minor ?? 0),
          total_liabilities_minor: Number(raw?.total_liabilities_minor ?? 0),
          taxes_pending_minor: Number(raw?.taxes?.pending_minor ?? raw?.taxes_pending_minor ?? 0),
          taxes_pending_count: Number(raw?.taxes?.pending_count ?? raw?.taxes_pending_count ?? 0),
          active_goals_count: Number(raw?.goals?.active_count ?? raw?.active_goals_count ?? 0),
          monthly_budget_minor: Number(raw?.budget?.monthly_budget_minor ?? raw?.monthly_budget_minor ?? 0),
          monthly_spend_minor: Number(raw?.budget?.monthly_spend_minor ?? raw?.monthly_spend_minor ?? 0),
        } as FinancialSnapshot;
      } catch {
        return null;
      }
    },
  });

  const essentialsQuery = useQuery({
    queryKey: ['essentials-pantry-summary'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/v1/essentials');
        const list = Array.isArray(data) ? data : data?.data ?? [];
        return list as EssentialItem[];
      } catch {
        return [] as EssentialItem[];
      }
    },
  });

  const isLoading = boardQuery.isLoading || financesQuery.isLoading || essentialsQuery.isLoading;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-7xl flex-col gap-6 animate-pulse">
          {/* Header Hero Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-xl bg-forest-soft/60" />
              <div className="h-4 w-96 rounded-lg bg-forest-soft/40" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-32 rounded-xl bg-forest-soft/50" />
              <div className="h-10 w-36 rounded-xl bg-forest-soft/50" />
            </div>
          </div>

          {/* 4 Pulse Cards Skeleton — same anatomy as StatCard */}
          <StatGridSkeleton count={4} />

          {/* Main Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-80 rounded-[1.25rem] bg-surface p-6 shadow-e1" />
            <div className="h-80 rounded-[1.25rem] bg-surface p-6 shadow-e1" />
          </div>
        </div>
      </AppLayout>
    );
  }

  const board = boardQuery.data;
  const fin = financesQuery.data;
  const curr = fin?.currency ?? 'BDT';
  const essentials = essentialsQuery.data ?? [];
  const lowStock = essentials.filter((e) => !e.in_stock);

  const overdue = board?.overdue?.length ?? 0;
  const dueToday = board?.due_today?.length ?? 0;
  const openErrands = board?.open_count ?? overdue + dueToday;

  const monthlySpend = fin?.monthly_spend_minor ?? 0;
  const monthlyBudget = fin?.monthly_budget_minor ?? 0;
  const budgetPercent =
    monthlyBudget > 0 ? Math.min(100, Math.round((monthlySpend / monthlyBudget) * 100)) : 0;

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {toast && (
          <div className="entry-reveal rounded-xl bg-forest-soft border border-secondary/30 p-4 text-sm font-semibold text-secondary flex items-center justify-between shadow-xs">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="text-muted hover:text-on-surface">
              &times;
            </button>
          </div>
        )}

        {/* Header — title matches the sidebar label 1:1 */}
        <PageHeader
          title="Household Overview"
          description="Domestic logistics, shared ledgers, and household wealth in one place."
          titleSize="headline"
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-2.5 text-label-md font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:bg-forest-soft active:translate-y-0 active:shadow-[var(--shadow-inset-sm)]"
              >
                <Icon name="view_kanban" className="text-[18px]" />
                Activities Hub
              </Link>
              <Link
                to="/money"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-label-md font-bold text-on-primary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0"
              >
                <Icon name="account_balance_wallet" className="text-[18px]" />
                Expense Tracker
              </Link>
            </div>
          }
        />

        {/* 1. Household Overview summary — unified StatCards */}
        <StatGrid count={4}>
          <StatCard
            to="/finances/overview"
            title="Shared Ledgers & Budget"
            value={formatMoney(fin?.net_worth_minor ?? 0, curr)}
            icon="trending_up"
            tone="forest"
            highlight={<StatHighlight tone="success">Net Worth</StatHighlight>}
          />
          <StatCard
            to="/requests"
            title="Active Errands & Tasks"
            value={openErrands}
            icon="view_kanban"
            tone="forest"
            highlight={
              overdue > 0 ? (
                <StatHighlight tone="danger" pulse>{overdue} Overdue</StatHighlight>
              ) : (
                <StatHighlight tone="success">{dueToday} Due Today</StatHighlight>
              )
            }
          />
          <StatCard
            to="/finances/taxes"
            title="Upcoming Taxes"
            value={formatMoney(fin?.taxes_pending_minor ?? 0, curr)}
            icon="receipt_long"
            tone="sage"
            highlight={<StatHighlight tone="primary">{fin?.taxes_pending_count ?? 0} Pending</StatHighlight>}
          />
          <StatCard
            to="/pantry"
            title="Pantry Stock"
            value={lowStock.length > 0 ? `${lowStock.length} Low` : `${essentials.length} Items`}
            icon="kitchen"
            tone={lowStock.length > 0 ? 'coral' : 'forest'}
            highlight={
              lowStock.length > 0 ? (
                <StatHighlight tone="danger">Restock</StatHighlight>
              ) : (
                <StatHighlight tone="success">Stocked</StatHighlight>
              )
            }
          />
        </StatGrid>

        {/* 2. Side-by-Side Dual Engine: Household Activities & Domestic Finances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Engine A: Household Domestic Logistics */}
          <Card
            className="stagger-item p-6 flex flex-col gap-5"
            style={{ '--sibling-index': 4 } as React.CSSProperties}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="task_alt" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Domestic Logistics &amp; Errands</h2>
                  <p className="text-xs text-muted">What requires household attention right now</p>
                </div>
              </div>
              <Link to="/requests" className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all">
                View Kanban &rarr;
              </Link>
            </div>

            {board?.overdue && board.overdue.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="warning" className="text-[16px]" /> Overdue Errands
                </span>
                {board.overdue.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-coral-soft/60 shadow-[var(--shadow-inset-sm)] transition-transform duration-300 ease-[var(--spring-easing)] hover:translate-x-0.5">
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">{item.title}</span>
                      <span className="text-xs text-muted">Assigned: {item.assignee?.name ?? 'Anyone'}</span>
                    </div>
                    <Badge tone="danger">Overdue</Badge>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Today&apos;s Errands</span>
              {board?.due_today && board.due_today.length > 0 ? (
                board.due_today.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] transition-transform duration-300 ease-[var(--spring-easing)] hover:translate-x-0.5">
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">{item.title}</span>
                      <span className="text-xs text-muted">{item.store_name ? `At ${item.store_name} · ` : ''}Assigned: {item.assignee?.name ?? 'Anyone'}</span>
                    </div>
                    <Badge tone="primary">Today</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted italic py-4 text-center bg-canvas rounded-2xl shadow-[var(--shadow-inset-sm)]">No errands due today. Good job!</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Pantry Replenishment</span>
              {lowStock.length > 0 ? (
                <div className="flex items-center justify-between w-full mt-1 p-3.5 rounded-2xl bg-amber-500/10 shadow-[var(--shadow-inset-sm)]">
                  <span className="text-xs font-semibold text-on-surface">{lowStock[0].name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.post(`/v1/essentials/${lowStock[0].id}/create-errand`);
                      setToast(`Restock errand for ${lowStock[0].name} added to household board!`);
                      await essentialsQuery.refetch();
                    }}
                    className="rounded-xl bg-secondary px-3 py-1.5 text-xs font-bold text-white shadow-[var(--shadow-clay-sm)] hover:bg-primary transition-all"
                  >
                    + Errand
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted italic p-3.5 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)]">Pantry fully stocked.</p>
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <Link to="/app" className="text-xs font-medium text-muted hover:text-on-surface transition-colors">
                Go to Detailed Activities Dashboard &rarr;
              </Link>
              <Link to="/requests" className="text-xs font-semibold text-secondary hover:underline">
                Create New Errand &rarr;
              </Link>
            </div>
          </Card>

          {/* Engine B: Household Budget & Wealth */}
          <Card
            className="stagger-item p-6 flex flex-col gap-5"
            style={{ '--sibling-index': 5 } as React.CSSProperties}
          >
            <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3.5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="account_balance_wallet" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Finances &amp; Budget Snapshot</h2>
                  <p className="text-xs text-muted">Assets, debt, savings goals, and cash flow</p>
                </div>
              </div>
              <Link to="/finances/overview" className="rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-semibold text-secondary shadow-[var(--shadow-clay-sm)] hover:bg-forest-soft transition-all">
                Open Ledgers &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Emergency Fund / Goals</span>
                <span className="text-base font-extrabold text-on-surface tabular-nums">
                  {fin?.active_goals_count ?? 0} active goals
                </span>
                <Link to="/finances/goals" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  View Goals &rarr;
                </Link>
              </div>

              <div className="p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Recurring Expenses</span>
                <span className="text-base font-extrabold text-on-surface">
                  Rent &amp; Utilities
                </span>
                <Link to="/finances/recurring" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  Manage Rules &rarr;
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Budget Health &amp; Variance</span>
              <div className="p-4 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-on-surface block">Monthly Household Cap</span>
                    <span className="text-xs text-muted tabular-nums">
                      Spend: {fin ? formatMoney(fin.monthly_spend_minor, curr) : '$0'} of {fin ? formatMoney(fin.monthly_budget_minor, curr) : '$0'}
                    </span>
                  </div>
                  <Badge tone="success">Under Budget</Badge>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container">
                  <div
                    className="animate-bar-x h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                    style={{ width: `${Math.max(6, budgetPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="p-3.5 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Total Assets</span>
                  <span className="text-sm font-extrabold text-on-surface tabular-nums truncate block">
                    {formatMoney(fin?.total_assets_minor ?? 0, curr)}
                  </span>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="savings" className="text-[16px]" />
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-canvas shadow-[var(--shadow-inset-sm)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">Total Liabilities</span>
                  <span className="text-sm font-extrabold text-on-surface tabular-nums truncate block">
                    {formatMoney(fin?.total_liabilities_minor ?? 0, curr)}
                  </span>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary">
                  <Icon name="credit_score" className="text-[16px]" />
                </span>
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-outline-variant/20 flex items-center justify-between">
              <Link to="/money" className="text-xs font-medium text-muted hover:text-on-surface transition-colors">
                Open Expense Tracker &rarr;
              </Link>
              <Link to="/finances/overview" className="text-xs font-semibold text-secondary hover:underline">
                View Full Balance Sheet &rarr;
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
