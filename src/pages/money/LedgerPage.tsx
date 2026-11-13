import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StaticChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { AMOUNT_INPUT_ERROR, formatMoney, parseMoneyToMinor } from '@/lib/money';
import { formatDateOnly } from '@/lib/recurring';
import { useAuthStore } from '@/stores/auth';
import type {
  Ledger,
  LedgerEntry,
  LedgerEntryDirection,
  LedgerGrantRole,
  LedgerSummary,
  ReceiptScanResponse,
  TenantMember,
} from '@/types';

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

function getPeriodRange(type: 'monthly' | 'weekly' | 'yearly'): { from: string; to: string } {
  const now = new Date();
  if (type === 'yearly') {
    return {
      from: `${now.getFullYear()}-01-01`,
      to: `${now.getFullYear()}-12-31`,
    };
  }
  if (type === 'weekly') {
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: isoDate(monday), to: isoDate(sunday) };
  }
  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

const COMMON_EXPENSE_CATEGORIES = [
  { key: 'rent', label: 'Rent & Housing', icon: 'home' },
  { key: 'utility_bill', label: 'Utility Bills', icon: 'bolt' },
  { key: 'grocery', label: 'Groceries & Food', icon: 'shopping_cart' },
  { key: 'other', label: 'Other Household', icon: 'category' },
];

export function LedgerPage({ ledgerId }: { ledgerId: number }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<'monthly' | 'weekly' | 'yearly'>('monthly');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [createLedgerOpen, setCreateLedgerOpen] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerMonthly, setNewLedgerMonthly] = useState('');
  const [newLedgerWeekly, setNewLedgerWeekly] = useState('');
  const [newLedgerYearly, setNewLedgerYearly] = useState('');

  const [form, setForm] = useState({
    amount: '',
    direction: 'expense' as LedgerEntryDirection,
    category: '',
    description: '',
    occurred_on: isoDate(new Date()),
  });

  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [budgetMonthlyInput, setBudgetMonthlyInput] = useState('');
  const [budgetWeeklyInput, setBudgetWeeklyInput] = useState('');
  const [budgetYearlyInput, setBudgetYearlyInput] = useState('');

  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrFile, setOcrFile] = useState<File | null>(null);
  const [ocrAutoRecord, setOcrAutoRecord] = useState(true);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrResult, setOcrResult] = useState<ReceiptScanResponse | null>(null);
  const [ocrError, setOcrError] = useState<string | null>(null);

  type LedgerSubmodule =
    | 'entries'
    | 'budget'
    | 'categories'
    | 'breakdown'
    | 'recurring'
    | 'access';
  const [activeSubmodule, setActiveSubmodule] = useState<LedgerSubmodule>('entries');

  const range = useMemo(() => getPeriodRange(periodType), [periodType]);

  const ledgers = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const ledger = (ledgers.data ?? []).find((entry) => entry.id === ledgerId);
  const role = ledger?.my_role;
  const canReadEntries = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';

  const summary = useQuery({
    queryKey: ['ledgers', ledgerId, 'summary', periodType, range.from, range.to],
    queryFn: async () =>
      (
        await api.get<{ data: LedgerSummary }>(`/v1/ledgers/${ledgerId}/summary`, {
          params: { period_type: periodType, from: range.from, to: range.to },
        })
      ).data.data,
    enabled: ledger != null,
  });

  const entries = useQuery({
    queryKey: ['ledgers', ledgerId, 'entries', periodType, range.from, range.to],
    queryFn: async () =>
      (
        await api.get<{ data: LedgerEntry[] }>(`/v1/ledgers/${ledgerId}/entries`, {
          params: { period_type: periodType, from: range.from, to: range.to },
        })
      ).data.data,
    enabled: canReadEntries && activeSubmodule === 'entries',
  });

  const roster = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
    enabled: isOwner && activeSubmodule === 'access',
  });

  const recurringRules = useQuery({
    queryKey: ['recurring-rules'],
    queryFn: async () => (await api.get<{ data: any[] }>('/v1/recurring-rules')).data.data,
    enabled: canReadEntries,
  });

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
  };

  const handleScanReceipt = async () => {
    setOcrScanning(true);
    setOcrError(null);
    try {
      const formData = new FormData();
      if (ocrFile) {
        formData.append('image', ocrFile);
      }
      formData.append('ledger_id', String(ledgerId));
      formData.append('auto_record', ocrAutoRecord ? '1' : '0');

      const response = await api.post<ReceiptScanResponse>('/v1/ledger/receipts/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setOcrResult(response.data);
      if (ocrAutoRecord) {
        setNotice(`Scanned receipt from ${response.data.merchant} recorded to ledger.`);
        await refresh();
      }
    } catch (err) {
      setOcrError(apiError(err));
    } finally {
      setOcrScanning(false);
    }
  };

  const record = useMutation({
    mutationFn: async (amountMinor: number) =>
      api.post(`/v1/ledgers/${ledgerId}/entries`, {
        amount_minor: amountMinor,
        direction: form.direction,
        category: form.category || null,
        description: form.description || null,
        occurred_on: form.occurred_on,
      }),
    onSuccess: async () => {
      setForm({ ...form, amount: '', category: '', description: '' });
      setRecordModalOpen(false);
      setError(null);
      setNotice('Entry recorded.');
      setActiveSubmodule('entries');
      await refresh();
    },
    onError,
  });

  const submitEntry = () => {
    const minor = parseMoneyToMinor(form.amount);

    if (minor === null) {
      setError(AMOUNT_INPUT_ERROR);
      setNotice(null);
      return;
    }

    record.mutate(minor);
  };

  const updateBudget = useMutation({
    mutationFn: async () => {
      const monthlyMinor = budgetMonthlyInput ? parseMoneyToMinor(budgetMonthlyInput) : null;
      const weeklyMinor = budgetWeeklyInput ? parseMoneyToMinor(budgetWeeklyInput) : null;
      const yearlyMinor = budgetYearlyInput ? parseMoneyToMinor(budgetYearlyInput) : null;
      return api.patch(`/v1/ledgers/${ledgerId}`, {
        monthly_budget_minor: monthlyMinor,
        weekly_budget_minor: weeklyMinor,
        yearly_budget_minor: yearlyMinor,
      });
    },
    onSuccess: async () => {
      setBudgetModalOpen(false);
      setError(null);
      setNotice('Budget limit saved.');
      await refresh();
    },
    onError,
  });

  const createLedger = useMutation({
    mutationFn: async () => {
      const monthlyMinor = newLedgerMonthly ? parseMoneyToMinor(newLedgerMonthly) : null;
      const weeklyMinor = newLedgerWeekly ? parseMoneyToMinor(newLedgerWeekly) : null;
      const yearlyMinor = newLedgerYearly ? parseMoneyToMinor(newLedgerYearly) : null;
      return api.post<{ data: Ledger }>('/v1/ledgers', {
        name: newLedgerName,
        monthly_budget_minor: monthlyMinor,
        weekly_budget_minor: weeklyMinor,
        yearly_budget_minor: yearlyMinor,
      });
    },
    onSuccess: async (response) => {
      setNewLedgerName('');
      setNewLedgerMonthly('');
      setNewLedgerWeekly('');
      setNewLedgerYearly('');
      setCreateLedgerOpen(false);
      setError(null);
      setNotice('New household ledger created.');
      await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      const createdId = response.data?.data?.id;
      if (createdId) {
        navigate({
          to: '/money/$ledgerId',
          params: { ledgerId: String(createdId) },
        });
      }
    },
    onError,
  });

  const openBudgetModal = () => {
    setBudgetMonthlyInput(
      ledger?.monthly_budget_minor != null ? (ledger.monthly_budget_minor / 100).toFixed(2) : ''
    );
    setBudgetWeeklyInput(
      ledger?.weekly_budget_minor != null ? (ledger.weekly_budget_minor / 100).toFixed(2) : ''
    );
    setBudgetYearlyInput(
      ledger?.yearly_budget_minor != null ? (ledger.yearly_budget_minor / 100).toFixed(2) : ''
    );
    setBudgetModalOpen(true);
  };

  const removeEntry = useMutation({
    mutationFn: async (entryId: number) =>
      api.delete(`/v1/ledgers/${ledgerId}/entries/${entryId}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Entry deleted. The totals have been recalculated.');
      await refresh();
    },
    onError,
  });

  const grant = useMutation({
    mutationFn: async ({ userId, grantRole }: { userId: number; grantRole: LedgerGrantRole }) =>
      api.post(`/v1/ledgers/${ledgerId}/members`, { user_id: userId, role: grantRole }),
    onSuccess: async () => {
      setError(null);
      setNotice('Access granted. The change takes effect on their next request.');
      await refresh();
    },
    onError,
  });

  const revoke = useMutation({
    mutationFn: async (userId: number) =>
      api.delete(`/v1/ledgers/${ledgerId}/members/${userId}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Access removed.');
      await refresh();
    },
    onError,
  });

  const currency = summary.data?.currency ?? ledger?.currency ?? '';
  const activeFrom = summary.data?.period?.from ?? summary.data?.from ?? range.from;
  const activeTo = summary.data?.period?.to ?? summary.data?.to ?? range.to;
  const periodLabel =
    periodType === 'weekly' ? 'Weekly' : periodType === 'yearly' ? 'Yearly' : 'Monthly';

  const allEntries = entries.data ?? [];
  const rawEntries = allEntries.filter((entry) => {
    const dateStr = (entry.occurred_on ?? '').slice(0, 10);
    if (!dateStr) return true;
    return dateStr >= activeFrom && dateStr <= activeTo;
  });
  const entryList = rawEntries.filter((entry) => {
    if (categoryFilter === 'all') return true;
    return (entry.category ?? 'other').toLowerCase() === categoryFilter.toLowerCase();
  });
  const memberList = (roster.data ?? []).filter((member) => member.user_id !== currentUser?.id);
  const accessBusy = grant.isPending || revoke.isPending;

  const relevantRecurringExpenses = (recurringRules.data ?? []).filter(
    (rule) => rule.ledger_id === ledgerId || (rule.amount_minor && rule.amount_minor > 0)
  );

  if (ledgers.isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6 max-w-6xl">
          <PageHeader
            title="Expenses &amp; Money"
            description="Loading this ledger…"
            titleSize="headline"
            actions={
              <div className="flex items-center gap-2.5 animate-pulse">
                <div className="h-10 w-36 rounded-xl bg-forest-soft/60" />
                <div className="h-10 w-32 rounded-xl bg-forest-soft/50" />
              </div>
            }
          />

          {/* Submodule Navigation Bar Skeleton */}
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)] animate-pulse">
            <div className="h-10 w-48 rounded-xl bg-secondary/40" />
            <div className="h-10 w-36 rounded-xl bg-forest-soft/60" />
            <div className="h-10 w-44 rounded-xl bg-forest-soft/60" />
            <div className="h-10 w-44 rounded-xl bg-forest-soft/60" />
            <div className="h-10 w-44 rounded-xl bg-forest-soft/60" />
            <div className="h-10 w-36 rounded-xl bg-forest-soft/60" />
          </div>

          {/* This Period Card Skeleton */}
          <Card className="p-4 flex flex-wrap items-center justify-between gap-3 animate-pulse">
            <div className="space-y-2">
              <div className="h-6 w-32 rounded-lg bg-forest-soft/70" />
              <div className="h-4 w-56 rounded bg-forest-soft/50" />
            </div>
            <div className="flex gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)]">
              <div className="h-8 w-28 rounded-xl bg-surface" />
              <div className="h-8 w-28 rounded-xl bg-forest-soft/40" />
              <div className="h-8 w-28 rounded-xl bg-forest-soft/40" />
            </div>
          </Card>

          {/* 3 Stat Cards Skeleton (Matches Total Spent / Total Income / Net Outflow 1:1) */}
          <StatGridSkeleton count={3} />

          {/* Household Ledger Entries Table Card Skeleton */}
          <Card className="overflow-hidden p-0 animate-pulse">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-outline-variant/60">
              <div className="space-y-2">
                <div className="h-6 w-56 rounded-lg bg-forest-soft/70" />
                <div className="h-4 w-48 rounded bg-forest-soft/50" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-56 rounded-xl bg-forest-soft/50" />
                <div className="h-8 w-28 rounded-xl bg-forest-soft/50" />
              </div>
            </div>
            <div className="divide-y divide-outline-variant/30 p-5 space-y-4">
              {[0, 1, 2, 3].map((row) => (
                <div key={row} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                  <div className="h-4 w-24 rounded bg-forest-soft/50" />
                  <div className="h-5 w-48 rounded bg-forest-soft/60" />
                  <div className="h-4 w-24 rounded bg-forest-soft/50" />
                  <div className="h-6 w-28 rounded-full bg-forest-soft/50" />
                  <div className="h-5 w-24 rounded bg-forest-soft/70" />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        <PageHeader
          title="Expenses &amp; Money"
          description={
            ledger
              ? `${periodType === 'weekly' ? 'Weekly' : periodType === 'yearly' ? 'Yearly' : 'Monthly'} ledger for ${range.from} to ${range.to}, in ${ledger.currency}.`
              : 'Loading this ledger…'
          }
          titleSize="headline"
          actions={
            <div className="flex flex-wrap items-center gap-2.5">
              {ledgers.data && ledgers.data.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-label-sm font-semibold text-muted">Ledger:</span>
                  <select
                    value={String(ledgerId)}
                    onChange={(e) =>
                      navigate({
                        to: '/money/$ledgerId',
                        params: { ledgerId: e.target.value },
                      })
                    }
                    className="h-10 rounded-xl border border-outline-variant bg-surface px-3 text-label-md font-semibold text-on-surface hover:bg-surface-container focus:outline-none focus:ring-2 focus:ring-secondary"
                  >
                    {ledgers.data.map((l) => (
                      <option key={l.id} value={String(l.id)}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {ledger && canReadEntries && (
                <Button variant="primary" size="md" onClick={() => setRecordModalOpen(true)}>
                  <Icon name="add_circle" className="text-[18px]" />
                  Record Entry
                </Button>
              )}
              {ledger?.my_role === 'owner' && (
                <Button variant="outline" size="md" onClick={() => setCreateLedgerOpen(true)}>
                  <Icon name="add" className="text-[16px]" />
                  New Ledger
                </Button>
              )}
            </div>
          }
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {ledgers.isError && <Alert>{apiError(ledgers.error)}</Alert>}

        {ledgers.isSuccess && !ledger && (
          <EmptyState
            title="This ledger is not yours"
            description="It may have been removed, or your access to it changed. Nothing on this account is hidden — the list is the whole list."
            action={
              <Button
                size="lg"
                onClick={() => {
                  if (ledgers.data && ledgers.data.length > 0) {
                    navigate({
                      to: '/money/$ledgerId',
                      params: { ledgerId: String(ledgers.data[0].id) },
                      replace: true,
                    });
                  } else {
                    navigate({ to: '/money', replace: true });
                  }
                }}
              >
                <Icon name="receipt_long" className="text-[18px]" />
                Go to Expenses &amp; Money
              </Button>
            }
          />
        )}

        {/* Submodule Navigation Bar at Top */}
        {ledger && canReadEntries && (
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)]"
            role="tablist"
            aria-label="Expenses and money submodules"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeSubmodule === 'entries'}
              onClick={() => setActiveSubmodule('entries')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                activeSubmodule === 'entries'
                  ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                  : 'text-on-surface-variant hover:bg-surface/70'
              }`}
            >
              <Icon name="receipt_long" className="text-[18px]" />
              <span>Entries &amp; Transactions</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubmodule === 'budget'}
              onClick={() => setActiveSubmodule('budget')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                activeSubmodule === 'budget'
                  ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                  : 'text-on-surface-variant hover:bg-surface/70'
              }`}
            >
              <Icon name="tune" className="text-[18px]" />
              <span>Budget &amp; Limits</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubmodule === 'categories'}
              onClick={() => setActiveSubmodule('categories')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                activeSubmodule === 'categories'
                  ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                  : 'text-on-surface-variant hover:bg-surface/70'
              }`}
            >
              <Icon name="pie_chart" className="text-[18px]" />
              <span>Category Breakdown</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubmodule === 'breakdown'}
              onClick={() => setActiveSubmodule('breakdown')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                activeSubmodule === 'breakdown'
                  ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                  : 'text-on-surface-variant hover:bg-surface/70'
              }`}
            >
              <Icon name="bar_chart" className="text-[18px]" />
              <span>Periodic Breakdown</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeSubmodule === 'recurring'}
              onClick={() => setActiveSubmodule('recurring')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                activeSubmodule === 'recurring'
                  ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                  : 'text-on-surface-variant hover:bg-surface/70'
              }`}
            >
              <Icon name="update" className="text-[18px]" />
              <span>Recurring Expenses</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                  activeSubmodule === 'recurring'
                    ? 'bg-white/20 text-white'
                    : 'bg-surface-container text-muted'
                }`}
              >
                {relevantRecurringExpenses.length}
              </span>
            </button>

            {isOwner && (
              <button
                type="button"
                role="tab"
                aria-selected={activeSubmodule === 'access'}
                onClick={() => setActiveSubmodule('access')}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-label-md font-bold transition-all ${
                  activeSubmodule === 'access'
                    ? 'bg-secondary text-on-secondary shadow-[var(--shadow-clay-sm)]'
                    : 'text-on-surface-variant hover:bg-surface/70'
                }`}
              >
                <Icon name="group" className="text-[18px]" />
                <span>Member Access</span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                    activeSubmodule === 'access'
                      ? 'bg-white/20 text-white'
                      : 'bg-surface-container text-muted'
                  }`}
                >
                  {ledger.member_count}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Summary-only members see This period + info alert */}
        {ledger && !canReadEntries && (
          <>
            <SummaryCard
              summary={summary.data}
              currency={currency}
              loading={summary.isLoading}
              periodType={periodType}
              onPeriodChange={setPeriodType}
              error={summary.isError ? summary.error : null}
              onRetry={() => void summary.refetch()}
            />
            <Alert tone="info">
              Your role on this ledger shows the totals only — the individual entries stay with the people
              who record them.
            </Alert>
          </>
        )}

        {/* SUBMODULE 1: Entries & Transactions (This period + Household Ledger Entries) */}
        {ledger && canReadEntries && activeSubmodule === 'entries' && (
          <div className="flex flex-col gap-6">
            <SummaryCard
              summary={summary.data}
              currency={currency}
              loading={summary.isLoading}
              periodType={periodType}
              onPeriodChange={setPeriodType}
              error={summary.isError ? summary.error : null}
              onRetry={() => void summary.refetch()}
            />

            <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5 border-b border-outline-variant/60">
              <div>
                <h2 className="text-headline-sm text-on-surface">
                  Household Ledger Entries
                </h2>
                <p className="text-body-sm text-muted">
                  {entryList.length} of {rawEntries.length} {rawEntries.length === 1 ? 'entry' : 'entries'} shown for this {periodType} period.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 rounded-xl bg-surface-container p-1 border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`rounded-lg px-2.5 py-1 text-label-sm font-semibold transition-all ${
                      categoryFilter === 'all' ? 'bg-surface shadow-e1 text-secondary' : 'text-muted hover:text-on-surface'
                    }`}
                  >
                    All
                  </button>
                  {COMMON_EXPENSE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategoryFilter(cat.key)}
                      className={`rounded-lg px-2.5 py-1 text-label-sm font-semibold transition-all ${
                        categoryFilter === cat.key ? 'bg-surface shadow-e1 text-secondary' : 'text-muted hover:text-on-surface'
                      }`}
                    >
                      {cat.label.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOcrModal(true)}
                  className="flex items-center gap-1.5"
                >
                  <Icon name="document_scanner" className="text-[18px]" />
                  Scan Receipt
                </Button>
                <Badge tone="primary">{role === 'owner' ? 'You own this ledger' : 'You manage this ledger'}</Badge>
              </div>
            </div>

            {entries.isLoading && (
              <div className="divide-y divide-outline-variant/30 p-5 space-y-4 animate-pulse" aria-busy="true">
                {[0, 1, 2, 3].map((row) => (
                  <div key={row} className="flex items-center justify-between gap-4 pt-3 first:pt-0">
                    <div className="h-4 w-24 rounded bg-forest-soft/50" />
                    <div className="h-5 w-48 rounded bg-forest-soft/60" />
                    <div className="h-4 w-24 rounded bg-forest-soft/50" />
                    <div className="h-6 w-28 rounded-full bg-forest-soft/50" />
                    <div className="h-5 w-24 rounded bg-forest-soft/70" />
                  </div>
                ))}
              </div>
            )}
            {entries.isError && <p className="px-5 py-6 text-body-md text-error">{apiError(entries.error)}</p>}

            {entries.isSuccess && entryList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 px-5 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary mb-3">
                  <Icon name="receipt_long" className="text-[24px]" />
                </span>
                <p className="text-body-md font-bold text-on-surface">No entries recorded</p>
                <p className="text-body-sm text-muted max-w-sm mt-1 mb-4">
                  {rawEntries.length > 0
                    ? 'No entries match the selected category filter.'
                    : 'Nothing recorded in this period yet. Use the Record Entry button to add your first entry.'}
                </p>
                <Button size="sm" variant="primary" onClick={() => setRecordModalOpen(true)}>
                  <Icon name="add" className="text-[16px]" />
                  Record Entry
                </Button>
              </div>
            )}

            {entryList.length > 0 && (
              <Table className="min-w-[640px]">
                <THead>
                  <TH>Date</TH>
                  <TH>What &amp; Source</TH>
                  <TH>Category</TH>
                  <TH>Paid by</TH>
                  <TH>Amount</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </THead>
                <tbody>
                  {entryList.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap text-muted font-mono text-body-sm">
                        {formatDateOnly(entry.occurred_on)}
                      </TD>
                      <TD>
                        <span className="flex flex-col">
                          <span className="text-label-lg font-semibold text-on-surface">
                            {entry.description ?? 'Household Expense'}
                          </span>
                          <span className="flex items-center gap-1.5 text-body-sm text-muted">
                            {entry.source === 'request' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sage-soft text-secondary px-1.5 py-0.5 rounded">
                                <Icon name="task_alt" className="text-[12px]" /> Task Completed
                              </span>
                            )}
                            {entry.source === 'recurring' && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-tertiary/10 text-tertiary px-1.5 py-0.5 rounded">
                                <Icon name="update" className="text-[12px]" /> Recurring
                              </span>
                            )}
                            {entry.source === 'manual' && (
                              <span className="text-[11px] text-muted">Manual Entry</span>
                            )}
                          </span>
                        </span>
                      </TD>
                      <TD>
                        <span className="inline-flex items-center gap-1 text-label-sm font-medium text-on-surface-variant capitalize">
                          {entry.category ?? 'Other'}
                        </span>
                      </TD>
                      <TD>
                        {entry.paid_by ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={entry.paid_by.name ?? 'Member'} size="sm" />
                            <span className="text-body-sm font-medium">{entry.paid_by.name}</span>
                          </span>
                        ) : (
                          <span className="text-body-sm text-muted">—</span>
                        )}
                      </TD>
                      <TD>
                        <span className="flex items-center gap-2">
                          <StaticChip tone={entry.direction === 'income' ? 'success' : 'neutral'}>
                            {entry.direction === 'income' ? 'Income' : 'Expense'}
                          </StaticChip>
                          <span
                            className={`text-label-lg font-bold ${
                              entry.direction === 'income' ? 'text-secondary' : 'text-on-surface'
                            }`}
                          >
                            {entry.direction === 'income' ? '+' : '-'}
                            {formatMoney(entry.amount_minor, currency)}
                          </span>
                        </span>
                      </TD>
                      <TD className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error hover:bg-coral-soft"
                          disabled={removeEntry.isPending}
                          onClick={() => removeEntry.mutate(entry.id)}
                        >
                          Delete
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
            </Card>
          </div>
        )}

        {/* Right-Side Slide-Over Form: Record an entry */}
        <Modal
          open={recordModalOpen}
          onClose={() => setRecordModalOpen(false)}
          title="Record an entry"
          description="Record rent, utility bills, groceries, or household income into this ledger."
          position="right"
          footer={
            <>
              <Button variant="ghost" onClick={() => setRecordModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="lg"
                disabled={record.isPending || form.amount.trim() === '' || form.occurred_on === ''}
                onClick={submitEntry}
              >
                <Icon name="add" className="text-[18px]" />
                {record.isPending ? 'Saving…' : 'Record entry'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {/* Quick Category Selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-label-sm font-semibold text-muted w-full">Quick Category:</span>
              {COMMON_EXPENSE_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setForm({ ...form, category: cat.key })}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-label-sm font-medium border transition-all ${
                    form.category === cat.key
                      ? 'bg-secondary text-on-secondary border-secondary'
                      : 'bg-surface text-on-surface border-outline-variant hover:bg-sage-soft'
                  }`}
                >
                  <Icon name={cat.icon} className="text-[14px]" />
                  {cat.label}
                </button>
              ))}
            </div>

            <div>
              <Label htmlFor="entry-amount">Amount</Label>
              <Input
                id="entry-amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm({ ...form, amount: event.target.value })}
                placeholder={`0.00 ${currency}`}
              />
            </div>

            <div>
              <Label htmlFor="entry-direction">Direction</Label>
              <Select
                id="entry-direction"
                value={form.direction}
                onChange={(event) =>
                  setForm({ ...form, direction: event.target.value as LedgerEntryDirection })
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </Select>
            </div>

            <div>
              <Label htmlFor="entry-category">Category</Label>
              <Input
                id="entry-category"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
                placeholder="e.g. rent, utility_bill, grocery"
              />
            </div>

            <div>
              <Label htmlFor="entry-date">Date</Label>
              <Input
                id="entry-date"
                type="date"
                value={form.occurred_on}
                onChange={(event) => setForm({ ...form, occurred_on: event.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="entry-description">Description</Label>
              <Input
                id="entry-description"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="e.g. November Rent, Electric Bill, Trader Joe's"
              />
            </div>
          </div>
        </Modal>

        {/* SUBMODULE 3: Budget & Limits */}
        {ledger && canReadEntries && activeSubmodule === 'budget' && (
          <Card className="p-6 flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">
                  {periodType === 'weekly' ? 'Weekly' : periodType === 'yearly' ? 'Yearly' : 'Monthly'} Budget & Limits
                </h2>
                <p className="text-body-sm text-muted">
                  Track spending caps against your active ledger period and configure over-budget warnings.
                </p>
              </div>
              {canReadEntries && (
                <Button size="sm" variant="outline" onClick={openBudgetModal}>
                  <Icon name="tune" className="text-[16px]" />
                  {summary.data?.budget_minor ? 'Adjust Limit' : 'Set Budget Limit'}
                </Button>
              )}
            </div>

            {summary.data?.budget_minor ? (
              <div className="rounded-2xl bg-canvas p-5 shadow-[var(--shadow-inset-sm)] flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-soft text-secondary shadow-[var(--shadow-clay-sm)]">
                      <Icon name="account_balance_wallet" className="text-[20px]" />
                    </div>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">
                        {periodType === 'weekly' ? 'Weekly' : periodType === 'yearly' ? 'Yearly' : 'Monthly'} Budget Limit
                      </h4>
                      <p className="text-body-sm text-muted">
                        Cap: <span className="font-semibold text-on-surface">{formatMoney(summary.data.budget_minor, currency)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {summary.data.is_over_budget ? (
                      <Badge tone="danger">
                        Over Budget by {formatMoney(Math.abs(summary.data.remaining_budget_minor ?? 0), currency)}
                      </Badge>
                    ) : (
                      <Badge tone="success">
                        {formatMoney(summary.data.remaining_budget_minor ?? 0, currency)} ({Math.max(0, 100 - (summary.data.budget_percent_used ?? 0)).toFixed(0)}%) Remaining
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="w-full bg-sage-soft/70 rounded-full h-3.5 overflow-hidden p-0.5 shadow-[var(--shadow-inset-sm)]">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      summary.data.is_over_budget
                        ? 'bg-tertiary'
                        : (summary.data.budget_percent_used ?? 0) > 80
                        ? 'bg-amber-500'
                        : 'bg-secondary'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, summary.data.budget_percent_used ?? 0))}%` }}
                  />
                </div>

                <div className="flex justify-between text-body-sm text-muted">
                  <span>Spent: {formatMoney(summary.data.expense_minor, currency)} ({summary.data.budget_percent_used ?? 0}%)</span>
                  <span>
                    {summary.data.is_over_budget
                      ? `Exceeded limit of ${formatMoney(summary.data.budget_minor, currency)}`
                      : `Target: ${formatMoney(summary.data.budget_minor, currency)}`}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-canvas p-5 shadow-[var(--shadow-inset-sm)] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-soft text-muted">
                    <Icon name="tune" className="text-[20px]" />
                  </div>
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">No Budget Limit Active</p>
                    <p className="text-body-sm text-muted">Set monthly, weekly, or yearly spending caps to enable budget alerts.</p>
                  </div>
                </div>
                {canReadEntries && (
                  <Button size="sm" variant="soft" onClick={openBudgetModal}>
                    <Icon name="add" className="text-[16px]" />
                    Set Budget Limit
                  </Button>
                )}
              </div>
            )}
          </Card>
        )}

        {/* SUBMODULE 4: Category Breakdown */}
        {ledger && canReadEntries && activeSubmodule === 'categories' && (
          <Card className="p-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="text-headline-sm text-on-surface">{periodLabel} Spending by Category</h2>
                  <Badge tone="neutral">
                    {activeFrom} to {activeTo}
                  </Badge>
                </div>
                <p className="text-body-sm text-muted">
                  Proportional share of expenses across categories for the selected {periodType} period.
                </p>
              </div>
              <Badge tone="neutral">{summary.data?.by_category?.length ?? 0} Categories</Badge>
            </div>

            {(summary.data?.by_category?.length ?? 0) > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.data!.by_category.map((category) => {
                  const percent = Math.round(Math.min(1, Math.max(0, category.share)) * 100);

                  return (
                    <div key={category.label} className="flex flex-col gap-2 rounded-2xl bg-canvas p-4 shadow-[var(--shadow-inset-sm)]">
                      <div className="flex items-center justify-between text-body-sm">
                        <span className="font-semibold text-on-surface">{category.display_name ?? category.label}</span>
                        <span className="font-bold text-on-surface-variant">
                          {formatMoney(category.expense_minor, currency)} · {percent}%
                        </span>
                      </div>
                      <div className="w-full bg-sage-soft rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-secondary/80 transition-all"
                          style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-body-sm text-muted py-4 text-center">
                No category expenses recorded in this period yet.
              </p>
            )}
          </Card>
        )}

        {/* SUBMODULE 5: Periodic Breakdown */}
        {ledger && activeSubmodule === 'breakdown' && (
          <div className="flex flex-col gap-4">
            {periodType === 'weekly' && summary.data?.weekly_breakdown && summary.data.weekly_breakdown.length > 0 ? (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-title-md font-bold text-on-surface">Weekly Daily Ledger Breakdown</h3>
                    <p className="text-body-sm text-muted">
                      Day-by-day expense & income tracking for the selected week ({activeFrom} to {activeTo}).
                    </p>
                  </div>
                  <Badge tone="neutral">{summary.data.weekly_breakdown.length} Days</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {summary.data.weekly_breakdown.map((d, idx) => (
                    <div key={idx} className="flex flex-col gap-1 rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)]">
                      <span className="text-label-sm font-semibold text-on-surface truncate">{d.week_label}</span>
                      <div className="flex justify-between items-baseline mt-1 text-body-sm">
                        <span className="text-muted">Spent:</span>
                        <span className="font-semibold text-tertiary">{formatMoney(d.expense_minor, currency)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-body-sm">
                        <span className="text-muted">Income:</span>
                        <span className="font-semibold text-secondary">{formatMoney(d.income_minor, currency)}</span>
                      </div>
                      <div className="border-t border-outline-variant/60 my-1 pt-1 flex justify-between items-baseline text-label-sm">
                        <span className="text-muted">Net:</span>
                        <span className={`font-bold ${d.net_minor < 0 ? 'text-tertiary' : 'text-secondary'}`}>
                          {formatMoney(d.net_minor, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : periodType === 'monthly' && summary.data?.weekly_breakdown && summary.data.weekly_breakdown.length > 0 ? (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-title-md font-bold text-on-surface">Weekly Ledger Breakdown</h3>
                    <p className="text-body-sm text-muted">Weekly tracking within the monthly billing period.</p>
                  </div>
                  <Badge tone="neutral">{summary.data.weekly_breakdown.length} Weeks</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {summary.data.weekly_breakdown.map((w, idx) => (
                    <div key={idx} className="flex flex-col gap-1 rounded-xl bg-surface p-3.5 border border-outline-variant">
                      <span className="text-label-sm font-semibold text-on-surface truncate">{w.week_label}</span>
                      <div className="flex justify-between items-baseline mt-1 text-body-sm">
                        <span className="text-muted">Spent:</span>
                        <span className="font-semibold text-tertiary">{formatMoney(w.expense_minor, currency)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-body-sm">
                        <span className="text-muted">Income:</span>
                        <span className="font-semibold text-secondary">{formatMoney(w.income_minor, currency)}</span>
                      </div>
                      <div className="border-t border-outline-variant/60 my-1 pt-1 flex justify-between items-baseline text-label-sm">
                        <span className="text-muted">Net:</span>
                        <span className={`font-bold ${w.net_minor < 0 ? 'text-tertiary' : 'text-secondary'}`}>
                          {formatMoney(w.net_minor, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : periodType === 'yearly' && summary.data?.weekly_breakdown && summary.data.weekly_breakdown.length > 0 ? (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-title-md font-bold text-on-surface">Annual 12-Month Ledger Breakdown</h3>
                    <p className="text-body-sm text-muted">Monthly expense & income performance across the entire year.</p>
                  </div>
                  <Badge tone="neutral">12 Months</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {summary.data.weekly_breakdown.map((m, idx) => (
                    <div key={idx} className="flex flex-col gap-1 rounded-xl bg-surface p-3.5 border border-outline-variant">
                      <span className="text-label-sm font-semibold text-on-surface truncate">{m.week_label}</span>
                      <div className="flex justify-between items-baseline mt-1 text-body-sm">
                        <span className="text-muted">Spent:</span>
                        <span className="font-semibold text-tertiary">{formatMoney(m.expense_minor, currency)}</span>
                      </div>
                      <div className="flex justify-between items-baseline text-body-sm">
                        <span className="text-muted">Income:</span>
                        <span className="font-semibold text-secondary">{formatMoney(m.income_minor, currency)}</span>
                      </div>
                      <div className="border-t border-outline-variant/60 my-1 pt-1 flex justify-between items-baseline text-label-sm">
                        <span className="text-muted">Net:</span>
                        <span className={`font-bold ${m.net_minor < 0 ? 'text-tertiary' : 'text-secondary'}`}>
                          {formatMoney(m.net_minor, currency)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-body-md text-muted">
                No breakdown data available for this range yet.
              </Card>
            )}
          </div>
        )}

        {/* SUBMODULE 4: Recurring Household Expenses */}
        {ledger && canReadEntries && activeSubmodule === 'recurring' && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="update" className="text-secondary text-[22px]" />
                <h3 className="text-title-md font-bold text-on-surface">Recurring Household Expenses</h3>
              </div>
              <Link to="/recurring">
                <span className="text-label-sm font-semibold text-secondary hover:underline cursor-pointer">
                  Manage Rules →
                </span>
              </Link>
            </div>
            <p className="text-body-sm text-muted mb-4">
              Scheduled chores, rent, and utility bills that automatically spawn tasks and expense entries.
            </p>
            {relevantRecurringExpenses.length === 0 ? (
              <p className="text-body-sm text-muted italic">No recurring rules configured for this ledger.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {relevantRecurringExpenses.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between rounded-xl bg-surface p-3 border border-outline-variant">
                    <div className="truncate">
                      <p className="font-semibold text-on-surface text-label-md truncate">{rule.title}</p>
                      <p className="text-body-sm text-muted capitalize">{rule.cadence} · {rule.category ?? 'expense'}</p>
                    </div>
                    {rule.amount_minor != null && (
                      <span className="text-label-md font-bold text-tertiary shrink-0">
                        {formatMoney(rule.amount_minor, currency)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* SUBMODULE 5: Access List */}
        {ledger && isOwner && activeSubmodule === 'access' && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-headline-sm text-on-surface">Who can see this ledger</h2>
                <p className="text-body-sm text-muted">
                  Managers record entries and see every line; summary members see the totals only.
                </p>
              </div>
              <Badge tone="neutral">
                {ledger.member_count} {ledger.member_count === 1 ? 'member' : 'members'}
              </Badge>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {memberList.map((member) => (
                <AccessRow
                  key={member.id}
                  member={member}
                  disabled={accessBusy}
                  onGrant={(grantRole) =>
                    grant.mutate({ userId: member.user_id, grantRole })
                  }
                  onRevoke={() => revoke.mutate(member.user_id)}
                />
              ))}
              {roster.isSuccess && memberList.length === 0 && (
                <li className="text-body-sm text-muted">
                  You are the only member in this household right now.
                </li>
              )}
            </ul>
          </Card>
        )}

        {/* Budget Limiting Modal */}
        <Modal
          open={budgetModalOpen}
          onClose={() => setBudgetModalOpen(false)}
          title="Configure Budget Limiting"
          description="Set spending caps to track against your household expenses and receive over-budget warnings."
          footer={
            <>
              <Button variant="ghost" onClick={() => setBudgetModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={updateBudget.isPending} onClick={() => updateBudget.mutate()}>
                {updateBudget.isPending ? 'Saving…' : 'Save Budget Limits'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="monthly-budget">Monthly Budget Limit ({currency})</Label>
              <Input
                id="monthly-budget"
                inputMode="decimal"
                value={budgetMonthlyInput}
                onChange={(e) => setBudgetMonthlyInput(e.target.value)}
                placeholder="e.g. 1500.00"
              />
              <span className="text-[12px] text-muted">Max planned spending across the full month.</span>
            </div>
            <div>
              <Label htmlFor="weekly-budget">Weekly Budget Limit ({currency})</Label>
              <Input
                id="weekly-budget"
                inputMode="decimal"
                value={budgetWeeklyInput}
                onChange={(e) => setBudgetWeeklyInput(e.target.value)}
                placeholder="e.g. 350.00"
              />
              <span className="text-[12px] text-muted">Target weekly budget limit for groceries and chores.</span>
            </div>
            <div>
              <Label htmlFor="yearly-budget">Yearly Budget Limit ({currency})</Label>
              <Input
                id="yearly-budget"
                inputMode="decimal"
                value={budgetYearlyInput}
                onChange={(e) => setBudgetYearlyInput(e.target.value)}
                placeholder="e.g. 18000.00"
              />
              <span className="text-[12px] text-muted">Annual maximum spending cap across all 12 months.</span>
            </div>
          </div>
        </Modal>

        {/* OCR Scan Modal */}
        <Modal
          open={showOcrModal}
          onClose={() => setShowOcrModal(false)}
          title="Scan Paper Receipt (OCR)"
          description="Extract merchant, items, taxes, and totals from your paper receipts directly into your household ledger."
          footer={
            <>
              <Button variant="ghost" onClick={() => setShowOcrModal(false)}>
                Close
              </Button>
              <Button
                disabled={ocrScanning || !ocrFile}
                onClick={handleScanReceipt}
                className="flex items-center gap-1.5"
              >
                <Icon name="document_scanner" className="text-[18px]" />
                {ocrScanning ? 'Scanning Receipt…' : 'Extract & Save'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {ocrError && <Alert tone="error">{ocrError}</Alert>}
            <div>
              <Label htmlFor="receipt-image">Receipt Image</Label>
              <Input
                id="receipt-image"
                type="file"
                accept="image/*"
                onChange={(e) => setOcrFile(e.target.files?.[0] ?? null)}
              />
              <span className="text-[12px] text-muted">Supports JPG, PNG receipts with clear lighting.</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                id="ocr-auto-record"
                type="checkbox"
                checked={ocrAutoRecord}
                onChange={(e) => setOcrAutoRecord(e.target.checked)}
                className="rounded border-outline text-secondary focus:ring-secondary"
              />
              <Label htmlFor="ocr-auto-record" className="cursor-pointer">
                Automatically record extracted total as an expense entry on this ledger
              </Label>
            </div>
            {ocrResult && (
              <div className="rounded-xl border border-secondary/30 bg-sage-soft p-4 flex flex-col gap-2">
                <span className="font-bold text-secondary">
                  Merchant: {ocrResult.merchant}
                </span>
                <span className="text-body-sm text-on-surface">
                  Total: {formatMoney(ocrResult.total_minor, ocrResult.currency)} · Confidence: {ocrResult.confidence}%
                </span>
              </div>
            )}
          </div>
        </Modal>

        {/* Create Additional Ledger Modal */}
        {createLedgerOpen && (
          <Modal
            open
            onClose={() => setCreateLedgerOpen(false)}
            title="Set up another household ledger"
            description="Create another shared or private expense book for your household."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateLedgerOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="lg"
                  disabled={createLedger.isPending || newLedgerName.trim() === ''}
                  onClick={() => createLedger.mutate()}
                >
                  {createLedger.isPending ? 'Creating…' : 'Create ledger'}
                </Button>
              </>
            }
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (newLedgerName.trim() !== '') createLedger.mutate();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-ledger-name">Ledger name</Label>
                <Input
                  id="new-ledger-name"
                  placeholder="e.g. Vacation fund, Side business"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-ledger-monthly">Monthly spending limit (optional)</Label>
                <Input
                  id="new-ledger-monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 1500.00"
                  value={newLedgerMonthly}
                  onChange={(e) => setNewLedgerMonthly(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-ledger-weekly">Weekly spending limit (optional)</Label>
                <Input
                  id="new-ledger-weekly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 400.00"
                  value={newLedgerWeekly}
                  onChange={(e) => setNewLedgerWeekly(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new-ledger-yearly">Yearly spending limit (optional)</Label>
                <Input
                  id="new-ledger-yearly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 20000.00"
                  value={newLedgerYearly}
                  onChange={(e) => setNewLedgerYearly(e.target.value)}
                />
              </div>
            </form>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}

function SummaryCard({
  summary,
  currency,
  loading,
  periodType,
  onPeriodChange,
  error,
  onRetry,
}: {
  summary: LedgerSummary | undefined;
  currency: string;
  loading: boolean;
  periodType: 'monthly' | 'weekly' | 'yearly';
  onPeriodChange: (type: 'monthly' | 'weekly' | 'yearly') => void;
  error?: unknown;
  onRetry: () => void;
}) {
  if (error) {
    return <QueryError error={error} what="this period's totals" onRetry={onRetry} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-headline-sm text-on-surface">This period</h2>
          {loading || !summary ? (
            <div className="mt-1.5 h-4 w-56 animate-pulse rounded bg-forest-soft/60" />
          ) : (
            <span className="text-label-sm text-muted">
              {summary.period?.from ?? summary.from} to {summary.period?.to ?? summary.to} · {summary.entry_count}{' '}
              {summary.entry_count === 1 ? 'entry' : 'entries'} · {currency}
            </span>
          )}
        </div>

        {/* Period Switcher (Monthly vs Weekly vs Yearly Ledger) */}
        <div className="inline-flex gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)]">
          <button
            type="button"
            onClick={() => onPeriodChange('monthly')}
            className={`rounded-xl px-3.5 py-1.5 text-label-sm font-semibold transition-all ${
              periodType === 'monthly'
                ? 'bg-surface shadow-[var(--shadow-clay-sm)] text-secondary font-bold'
                : 'text-muted hover:text-on-surface'
            }`}
          >
            Monthly Ledger
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('weekly')}
            className={`rounded-xl px-3.5 py-1.5 text-label-sm font-semibold transition-all ${
              periodType === 'weekly'
                ? 'bg-surface shadow-[var(--shadow-clay-sm)] text-secondary font-bold'
                : 'text-muted hover:text-on-surface'
            }`}
          >
            Weekly Ledger
          </button>
          <button
            type="button"
            onClick={() => onPeriodChange('yearly')}
            className={`rounded-xl px-3.5 py-1.5 text-label-sm font-semibold transition-all ${
              periodType === 'yearly'
                ? 'bg-surface shadow-[var(--shadow-clay-sm)] text-secondary font-bold'
                : 'text-muted hover:text-on-surface'
            }`}
          >
            Yearly Ledger
          </button>
        </div>
      </Card>

      {/* 3 Soft UI Stat Cards (or 1:1 matching StatGridSkeleton when loading) */}
      {loading || !summary ? (
        <StatGridSkeleton count={3} />
      ) : (
        <StatGrid count={3}>
          <StatCard
            title="Total Spent"
            value={formatMoney(summary.expense_minor, currency)}
            icon="payments"
            tone="coral"
            valueClassName="text-tertiary"
            highlight={
              <StatHighlight tone="danger">
                {summary.entry_count} {summary.entry_count === 1 ? 'Entry' : 'Entries'}
              </StatHighlight>
            }
          />
          <StatCard
            title="Total Income"
            value={formatMoney(summary.income_minor, currency)}
            icon="trending_up"
            tone="forest"
            valueClassName="text-secondary"
            highlight={
              <StatHighlight tone="success">
                {periodType === 'weekly' ? 'Weekly' : periodType === 'yearly' ? 'Yearly' : 'Monthly'} Inflow
              </StatHighlight>
            }
          />
          <StatCard
            title={summary.net_minor < 0 ? 'Net Outflow' : 'Net Surplus'}
            value={formatMoney(summary.net_minor, currency)}
            icon="account_balance_wallet"
            tone={summary.net_minor < 0 ? 'coral' : 'sage'}
            valueClassName={summary.net_minor < 0 ? 'text-tertiary' : 'text-secondary'}
            highlight={
              <StatHighlight tone={summary.net_minor < 0 ? 'danger' : 'success'}>
                {summary.net_minor < 0 ? 'Deficit' : 'Positive Net'}
              </StatHighlight>
            }
          />
        </StatGrid>
      )}
    </div>
  );
}

function AccessRow({
  member,
  disabled,
  onGrant,
  onRevoke,
}: {
  member: TenantMember;
  disabled: boolean;
  onGrant: (role: LedgerGrantRole) => void;
  onRevoke: () => void;
}) {
  const [role, setRole] = useState<LedgerGrantRole>('manager');

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-canvas p-3">
      <div className="flex items-center gap-3">
        <Avatar name={member.name ?? 'Member'} size="md" />
        <div className="flex flex-col">
          <span className="text-label-lg font-semibold text-on-surface">{member.name}</span>
          <span className="text-body-sm text-muted">{member.role}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Select
          value={role}
          disabled={disabled}
          onChange={(event) => setRole(event.target.value as LedgerGrantRole)}
          className="w-36"
        >
          <option value="manager">Manager</option>
          <option value="summary">Totals only</option>
        </Select>

        <Button size="sm" disabled={disabled} onClick={() => onGrant(role)}>
          Grant
        </Button>
        <Button size="sm" variant="ghost" className="text-error" disabled={disabled} onClick={onRevoke}>
          Revoke
        </Button>
      </div>
    </li>
  );
}
