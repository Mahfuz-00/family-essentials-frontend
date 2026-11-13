import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
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
import { AMOUNT_INPUT_ERROR, formatMoney, parseMoneyToMinor } from '@/lib/money';
import { CADENCES, formatDateOnly, ruleCadence } from '@/lib/recurring';
import type { Ledger, RecurringCadence, RecurringRule } from '@/types';

const expenseCategories = [
  'Housing & Rent',
  'Utilities & Bills',
  'Subscriptions & Media',
  'Groceries & Food',
  'Healthcare & Insurance',
  'Education & Childcare',
  'Transportation & Fuel',
  'Other',
];

const categoryIcons: Record<string, string> = {
  'Housing & Rent': 'home',
  'Utilities & Bills': 'bolt',
  'Subscriptions & Media': 'subscriptions',
  'Groceries & Food': 'shopping_basket',
  'Healthcare & Insurance': 'health_and_safety',
  'Education & Childcare': 'school',
  'Transportation & Fuel': 'directions_car',
  Other: 'receipt_long',
};

const emptyForm = {
  title: '',
  category: 'Subscriptions & Media',
  cadence: 'monthly' as RecurringCadence,
  day_of_month: '1',
  amount: '',
  notes: '',
  ledger_id: '',
};

export function RecurringExpensesPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [filter, setFilter] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rulesQuery = useQuery({
    queryKey: ['recurring-rules'],
    queryFn: async () => (await api.get<{ data: RecurringRule[] }>('/v1/recurring-rules')).data.data,
  });

  const ledgersQuery = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const ledgers = ledgersQuery.data ?? [];

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['recurring-rules'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const minor = parseMoneyToMinor(form.amount);
      if (minor === null || minor <= 0) {
        throw new Error(AMOUNT_INPUT_ERROR);
      }
      return api.post('/v1/recurring-rules', {
        title: form.title,
        category: form.category,
        cadence: form.cadence,
        day_of_month: Number(form.day_of_month),
        amount_minor: minor,
        notes: form.notes || undefined,
        ledger_id: form.ledger_id ? Number(form.ledger_id) : undefined,
        direction: 'expense',
      });
    },
    onSuccess: async () => {
      setForm(emptyForm);
      setAddOpen(false);
      setError(null);
      setNotice('Recurring expense scheduled.');
      await refresh();
    },
    onError,
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: number; active: boolean }) =>
      api.patch(`/v1/recurring-rules/${id}`, { active }),
    onSuccess: async () => {
      setError(null);
      await refresh();
    },
    onError,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/recurring-rules/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Recurring rule removed.');
      await refresh();
    },
    onError,
  });

  const allRules = rulesQuery.data ?? [];
  // Filter for rules with financial amounts or designated expense rules
  const expenseRules = useMemo(() => {
    return allRules.filter((r) => r.amount_minor !== null && r.amount_minor > 0);
  }, [allRules]);

  const activeRules = expenseRules.filter((r) => r.active);

  // Calculate monthly burn
  const monthlyBurnMinor = useMemo(() => {
    return activeRules.reduce((total, r) => {
      const amt = r.amount_minor ?? 0;
      if (r.cadence === 'daily') return total + amt * 30;
      if (r.cadence === 'weekly') return total + Math.round(amt * 4.33);
      if (r.cadence === 'monthly') return total + amt;
      return total;
    }, 0);
  }, [activeRules]);

  const currency = (allRules[0] as any)?.currency ?? 'BDT';

  const visibleRules = useMemo(() => {
    if (filter === 'all') return expenseRules;
    if (filter === 'active') return expenseRules.filter((r) => r.active);
    if (filter === 'paused') return expenseRules.filter((r) => !r.active);
    return expenseRules.filter((r) => r.category === filter);
  }, [expenseRules, filter]);

  if (rulesQuery.isLoading || ledgersQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Recurring Bills"
            description="Manage automated household bills, subscriptions, utility reminders, and monthly burn commitments."
            titleSize="headline"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <div className="h-14 rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-e1 animate-pulse" />
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Recurring Bills"
          description="Manage automated household bills, subscriptions, utility reminders, and monthly burn commitments."
          titleSize="headline"
          actions={
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Icon name="add" className="text-[18px]" />
              Add Recurring Expense
            </Button>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* 4 Standard Executive Pulse Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Monthly Burn Commitment</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-secondary">
                  {formatMoney(monthlyBurnMinor, currency)}
                </span>
              </div>
              <span className="mt-1.5 text-xs text-muted">Estimated 30-day fixed baseline spend</span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-xs">
              <Icon name="payments" className="text-[22px]" />
            </div>
          </div>

          <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Active Subscriptions</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                  {activeRules.length}
                </span>
                <Badge tone="success">Active</Badge>
              </div>
              <span className="mt-1.5 text-xs text-muted">{expenseRules.length} total scheduled rules</span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sage-soft text-primary shadow-xs">
              <Icon name="event_repeat" className="text-[22px]" />
            </div>
          </div>

          <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Annual Forecast</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                  {formatMoney(monthlyBurnMinor * 12, currency)}
                </span>
              </div>
              <span className="mt-1.5 text-xs text-muted">Projected 12-month baseline outflow</span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-800 shadow-xs">
              <Icon name="query_stats" className="text-[22px]" />
            </div>
          </div>

          <div className="relative flex min-h-[115px] items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-e2">
            <div className="flex flex-col">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Upcoming Renewals</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none text-on-surface">
                  {activeRules.filter((r) => r.next_run_on).length}
                </span>
                <Badge tone="warning">Due Soon</Badge>
              </div>
              <span className="mt-1.5 text-xs text-muted">Upcoming automated payments</span>
            </div>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 shadow-xs">
              <Icon name="alarm" className="text-[22px]" />
            </div>
          </div>
        </div>

        {/* Filter Pills */}
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-label-md capitalize transition-all ${
              filter === 'all'
                ? 'bg-secondary font-semibold text-on-secondary shadow-e1'
                : 'bg-canvas text-on-surface-variant hover:bg-sage-soft'
            }`}
          >
            All Expenses ({expenseRules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-label-md capitalize transition-all ${
              filter === 'active'
                ? 'bg-secondary font-semibold text-on-secondary shadow-e1'
                : 'bg-canvas text-on-surface-variant hover:bg-sage-soft'
            }`}
          >
            Active ({activeRules.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('paused')}
            className={`cursor-pointer rounded-full px-3 py-1.5 text-label-md capitalize transition-all ${
              filter === 'paused'
                ? 'bg-secondary font-semibold text-on-secondary shadow-e1'
                : 'bg-canvas text-on-surface-variant hover:bg-sage-soft'
            }`}
          >
            Paused ({expenseRules.length - activeRules.length})
          </button>
          {expenseCategories.map((cat) => {
            const count = expenseRules.filter((r) => r.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFilter(cat)}
                className={`cursor-pointer rounded-full px-3 py-1.5 text-label-md transition-all ${
                  filter === cat
                    ? 'bg-secondary font-semibold text-on-secondary shadow-e1'
                    : 'bg-canvas text-on-surface-variant hover:bg-sage-soft'
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </Card>

        {rulesQuery.isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {rulesQuery.isSuccess && visibleRules.length === 0 && (
          <EmptyState
            title={expenseRules.length === 0 ? 'No recurring expenses scheduled yet' : 'No matches for this filter'}
            description={
              expenseRules.length === 0
                ? 'Track rent, streaming subscriptions, Wi-Fi, electricity, or recurring insurance payments.'
                : 'Try picking a different category filter.'
            }
            action={
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="add" className="text-[18px]" />
                Add First Recurring Expense
              </Button>
            }
          />
        )}

        {/* Expenses Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleRules.map((rule) => {
            const iconName = categoryIcons[rule.category ?? 'Other'] ?? 'payments';
            return (
              <Card
                key={rule.id}
                className={`flex flex-col justify-between p-5 border border-outline-variant/30 ${
                  !rule.active ? 'opacity-60 bg-surface-container-low' : 'bg-surface'
                }`}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                        <Icon name={iconName} className="text-[22px]" />
                      </span>
                      <div className="flex flex-col">
                        <h3 className="text-headline-sm font-bold text-on-surface">{rule.title}</h3>
                        <span className="text-body-xs text-muted capitalize">
                          {rule.category ?? 'General'} · {ruleCadence(rule)}
                        </span>
                      </div>
                    </div>
                    <Badge tone={rule.active ? 'success' : 'neutral'}>
                      {rule.active ? 'Active' : 'Paused'}
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between rounded-xl bg-surface-container-low p-3.5 border border-outline-variant/20">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wider">Amount:</span>
                    <span className="text-xl font-black text-secondary">
                      {rule.amount_minor !== null ? formatMoney(rule.amount_minor, currency) : '—'}
                      <span className="text-xs font-medium text-muted ml-1">/{rule.cadence}</span>
                    </span>
                  </div>

                  {rule.next_run_on && (
                    <div className="flex items-center justify-between text-xs text-muted px-1">
                      <span>Next Due Date:</span>
                      <span className="font-semibold text-on-surface">
                        {formatDateOnly(rule.next_run_on)}
                      </span>
                    </div>
                  )}

                  {rule.notes && (
                    <p className="text-xs text-muted line-clamp-2 px-1">
                      {rule.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-outline-variant/20 pt-3">
                  <button
                    type="button"
                    onClick={() => toggleMutation.mutate({ id: rule.id, active: !rule.active })}
                    className="cursor-pointer text-label-sm font-semibold text-secondary hover:underline"
                  >
                    {rule.active ? 'Pause Rule' : 'Resume Rule'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`Remove "${rule.title}" from recurring expenses?`)) {
                        deleteMutation.mutate(rule.id);
                      }
                    }}
                    className="cursor-pointer text-label-sm text-error hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </Card>
            );
          })}
        </section>

        {/* Modal: Add Recurring Expense */}
        <Modal
          open={addOpen}
          onClose={() => setAddOpen(false)}
          title="Schedule Recurring Expense"
          description="Track recurring commitments that auto-log or notify your household on regular cadences."
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createMutation.mutate();
            }}
            className="flex flex-col gap-4"
          >
            <div>
              <Label htmlFor="exp-title">Expense Title</Label>
              <Input
                id="exp-title"
                required
                placeholder="e.g. Fiber Internet, Netflix, Apartment Rent"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exp-amount">Amount ({currency})</Label>
                <Input
                  id="exp-amount"
                  required
                  placeholder="e.g. 45.00"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="exp-cadence">Billing Frequency</Label>
                <Select
                  id="exp-cadence"
                  value={form.cadence}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cadence: e.target.value as RecurringCadence }))
                  }
                >
                  {CADENCES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="exp-category">Expense Category</Label>
                <Select
                  id="exp-category"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="exp-day">Day of Month Due</Label>
                <Input
                  id="exp-day"
                  type="number"
                  min={1}
                  max={31}
                  value={form.day_of_month}
                  onChange={(e) => setForm((prev) => ({ ...prev, day_of_month: e.target.value }))}
                />
              </div>
            </div>

            {ledgers.length > 0 && (
              <div>
                <Label htmlFor="exp-ledger">Assign to Ledger (Optional)</Label>
                <Select
                  id="exp-ledger"
                  value={form.ledger_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, ledger_id: e.target.value }))}
                >
                  <option value="">Default Household Ledger</option>
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="exp-notes">Notes or Account Reference (Optional)</Label>
              <Input
                id="exp-notes"
                placeholder="e.g. Account #84920, auto-debited via debit card"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant/20">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Recurring Expense'}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
