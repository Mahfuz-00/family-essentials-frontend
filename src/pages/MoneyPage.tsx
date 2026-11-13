import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
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
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { parseMoneyToMinor } from '@/lib/money';
import type { Ledger, LedgerRole } from '@/types';

const roleLabel: Record<LedgerRole, string> = {
  owner: 'Owner',
  manager: 'Manager',
  summary: 'Totals only',
};

const roleDetail: Record<LedgerRole, string> = {
  owner: 'Records entries, adds people and sets who sees what.',
  manager: 'Records entries and reads every line.',
  summary: 'Sees the totals for the period, not the individual entries.',
};

export function MoneyPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState('');
  const [yearlyBudget, setYearlyBudget] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ledgers = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const list = ledgers.data ?? [];

  // When a single ledger exists, straight up open the ledger directly
  useEffect(() => {
    if (ledgers.isSuccess && list.length === 1) {
      navigate({
        to: '/money/$ledgerId',
        params: { ledgerId: String(list[0].id) },
        replace: true,
      });
    }
  }, [ledgers.isSuccess, list, navigate]);

  const create = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { name: name.trim() };
      if (monthlyBudget) payload.monthly_budget_minor = parseMoneyToMinor(monthlyBudget);
      if (weeklyBudget) payload.weekly_budget_minor = parseMoneyToMinor(weeklyBudget);
      if (yearlyBudget) payload.yearly_budget_minor = parseMoneyToMinor(yearlyBudget);
      return api.post<{ data: Ledger }>('/v1/ledgers', payload);
    },
    onSuccess: async (response) => {
      setName('');
      setMonthlyBudget('');
      setWeeklyBudget('');
      setYearlyBudget('');
      setCreateOpen(false);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      const createdId = response.data?.data?.id;
      if (createdId) {
        navigate({
          to: '/money/$ledgerId',
          params: { ledgerId: String(createdId) },
          replace: true,
        });
      }
    },
    onError: (caught: unknown) => {
      setError(apiError(caught));
    },
  });

  const openCreate = () => {
    setName('');
    setMonthlyBudget('');
    setWeeklyBudget('');
    setYearlyBudget('');
    setError(null);
    setCreateOpen(true);
  };

  if (ledgers.isLoading || (ledgers.isSuccess && list.length === 1)) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6 max-w-6xl">
          <PageHeader
            title="Household Budget &amp; Ledger"
            description="Opening your household ledger..."
            titleSize="headline"
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        <PageHeader
          title="Household Money &amp; Budgets"
          description="What the household has spent and taken in, held in shared ledgers with separate balances and budget limits."
          titleSize="headline"
          actions={
            list.length > 0 && (
              <Button size="lg" onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Set up a budget
              </Button>
            )
          }
        />

        {error && <Alert tone="error">{error}</Alert>}
        {ledgers.isError && <Alert>{apiError(ledgers.error)}</Alert>}

        {ledgers.isSuccess && list.length === 0 && (
          <EmptyState
            title="No ledger yet"
            description="A ledger keeps the household's spending in one place, and decides who sees the totals and who sees each entry."
            action={
              <Button size="lg" onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Set up a budget
              </Button>
            }
          />
        )}

        {list.length > 1 && (
          <section aria-label="Your ledgers" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {list.map((item) => (
              <Card key={item.id} className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="account_balance_wallet" className="text-[22px]" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <Link
                        to="/money/$ledgerId"
                        params={{ ledgerId: String(item.id) }}
                        className="hover:underline"
                      >
                        <h2 className="truncate text-headline-sm text-on-surface">{item.name}</h2>
                      </Link>
                      <span className="text-body-sm text-muted">
                        {item.member_count ?? 1} {item.member_count === 1 ? 'member' : 'members'}
                      </span>
                    </span>
                  </span>
                  {item.my_role && (
                    <Badge tone={item.my_role === 'owner' ? 'primary' : 'neutral'}>
                      {roleLabel[item.my_role]}
                    </Badge>
                  )}
                </div>

                <p className="text-body-sm text-muted">
                  {item.my_role ? roleDetail[item.my_role] : 'Shared household expense ledger.'}
                </p>

                <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                  <span className="text-xs text-muted">Currency: {item.currency}</span>
                  <Link to="/money/$ledgerId" params={{ ledgerId: String(item.id) }}>
                    <Button variant="outline" size="sm">
                      <Icon name="arrow_forward" className="text-[16px]" />
                      Open Ledger
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </section>
        )}

        {/* Create Ledger Modal */}
        {createOpen && (
          <Modal
            open
            onClose={() => setCreateOpen(false)}
            title="Set up a budget"
            description="A ledger for household spending, budgeting, and shared expenses."
            footer={
              <>
                <Button variant="ghost" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="lg"
                  disabled={create.isPending || name.trim() === ''}
                  onClick={() => create.mutate()}
                >
                  {create.isPending ? 'Creating…' : 'Create ledger'}
                </Button>
              </>
            }
          >
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim() !== '') create.mutate();
              }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-ledger-name">What is this budget for?</Label>
                <Input
                  id="create-ledger-name"
                  placeholder="e.g. Household spending"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-ledger-monthly">Monthly spending limit (optional)</Label>
                <Input
                  id="create-ledger-monthly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 2500.00"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-ledger-weekly">Weekly spending limit (optional)</Label>
                <Input
                  id="create-ledger-weekly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 600.00"
                  value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="create-ledger-yearly">Yearly spending limit (optional)</Label>
                <Input
                  id="create-ledger-yearly"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 30000.00"
                  value={yearlyBudget}
                  onChange={(e) => setYearlyBudget(e.target.value)}
                />
              </div>

              {error && <Alert tone="error">{error}</Alert>}
            </form>
          </Modal>
        )}
      </div>
    </AppLayout>
  );
}
