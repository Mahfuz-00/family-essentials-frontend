import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/Icon';
import { api } from '@/lib/api';
import { useUiStore } from '@/stores/ui';

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

function formatMoney(minor: number, currency: string = 'BDT'): string {
  const amount = (minor / 100).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : `${currency} `;
  return `${symbol}${amount}`;
}

export function HomeOverviewPage() {
  const [toast, setToast] = useState<string | null>(null);
  const addToast = useUiStore((s) => s.addToast);

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
        const { data } = await api.get('/v1/finances/overview');
        return data as FinancialSnapshot;
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

  const board = boardQuery.data;
  const fin = financesQuery.data;
  const curr = fin?.currency ?? 'BDT';
  const essentials = essentialsQuery.data ?? [];
  const lowStock = essentials.filter((e) => !e.in_stock);

  const overdue = board?.overdue?.length ?? 0;
  const dueToday = board?.due_today?.length ?? 0;
  const openErrands = board?.open_count ?? overdue + dueToday;

  return (
    <AppLayout>
      <div className="flex flex-col gap-8 p-6 max-w-7xl mx-auto">
        {toast && (
          <div className="rounded-xl bg-forest-soft border border-secondary/30 p-4 text-sm font-semibold text-secondary flex items-center justify-between shadow-xs">
            <span>{toast}</span>
            <button type="button" onClick={() => setToast(null)} className="text-muted hover:text-on-surface">
              &times;
            </button>
          </div>
        )}

        {/* Header Hero */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="text-display-sm font-black text-on-surface tracking-tight">
              Today's Household Overview
            </h1>
            <p className="text-body-md text-muted mt-1">
              Domestic logistics, shared ledgers, and household wealth in one place.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-xl bg-forest-soft px-4 py-2.5 text-label-md font-bold text-secondary hover:bg-forest-soft/80 transition-all border border-secondary/20"
            >
              <Icon name="view_kanban" className="text-[18px]" />
              Activities Hub
            </Link>
            <Link
              to="/money"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-label-md font-bold text-on-primary hover:bg-primary-dark transition-all shadow-e1"
            >
              <Icon name="account_balance_wallet" className="text-[18px]" />
              Expense Tracker
            </Link>
          </div>
        </div>

        {/* 1. Executive Summary Pulse Cards matching software UI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/finances/overview" className="group block">
            <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Shared Ledgers &amp; Budget
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {fin ? formatMoney(fin.net_worth_minor, curr) : '$0'}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                    Net Worth
                  </span>
                </div>
                <span className="mt-1.5 text-xs text-muted">
                  Assets: {fin ? formatMoney(fin.total_assets_minor, curr) : '$0'} · Debt: {fin ? formatMoney(fin.total_liabilities_minor, curr) : '$0'}
                </span>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Icon name="trending_up" className="text-[22px]" />
              </div>
            </div>
          </Link>

          <Link to="/requests" className="group block">
            <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Active Errands &amp; Tasks
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {openErrands}
                  </span>
                  {overdue > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-coral-soft px-2 py-0.5 text-xs font-semibold leading-none text-error">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-error opacity-75" />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-error" />
                      </span>
                      {overdue} Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                      {dueToday} Due Today
                    </span>
                  )}
                </div>
                <span className="mt-1.5 text-xs text-muted">
                  {overdue > 0 ? `${overdue} tasks need attention` : 'All tasks on track'}
                </span>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Icon name="view_kanban" className="text-[22px]" />
              </div>
            </div>
          </Link>

          <Link to="/places" className="group block">
            <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Saved Stores &amp; Geofences
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {fin ? formatMoney(fin.taxes_pending_minor, curr) : '$0'}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-sage-soft px-2 py-0.5 text-xs font-semibold leading-none text-primary">
                    Taxes
                  </span>
                </div>
                <span className="mt-1.5 text-xs text-muted">
                  {fin?.taxes_pending_count ?? 0} upcoming tax assessments
                </span>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Icon name="receipt_long" className="text-[22px]" />
              </div>
            </div>
          </Link>

          <Link to="/pantry" className="group block">
            <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-1 hover:shadow-e2">
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  Standing Chores
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                    {lowStock.length} Low
                  </span>
                  {lowStock.length > 0 ? (
                    <span className="inline-flex items-center rounded-md bg-coral-soft px-2 py-0.5 text-xs font-semibold leading-none text-error">
                      Restock
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-forest-soft px-2 py-0.5 text-xs font-semibold leading-none text-success">
                      Stocked
                    </span>
                  )}
                </div>
                <span className="mt-1.5 text-xs text-muted flex items-center gap-2">
                  <span>Family Seats</span>
                  <span>·</span>
                  <span>2 of 5 seats used</span>
                </span>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs transition-transform duration-300 group-hover:scale-110">
                <Icon name="inventory_2" className="text-[22px]" />
              </div>
            </div>
          </Link>
        </div>

        {/* 2. Side-by-Side Dual Engine: Household Activities & Domestic Finances */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engine A: Household Domestic Logistics */}
          <Card className="p-6 flex flex-col gap-5 border border-outline-variant/60 shadow-e1 bg-surface">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="task_alt" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Domestic Logistics & Errands</h2>
                  <p className="text-xs text-muted">What requires household attention right now</p>
                </div>
              </div>
              <Link to="/requests" className="text-xs font-semibold text-secondary hover:underline">
                View Kanban &rarr;
              </Link>
            </div>

            {board?.overdue && board.overdue.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-xs font-bold text-error uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="warning" className="text-[16px]" /> Overdue Errands
                </span>
                {board.overdue.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-coral-soft/50 border border-error/20">
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
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Today's Errands</span>
              {board?.due_today && board.due_today.length > 0 ? (
                board.due_today.slice(0, 3).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-canvas border border-outline-variant/40">
                    <div>
                      <span className="text-sm font-semibold text-on-surface block">{item.title}</span>
                      <span className="text-xs text-muted">{item.store_name ? `At ${item.store_name} · ` : ''}Assigned: {item.assignee?.name ?? 'Anyone'}</span>
                    </div>
                    <Badge tone="primary">Today</Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted italic py-3 text-center bg-canvas rounded-xl">No errands due today. Good job!</p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Pantry Replenishment</span>
              {lowStock.length > 0 ? (
                <div className="flex items-center justify-between w-full mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-semibold text-on-surface">{lowStock[0].name}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      await api.post(`/v1/essentials/${lowStock[0].id}/create-errand`);
                      setToast(`Restock errand for ${lowStock[0].name} added to household board!`);
                      if (addToast) {
                        addToast(`Restock errand for ${lowStock[0].name} added to household board!`);
                      }
                      await essentialsQuery.refetch();
                    }}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-primary transition-all"
                  >
                    + Errand
                  </button>
                </div>
              ) : (
                <p className="text-xs text-muted italic">Pantry fully stocked.</p>
              )}
            </div>

            <div className="mt-auto pt-2 flex items-center justify-between">
              <Link to="/app" className="text-xs font-medium text-muted hover:text-on-surface">
                Go to Detailed Activities Dashboard &rarr;
              </Link>
              <Link to="/requests" className="text-xs font-semibold text-secondary hover:underline">
                Create New Errand &rarr;
              </Link>
            </div>
          </Card>

          {/* Engine B: Household Budget & Wealth */}
          <Card className="p-6 flex flex-col gap-5 border border-outline-variant/60 shadow-e1 bg-surface">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="account_balance_wallet" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-title-md font-bold text-on-surface">Finances & Budget Snapshot</h2>
                  <p className="text-xs text-muted">Assets, debt, savings goals, and cash flow</p>
                </div>
              </div>
              <Link to="/finances/overview" className="text-xs font-semibold text-secondary hover:underline">
                Open Ledgers &rarr;
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-canvas border border-outline-variant/40 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Emergency Fund / Goals</span>
                <span className="text-base font-extrabold text-on-surface">
                  {fin?.active_goals_count ?? 0} active goals
                </span>
                <Link to="/finances/goals" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  View Goals &rarr;
                </Link>
              </div>

              <div className="p-3.5 rounded-xl bg-canvas border border-outline-variant/40 flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">Recurring Expenses</span>
                <span className="text-base font-extrabold text-on-surface">
                  Rent &amp; Utilities
                </span>
                <Link to="/recurring" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline mt-1">
                  Manage Rules &rarr;
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Budget Health &amp; Variance</span>
              <div className="p-3 rounded-xl bg-canvas border border-outline-variant/40 flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-on-surface block">Monthly Household Cap</span>
                  <span className="text-xs text-muted">
                    Spend: {fin ? formatMoney(fin.monthly_spend_minor, curr) : '$0'} of {fin ? formatMoney(fin.monthly_budget_minor, curr) : '$0'}
                  </span>
                </div>
                <Badge tone="success">Under Budget</Badge>
              </div>
            </div>

            <div className="mt-auto pt-2 flex items-center justify-between">
              <Link to="/money" className="text-xs font-medium text-muted hover:text-on-surface">
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
