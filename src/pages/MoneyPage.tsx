import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
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

/**
 * Money: the household's ledgers, and the way into one.
 *
 * The ledger itself is its own screen because a `summary` member sees a
 * different page from an owner — the difference is decided by the API's
 * `my_role`, not by hiding controls here.
 */
export function MoneyPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const ledgers = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const create = useMutation({
    mutationFn: async () => api.post('/v1/ledgers', { name }),
    onSuccess: async () => {
      setName('');
      setCreateOpen(false);
      setError(null);
      setNotice('Ledger created. It is listed below and open to invite people into.');
      await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
    },
    onError: (caught: unknown) => {
      setError(apiError(caught));
      setNotice(null);
    },
  });

  const list = ledgers.data ?? [];

  // With no ledgers the empty state carries "Set up a budget". Once the list is
  // real the header carries it instead, so the same action never appears twice.
  const showHeaderAction = list.length > 0;

  const openCreate = () => {
    setName('');
    setError(null);
    setCreateOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Money']}
          title="Money"
          description="What the household has spent and taken in, held in ledgers you can share at the level you choose."
          titleSize="headline"
          actions={
            showHeaderAction ? (
              <Button size="lg" onClick={openCreate}>
                <Icon name="add" className="text-[18px]" />
                Set up a budget
              </Button>
            ) : undefined
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {ledgers.isError && <Alert>{apiError(ledgers.error)}</Alert>}

        {ledgers.isLoading && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {[0, 1].map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        )}

        {ledgers.isSuccess && list.length === 0 && (
          <EmptyState
            title="No ledger yet"
            description="A ledger keeps the household's spending in one place, and decides who sees the totals and who sees each entry."
            action={
              <Button size="lg" onClick={openCreate}>
                <Icon name="savings" className="text-[18px]" />
                Set up a budget
              </Button>
            }
          />
        )}

        <section aria-label="Your ledgers" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((ledger) => (
            <Card key={ledger.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="account_balance_wallet" className="text-[20px]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <Link
                      to="/money/$ledgerId"
                      params={{ ledgerId: String(ledger.id) }}
                      className="truncate text-headline-sm text-on-surface hover:underline"
                    >
                      {ledger.name}
                    </Link>
                    <span className="text-body-sm text-muted">
                      {ledger.currency} · {ledger.member_count}{' '}
                      {ledger.member_count === 1 ? 'member' : 'members'}
                    </span>
                  </span>
                </span>
                <Badge tone={ledger.my_role === 'summary' ? 'neutral' : 'primary'}>
                  {roleLabel[ledger.my_role]}
                </Badge>
              </div>

              <p className="text-body-sm text-on-surface-variant">{roleDetail[ledger.my_role]}</p>

              <Link to="/money/$ledgerId" params={{ ledgerId: String(ledger.id) }} className="inline-flex">
                <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sage-soft px-3.5 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                  <Icon name="receipt_long" className="text-[16px]" />
                  Open ledger
                </span>
              </Link>
            </Card>
          ))}
        </section>
      </div>

      {createOpen && (
        <Modal
          open
          onClose={() => setCreateOpen(false)}
          title="Set up a budget"
          description="A ledger for the household's spending. You can invite people to it afterwards."
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
          <div>
            <Label htmlFor="ledger-name">What is this budget for?</Label>
            <Input
              id="ledger-name"
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Household spending"
            />
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
