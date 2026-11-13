import { useState } from 'react';
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
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { formatMoney, parseMoneyToMinor } from '@/lib/money';
import type { FinancialLiability, LiabilityType } from '@/types';

const LIABILITY_TYPES: { key: LiabilityType; label: string }[] = [
  { key: 'mortgage', label: 'Home Mortgage' },
  { key: 'loan', label: 'Personal Loan' },
  { key: 'auto_loan', label: 'Auto Loan' },
  { key: 'student_loan', label: 'Student Loan' },
  { key: 'credit_card', label: 'Credit Card / Line' },
  { key: 'other', label: 'Other Debt' },
];

export function LiabilitiesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedLiability, setSelectedLiability] = useState<FinancialLiability | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'mortgage' as LiabilityType,
    lender: '',
    principal_amount: '',
    remaining_balance: '',
    monthly_payment: '',
    interest_rate: '',
    due_day_of_month: '1',
    notes: '',
  });

  const liabilities = useQuery({
    queryKey: ['finances', 'liabilities'],
    queryFn: async () => (await api.get<{ data: FinancialLiability[] }>('/v1/finances/liabilities')).data.data,
  });

  const createLiability = useMutation({
    mutationFn: async () => {
      const principalMinor = parseMoneyToMinor(form.principal_amount);
      const remainingMinor = form.remaining_balance
        ? parseMoneyToMinor(form.remaining_balance)
        : principalMinor;
      const monthlyMinor = form.monthly_payment ? parseMoneyToMinor(form.monthly_payment) : null;
      const rateBps = form.interest_rate ? Math.round(parseFloat(form.interest_rate) * 100) : null;

      return api.post('/v1/finances/liabilities', {
        name: form.name,
        type: form.type,
        lender: form.lender || null,
        principal_amount_minor: principalMinor,
        remaining_balance_minor: remainingMinor,
        monthly_payment_minor: monthlyMinor,
        interest_rate_bps: rateBps,
        due_day_of_month: form.due_day_of_month ? parseInt(form.due_day_of_month, 10) : null,
        notes: form.notes || null,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setNotice('Liability recorded successfully.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      if (!selectedLiability) return;
      const amountPaidMinor = parseMoneyToMinor(payAmount);
      if (amountPaidMinor === null) return;
      const newRemaining = Math.max(0, selectedLiability.remaining_balance_minor - amountPaidMinor);
      return api.patch(`/v1/finances/liabilities/${selectedLiability.id}`, {
        remaining_balance_minor: newRemaining,
        status: newRemaining === 0 ? 'paid_off' : selectedLiability.status,
      });
    },
    onSuccess: async () => {
      setPayModalOpen(false);
      setPayAmount('');
      setSelectedLiability(null);
      setNotice('Principal payment recorded!');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteLiability = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/finances/liabilities/${id}`),
    onSuccess: async () => {
      setNotice('Liability removed.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const openCreateModal = () => {
    setForm({
      name: '',
      type: 'mortgage',
      lender: '',
      principal_amount: '',
      remaining_balance: '',
      monthly_payment: '',
      interest_rate: '',
      due_day_of_month: '1',
      notes: '',
    });
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Loans & Mortgages"
          description="Track mortgage amortization, auto loans, personal debt balances, interest rates, and payoff schedules."
          titleSize="headline"
          actions={
            <Button onClick={openCreateModal}>
              <Icon name="add" className="text-[18px] mr-1.5" />
              Add Loan or Mortgage
            </Button>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}

        {liabilities.isError && (
          <QueryError error={liabilities.error} what="liabilities" onRetry={() => void liabilities.refetch()} />
        )}

        {liabilities.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {liabilities.data && liabilities.data.length === 0 && (
          <EmptyState
            title="No loans or mortgages tracked"
            description="Add your home mortgage or other loans to track debt paydown and net worth accurately."
            action={<Button onClick={openCreateModal}>Add First Liability</Button>}
          />
        )}

        {liabilities.data && liabilities.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {liabilities.data.map((item) => {
              const isPaid = item.status === 'paid_off' || item.remaining_balance_minor === 0;
              return (
                <Card key={item.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Badge tone={item.type === 'mortgage' ? 'primary' : 'neutral'} className="capitalize mb-1.5">
                          {item.type.replace('_', ' ')}
                        </Badge>
                        <h3 className="text-title-md font-bold text-on-surface">{item.name}</h3>
                        {item.lender && <p className="text-body-xs text-muted">Lender: {item.lender}</p>}
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isPaid ? 'bg-secondary/15 text-secondary' : 'bg-tertiary/15 text-tertiary'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-4 mb-2">
                      <span className="text-xs text-muted uppercase tracking-wider">Remaining Balance</span>
                      <div className="text-title-lg font-black text-tertiary">
                        {formatMoney(item.remaining_balance_minor, item.currency)}
                      </div>
                      <span className="text-body-xs text-muted">
                        of {formatMoney(item.principal_amount_minor, item.currency)} principal
                      </span>
                    </div>

                    {/* Payoff Progress */}
                    <div className="w-full bg-outline-variant/40 rounded-full h-2.5 overflow-hidden my-2">
                      <div
                        className="h-full bg-secondary transition-all rounded-full"
                        style={{ width: `${Math.min(100, Math.max(0, item.payoff_percent))}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted">
                      <span>{item.payoff_percent.toFixed(1)}% paid off</span>
                      {item.interest_rate_percent != null && <span>{item.interest_rate_percent}% APR</span>}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-outline-variant/40 text-body-xs">
                      {item.monthly_payment_minor != null && (
                        <div>
                          <span className="text-muted block">Monthly Payment:</span>
                          <span className="font-semibold text-on-surface">
                            {formatMoney(item.monthly_payment_minor, item.currency)}
                          </span>
                        </div>
                      )}
                      {item.due_day_of_month != null && (
                        <div>
                          <span className="text-muted block">Due Day:</span>
                          <span className="font-semibold text-on-surface">
                            Day {item.due_day_of_month} of month
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-outline-variant/40">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setSelectedLiability(item);
                        setPayAmount('');
                        setPayModalOpen(true);
                      }}
                    >
                      <Icon name="payments" className="text-[16px] mr-1" />
                      Record Payment
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error/10"
                      onClick={() => {
                        if (confirm(`Remove liability "${item.name}"?`)) {
                          deleteLiability.mutate(item.id);
                        }
                      }}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Create Liability Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Loan or Mortgage"
          description="Log debt instruments, lenders, interest rates, and balances."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={createLiability.isPending} onClick={() => createLiability.mutate()}>
                {createLiability.isPending ? 'Saving…' : 'Save Liability'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="liability-name">Name</Label>
              <Input
                id="liability-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Primary Residence 30-Year Mortgage"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="liability-type">Type</Label>
                <Select
                  id="liability-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  {LIABILITY_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="liability-lender">Lender / Institution</Label>
                <Input
                  id="liability-lender"
                  value={form.lender}
                  onChange={(e) => setForm({ ...form, lender: e.target.value })}
                  placeholder="e.g. Chase, Wells Fargo"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="liability-principal">Original Principal</Label>
                <Input
                  id="liability-principal"
                  type="number"
                  step="any"
                  value={form.principal_amount}
                  onChange={(e) => setForm({ ...form, principal_amount: e.target.value })}
                  placeholder="e.g. 400000"
                />
              </div>

              <div>
                <Label htmlFor="liability-remaining">Current Balance</Label>
                <Input
                  id="liability-remaining"
                  type="number"
                  step="any"
                  value={form.remaining_balance}
                  onChange={(e) => setForm({ ...form, remaining_balance: e.target.value })}
                  placeholder="e.g. 320000"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="liability-rate">Interest % (APR)</Label>
                <Input
                  id="liability-rate"
                  type="number"
                  step="0.01"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: e.target.value })}
                  placeholder="e.g. 6.25"
                />
              </div>

              <div>
                <Label htmlFor="liability-monthly">Monthly Payment</Label>
                <Input
                  id="liability-monthly"
                  type="number"
                  step="any"
                  value={form.monthly_payment}
                  onChange={(e) => setForm({ ...form, monthly_payment: e.target.value })}
                  placeholder="e.g. 2400"
                />
              </div>

              <div>
                <Label htmlFor="liability-due-day">Due Day (1-31)</Label>
                <Input
                  id="liability-due-day"
                  type="number"
                  min="1"
                  max="31"
                  value={form.due_day_of_month}
                  onChange={(e) => setForm({ ...form, due_day_of_month: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="liability-notes">Notes (optional)</Label>
              <Input
                id="liability-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Fixed rate, escrow included"
              />
            </div>
          </div>
        </Modal>

        {/* Record Payment Modal */}
        <Modal
          open={payModalOpen}
          onClose={() => setPayModalOpen(false)}
          title={`Record Payment for "${selectedLiability?.name}"`}
          description="Deduct principal payment from remaining balance."
          footer={
            <>
              <Button variant="ghost" onClick={() => setPayModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={recordPayment.isPending} onClick={() => recordPayment.mutate()}>
                {recordPayment.isPending ? 'Recording…' : 'Record Payment'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="pay-amount">Payment Amount</Label>
              <Input
                id="pay-amount"
                type="number"
                step="any"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="e.g. 2400.00"
                autoFocus
              />
            </div>
            {selectedLiability && (
              <p className="text-body-sm text-muted">
                Current remaining balance:{' '}
                {formatMoney(selectedLiability.remaining_balance_minor, selectedLiability.currency)}
              </p>
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
