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
import type { FinancialTax, TaxStatus, TaxType } from '@/types';

const TAX_TYPES: { key: TaxType; label: string }[] = [
  { key: 'property', label: 'Property Tax' },
  { key: 'income', label: 'Income / Estimated Tax' },
  { key: 'municipal', label: 'Municipal / City Tax' },
  { key: 'sales', label: 'Sales / Value Added Tax' },
  { key: 'other', label: 'Other Tax / Levy' },
];

export function TaxesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'property' as TaxType,
    tax_year: new Date().getFullYear().toString(),
    amount: '',
    due_date: '',
    authority: '',
    status: 'pending' as TaxStatus,
    notes: '',
  });

  const taxes = useQuery({
    queryKey: ['finances', 'taxes'],
    queryFn: async () => (await api.get<{ data: FinancialTax[] }>('/v1/finances/taxes')).data.data,
  });

  const createTax = useMutation({
    mutationFn: async () => {
      const amountMinor = parseMoneyToMinor(form.amount);
      return api.post('/v1/finances/taxes', {
        name: form.name,
        type: form.type,
        tax_year: parseInt(form.tax_year, 10),
        amount_minor: amountMinor,
        due_date: form.due_date,
        authority: form.authority || null,
        status: form.status,
        notes: form.notes || null,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setNotice('Tax assessment recorded.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const markPaid = useMutation({
    mutationFn: async (id: number) => {
      return api.patch(`/v1/finances/taxes/${id}`, {
        status: 'paid',
        paid_at: new Date().toISOString(),
      });
    },
    onSuccess: async () => {
      setNotice('Tax marked as paid!');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteTax = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/finances/taxes/${id}`),
    onSuccess: async () => {
      setNotice('Tax entry removed.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const openCreateModal = () => {
    setForm({
      name: '',
      type: 'property',
      tax_year: new Date().getFullYear().toString(),
      amount: '',
      due_date: '',
      authority: '',
      status: 'pending',
      notes: '',
    });
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Taxes & Filings"
          description="Track county property taxes, estimated income taxes, annual levies, and filing status."
          titleSize="headline"
          actions={
            <Button onClick={openCreateModal}>
              <Icon name="add" className="text-[18px] mr-1.5" />
              Add Tax Assessment
            </Button>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}

        {taxes.isError && (
          <QueryError error={taxes.error} what="taxes" onRetry={() => void taxes.refetch()} />
        )}

        {taxes.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {taxes.data && taxes.data.length === 0 && (
          <EmptyState
            title="No taxes scheduled"
            description="Add upcoming county property taxes, annual road levies, or estimated taxes to keep track of due dates."
            action={<Button onClick={openCreateModal}>Record First Tax</Button>}
          />
        )}

        {taxes.data && taxes.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {taxes.data.map((item) => {
              const isPaid = item.status === 'paid';
              const isOverdue = item.status === 'overdue';

              return (
                <Card key={item.id} className="p-5 flex flex-col justify-between h-full w-full">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Badge tone="neutral" className="capitalize mb-1.5">
                          {item.type} · Year {item.tax_year}
                        </Badge>
                        <h3 className="text-title-md font-bold text-on-surface">{item.name}</h3>
                        {item.authority && (
                          <p className="text-body-xs text-muted">Authority: {item.authority}</p>
                        )}
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-secondary/15 text-secondary'
                            : isOverdue
                            ? 'bg-error/15 text-error'
                            : 'bg-tertiary/15 text-tertiary'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="mt-4 mb-2">
                      <span className="text-xs text-muted uppercase tracking-wider">Amount Due</span>
                      <div
                        className={`text-title-lg font-black ${
                          isPaid ? 'text-secondary' : isOverdue ? 'text-error' : 'text-on-surface'
                        }`}
                      >
                        {formatMoney(item.amount_minor, item.currency)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-body-xs text-muted mt-2">
                      <Icon name="event" className="text-[16px]" />
                      <span>Due Date: {item.due_date}</span>
                    </div>

                    {item.paid_at && (
                      <div className="flex items-center gap-1.5 text-body-xs text-secondary mt-1">
                        <Icon name="check_circle" className="text-[16px]" />
                        <span>Paid on: {new Date(item.paid_at).toLocaleDateString()}</span>
                      </div>
                    )}

                    {item.notes && (
                      <p className="mt-3 text-body-xs text-muted italic border-t border-outline-variant/40 pt-2">
                        {item.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-5 pt-3 border-t border-outline-variant/40">
                    {!isPaid && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => markPaid.mutate(item.id)}
                        disabled={markPaid.isPending}
                      >
                        <Icon name="done_all" className="text-[16px] mr-1" />
                        Mark as Paid
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-error hover:bg-error/10"
                      onClick={() => {
                        if (confirm(`Remove tax entry "${item.name}"?`)) {
                          deleteTax.mutate(item.id);
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

        {/* Add Tax Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Tax Assessment"
          description="Log upcoming property taxes, income taxes, or municipal assessments."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={createTax.isPending} onClick={() => createTax.mutate()}>
                {createTax.isPending ? 'Saving…' : 'Save Tax'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="tax-name">Description / Name</Label>
              <Input
                id="tax-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. County Real Estate Property Tax (First Half)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-type">Tax Type</Label>
                <Select
                  id="tax-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  {TAX_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="tax-year">Tax Year</Label>
                <Input
                  id="tax-year"
                  type="number"
                  value={form.tax_year}
                  onChange={(e) => setForm({ ...form, tax_year: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-amount">Amount</Label>
                <Input
                  id="tax-amount"
                  type="number"
                  step="any"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="e.g. 2400.00"
                />
              </div>

              <div>
                <Label htmlFor="tax-due">Due Date</Label>
                <Input
                  id="tax-due"
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tax-authority">Tax Authority</Label>
                <Input
                  id="tax-authority"
                  value={form.authority}
                  onChange={(e) => setForm({ ...form, authority: e.target.value })}
                  placeholder="e.g. County Treasurer, IRS"
                />
              </div>

              <div>
                <Label htmlFor="tax-status">Status</Label>
                <Select
                  id="tax-status"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                >
                  <option value="pending">Pending</option>
                  <option value="filed">Filed</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="tax-notes">Notes (optional)</Label>
              <Input
                id="tax-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Paid via escrow or direct check"
              />
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
