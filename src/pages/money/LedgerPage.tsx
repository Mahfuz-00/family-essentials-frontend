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
import { StaticChip } from '@/components/ui/chip';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
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
  TenantMember,
} from '@/types';


/** One month window. Derived once — a query key must never move under react-query. */
function currentMonth(): { from: string; to: string } {
  const now = new Date();

  return {
    from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

function isoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * One ledger, rendered for the caller's role in it.
 *
 * `owner` and `manager` record and read entries; `summary` sees the same totals
 * card and nothing else — no entry rows, no form, and no request to the entries
 * endpoint, which the API answers with 403 for that role. The role comes from
 * the API (`my_role`), so this screen never guesses what it may show.
 */
export function LedgerPage({ ledgerId }: { ledgerId: number }) {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: '',
    direction: 'expense' as LedgerEntryDirection,
    category: '',
    description: '',
    occurred_on: isoDate(new Date()),
  });

  const range = useMemo(currentMonth, []);

  const ledgers = useQuery({
    queryKey: ['ledgers'],
    queryFn: async () => (await api.get<{ data: Ledger[] }>('/v1/ledgers')).data.data,
  });

  const ledger = (ledgers.data ?? []).find((entry) => entry.id === ledgerId);
  const role = ledger?.my_role;
  const canReadEntries = role === 'owner' || role === 'manager';
  const isOwner = role === 'owner';

  const summary = useQuery({
    queryKey: ['ledgers', ledgerId, 'summary', range.from, range.to],
    queryFn: async () =>
      (
        await api.get<{ data: LedgerSummary }>(`/v1/ledgers/${ledgerId}/summary`, {
          params: { from: range.from, to: range.to },
        })
      ).data.data,
    enabled: ledger != null,
  });

  const entries = useQuery({
    queryKey: ['ledgers', ledgerId, 'entries'],
    queryFn: async () =>
      (await api.get<{ data: LedgerEntry[] }>(`/v1/ledgers/${ledgerId}/entries`)).data.data,
    // A summary member never asks: the endpoint answers 403 for that role and
    // there is nothing on this screen that could render a row.
    enabled: canReadEntries,
  });

  const roster = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
    // The panel is the owner's, so nobody else pays for the request.
    enabled: isOwner,
  });

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
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
      setError(null);
      setNotice('Entry recorded.');
      await refresh();
    },
    onError,
  });

  /** Parsed before the mutation starts: `apiError` would swallow a local throw. */
  const submitEntry = () => {
    const minor = parseMoneyToMinor(form.amount);

    if (minor === null) {
      setError(AMOUNT_INPUT_ERROR);
      setNotice(null);

      return;
    }

    record.mutate(minor);
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
  const entryList = entries.data ?? [];
  const memberList = (roster.data ?? []).filter((member) => member.user_id !== currentUser?.id);
  const accessBusy = grant.isPending || revoke.isPending;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Money', ledger?.name ?? 'Ledger']}
          title={ledger?.name ?? 'Ledger'}
          description={
            ledger
              ? `Totals for ${range.from} to ${range.to}, in ${ledger.currency}.`
              : 'Loading this ledger…'
          }
          titleSize="headline"
          actions={
            <Link to="/money" className="inline-flex">
              <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                <Icon name="arrow_back" className="text-[18px]" />
                All ledgers
              </span>
            </Link>
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

        {ledgers.isSuccess && !ledger && (
          <EmptyState
            title="This ledger is not yours"
            description="It may have been removed, or your access to it changed. Nothing on this account is hidden — the list is the whole list."
            action={
              <Link to="/money" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary">
                  <Icon name="receipt_long" className="text-[18px]" />
                  Back to money
                </span>
              </Link>
            }
          />
        )}

        {/* The same card for every role: what differs is what sits underneath it. */}
        {ledger && (
          <SummaryCard
            summary={summary.data}
            currency={currency}
            loading={summary.isLoading}
            error={summary.isError ? summary.error : null}
            onRetry={() => void summary.refetch()}
          />
        )}

        {ledger && !canReadEntries && (
          <Alert tone="info">
            Your role on this ledger shows the totals only — the individual entries stay with the people
            who record them.
          </Alert>
        )}

        {ledger && canReadEntries && (
          <Card className="overflow-hidden p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <div>
                <h2 className="text-headline-sm text-on-surface">Entries</h2>
                <p className="text-body-sm text-muted">
                  {summary.data?.entry_count ?? entryList.length} recorded in this period.
                </p>
              </div>
              <Badge tone="primary">{role === 'owner' ? 'You own this ledger' : 'You manage this ledger'}</Badge>
            </div>

            {entries.isLoading && <p className="px-5 pb-5 text-body-md text-muted">Loading entries…</p>}
            {entries.isError && <p className="px-5 pb-5 text-body-md text-error">{apiError(entries.error)}</p>}

            {entries.isSuccess && entryList.length === 0 && (
              <p className="px-5 pb-5 text-body-md text-muted">
                Nothing recorded in this period yet. The form below adds the first line.
              </p>
            )}

            {entryList.length > 0 && (
              <Table className="min-w-[640px]">
                <THead>
                  <TH>Date</TH>
                  <TH>What</TH>
                  <TH>Recorded by</TH>
                  <TH>Amount</TH>
                  <TH>
                    <span className="sr-only">Actions</span>
                  </TH>
                </THead>
                <tbody>
                  {entryList.map((entry) => (
                    <TR key={entry.id}>
                      <TD className="whitespace-nowrap text-muted">{formatDateOnly(entry.occurred_on)}</TD>
                      <TD>
                        <span className="flex flex-col">
                          <span className="text-label-lg text-on-surface">
                            {entry.description ?? 'No description'}
                          </span>
                          <span className="text-body-sm text-muted">
                            {entry.category ?? 'Uncategorised'}
                            {entry.source ? ` · ${entry.source}` : ''}
                          </span>
                        </span>
                      </TD>
                      <TD>
                        {entry.paid_by ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={entry.paid_by.name ?? 'Member'} size="sm" />
                            <span className="text-body-sm">{entry.paid_by.name}</span>
                          </span>
                        ) : (
                          <span className="text-body-sm text-muted">—</span>
                        )}
                      </TD>
                      <TD>
                        <span className="flex items-center gap-2">
                          {/* Direction is a word, so colour is never the only signal. */}
                          <StaticChip tone={entry.direction === 'income' ? 'success' : 'neutral'}>
                            {entry.direction === 'income' ? 'Income' : 'Expense'}
                          </StaticChip>
                          <span
                            className={`text-label-lg ${
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
                          <span className="sr-only">
                            {' '}
                            {entry.description ?? 'entry'} of {formatMoney(entry.amount_minor, currency)}
                          </span>
                        </Button>
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        )}

        {ledger && canReadEntries && (
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Record an entry</h2>
            <p className="text-body-sm text-muted">
              Type the amount in major units — it is sent as an integer number of minor units.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div>
                <Label htmlFor="entry-amount">Amount</Label>
                <Input
                  id="entry-amount"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(event) => setForm({ ...form, amount: event.target.value })}
                  placeholder="12.50"
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
                  placeholder="grocery"
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

              <div className="sm:col-span-2">
                <Label htmlFor="entry-description">Description</Label>
                <Input
                  id="entry-description"
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="Weekly shop"
                />
              </div>

              <div className="flex items-end sm:col-span-2 xl:col-span-2">
                <Button
                  size="lg"
                  disabled={record.isPending || form.amount.trim() === '' || form.occurred_on === ''}
                  onClick={submitEntry}
                >
                  <Icon name="add" className="text-[18px]" />
                  {record.isPending ? 'Saving…' : 'Record entry'}
                </Button>
              </div>
            </div>
          </Card>
        )}

        {ledger && isOwner && (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-headline-sm text-on-surface">Who can see this ledger</h2>
                <p className="text-body-sm text-muted">
                  Managers record entries and see every line; a summary member sees the totals only.
                </p>
              </div>
              <Badge tone="neutral">
                {ledger.member_count} {ledger.member_count === 1 ? 'member' : 'members'}
              </Badge>
            </div>

            <p className="mt-3 text-body-sm text-muted">
              The API does not list a ledger's members yet, so this panel shows the household roster:
              granting access gives a role, removing takes it away.
            </p>

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
                <li className="rounded-xl bg-canvas px-4 py-3 text-body-sm text-muted">
                  There is nobody else in the household to invite yet.
                </li>
              )}
            </ul>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

/** The totals card, identical for every role. */
function SummaryCard({
  summary,
  currency,
  loading,
  error,
  onRetry,
}: {
  summary: LedgerSummary | undefined;
  currency: string;
  loading: boolean;
  error?: unknown;
  onRetry: () => void;
}) {
  // A failed summary used to leave the skeletons pulsing forever.
  if (error) {
    return (
      <QueryError error={error} what="this period's totals" onRetry={onRetry} />
    );
  }

  if (loading || !summary) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((key) => (
          <SkeletonCard key={key} />
        ))}
      </div>
    );
  }

  const totals = [
    { label: 'Spent', value: formatMoney(summary.expense_minor, currency), text: 'text-tertiary' },
    { label: 'Taken in', value: formatMoney(summary.income_minor, currency), text: 'text-secondary' },
    {
      // The word carries the direction; the colour only agrees with it.
      label: summary.net_minor < 0 ? 'Net, out' : 'Net, in',
      value: formatMoney(summary.net_minor, currency),
      text: summary.net_minor < 0 ? 'text-tertiary' : 'text-secondary',
    },
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-headline-sm text-on-surface">This period</h2>
          <span className="text-label-sm text-muted">
            {summary.from} to {summary.to} · {summary.entry_count}{' '}
            {summary.entry_count === 1 ? 'entry' : 'entries'} · {currency}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {totals.map((total) => (
            <div key={total.label} className="flex flex-col gap-1 rounded-2xl bg-canvas p-4">
              <span className="text-label-sm uppercase tracking-wider text-muted">{total.label}</span>
              <span className={`text-display-lg font-bold ${total.text}`}>{total.value}</span>
            </div>
          ))}
        </div>

        {summary.by_category.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-label-sm uppercase tracking-wider text-muted">Where it went</h3>
            {summary.by_category.map((category) => {
              const percent = Math.round(Math.min(1, Math.max(0, category.share)) * 100);

              return (
                <div key={category.label} className="flex flex-col gap-1">
                  <span className="flex items-center justify-between text-body-sm">
                    <span className="text-on-surface">{category.label}</span>
                    <span className="text-on-surface-variant">
                      {formatMoney(category.expense_minor, currency)} · {percent}%
                    </span>
                  </span>
                  <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                    <span className="block h-1.5 rounded-full bg-secondary" style={{ width: `${percent}%` }} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
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
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
      <span className="flex items-center gap-3">
        <Avatar name={member.name ?? 'Member'} />
        <span className="text-label-lg text-on-surface">{member.name}</span>
      </span>

      <span className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <span className="sr-only">Ledger role for {member.name}</span>
          <Select
            className="h-10 w-auto text-body-sm"
            value={role}
            disabled={disabled}
            onChange={(event) => setRole(event.target.value as LedgerGrantRole)}
          >
            <option value="manager">Manager</option>
            <option value="summary">Totals only</option>
          </Select>
        </label>

        <Button variant="soft" size="sm" disabled={disabled} onClick={() => onGrant(role)}>
          Give access
          <span className="sr-only"> to {member.name}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-error hover:bg-coral-soft"
          disabled={disabled}
          onClick={onRevoke}
        >
          Remove
          <span className="sr-only"> {member.name} from this ledger</span>
        </Button>
      </span>
    </li>
  );
}
