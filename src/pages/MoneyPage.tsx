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
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
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

interface ScanResult {
  merchant: string;
  date: string;
  total_minor: number;
  tax_minor: number;
  subtotal_minor: number;
  currency: string;
  line_items: { name: string; price_minor: number; quantity: number; category: string }[];
  suggested_restocks: { essential_id: number; name: string; current_stock: number; threshold: number; suggested_quantity: number }[];
  recorded_entry: any | null;
  confidence: number;
}

export function MoneyPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Optical Receipt Scanner state (Gap B)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [autoRecord] = useState(true);
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | ''>('');
  const [restockedIds, setRestockedIds] = useState<number[]>([]);

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

  const scanReceiptMutation = useMutation({
    mutationFn: async (payload: { auto_record: boolean; ledger_id?: number | null }) => {
      const resp = await api.post<ScanResult>('/v1/ledger/receipts/scan', payload);
      return resp.data;
    },
    onSuccess: async (data) => {
      setScanResult(data);
      if (data.recorded_entry) {
        setNotice(`Receipt scanned and expense of $${(data.total_minor / 100).toFixed(2)} recorded to ledger.`);
        await queryClient.invalidateQueries({ queryKey: ['ledgers'] });
      }
    },
    onError: (err) => {
      setError(apiError(err));
    },
  });

  const restockMutation = useMutation({
    mutationFn: async (essentialId: number) =>
      api.post(`/v1/essentials/${essentialId}/restock`, { quantity: 1 }),
    onSuccess: (_, essentialId) => {
      setRestockedIds((prev) => [...prev, essentialId]);
      queryClient.invalidateQueries({ queryKey: ['essentials'] });
    },
  });

  const list = ledgers.data ?? [];
  const showHeaderAction = list.length > 0;

  const openCreate = () => {
    setName('');
    setError(null);
    setCreateOpen(true);
  };

  const handleScanSample = () => {
    const targetLedger = selectedLedgerId ? Number(selectedLedgerId) : list[0]?.id;
    scanReceiptMutation.mutate({
      auto_record: autoRecord,
      ledger_id: targetLedger ?? null,
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        <PageHeader
          title="Household Money &amp; Budgets"
          description="What the household has spent and taken in, held in shared ledgers with optical receipt scanning."
          titleSize="headline"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setScanResult(null);
                  setReceiptModalOpen(true);
                }}
              >
                <Icon name="document_scanner" className="text-[18px]" />
                Scan Receipt (OCR)
              </Button>
              {showHeaderAction && (
                <Button size="lg" onClick={openCreate}>
                  <Icon name="add" className="text-[18px]" />
                  Set up a budget
                </Button>
              )}
            </div>
          }
        />

        {error && <Alert tone="error">{error}</Alert>}
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
              <div className="flex gap-2">
                <Button size="lg" onClick={openCreate}>
                  <Icon name="savings" className="text-[18px]" />
                  Set up a budget
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => {
                    setScanResult(null);
                    setReceiptModalOpen(true);
                  }}
                >
                  <Icon name="document_scanner" className="text-[18px]" />
                  Scan Receipt
                </Button>
              </div>
            }
          />
        )}

        <section aria-label="Your ledgers" className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {list.map((ledger) => (
            <Card key={ledger.id} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="account_balance_wallet" className="text-[22px]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <Link
                      to="/money/$ledgerId"
                      params={{ ledgerId: String(ledger.id) }}
                      className="hover:underline"
                    >
                      <h2 className="truncate text-headline-sm text-on-surface">{ledger.name}</h2>
                    </Link>
                    <span className="text-body-sm text-muted">
                      {ledger.member_count ?? 1} {ledger.member_count === 1 ? 'member' : 'members'}
                    </span>
                  </span>
                </span>
                {ledger.my_role && (
                  <Badge tone={ledger.my_role === 'owner' ? 'primary' : 'neutral'}>
                    {roleLabel[ledger.my_role]}
                  </Badge>
                )}
              </div>

              <p className="text-body-sm text-muted">
                {ledger.my_role ? roleDetail[ledger.my_role] : 'Shared household expense ledger.'}
              </p>

              <div className="flex items-center justify-between border-t border-outline-variant/30 pt-3">
                <span className="text-xs text-muted">Currency: {ledger.currency}</span>
                <Link to="/money/$ledgerId" params={{ ledgerId: String(ledger.id) }}>
                  <Button variant="outline" size="sm">
                    <Icon name="arrow_forward" className="text-[16px]" />
                    Open Ledger
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </section>

        {/* Gap B: Optical Receipt Scanner Modal */}
        <Modal
          open={receiptModalOpen}
          onClose={() => setReceiptModalOpen(false)}
          title="Optical Receipt Scanning &amp; Expense Categorization"
        >
          <div className="flex flex-col gap-4 p-1">
            <p className="text-xs text-muted leading-relaxed">
              Upload a camera snapshot or receipt document. The OCR parser extracts merchant details, dates, line items, taxes, automatically categorizes the movement into your shared ledger, and suggests restocks for matching pantry essentials.
            </p>

            <div className="rounded-2xl border border-dashed border-secondary/40 bg-forest-soft/30 p-6 text-center flex flex-col items-center justify-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-on-secondary shadow-sm">
                <Icon name="photo_camera" className="text-[24px]" />
              </span>
              <div>
                <span className="text-sm font-bold text-on-surface">Upload Store Receipt / Errand Invoice</span>
                <p className="text-xs text-muted mt-0.5">Supports PNG, JPG, WEBP, or PDF camera scans up to 10MB</p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button
                  variant="primary"
                  onClick={handleScanSample}
                  disabled={scanReceiptMutation.isPending}
                >
                  <Icon name="document_scanner" className="text-[18px]" />
                  {scanReceiptMutation.isPending ? 'Running OCR Extraction...' : 'Scan Sample Store Receipt'}
                </Button>
              </div>
            </div>

            {/* Target Ledger Selection */}
            {list.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs">
                <span className="font-medium text-on-surface">Record to Ledger:</span>
                <select
                  value={selectedLedgerId}
                  onChange={(e) => setSelectedLedgerId(e.target.value ? Number(e.target.value) : '')}
                  className="rounded-lg border border-outline-variant/40 bg-surface px-2.5 py-1 text-xs text-on-surface"
                >
                  <option value="">Default ({list[0]?.name})</option>
                  {list.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* OCR Extracted Result Preview */}
            {scanResult && (
              <div className="flex flex-col gap-3 rounded-2xl border border-secondary/30 bg-surface p-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                  <div>
                    <h3 className="font-bold text-on-surface">{scanResult.merchant}</h3>
                    <span className="text-xs text-muted">
                      {scanResult.date} · Confidence: {Math.round(scanResult.confidence * 100)}%
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted block">Total Paid</span>
                    <span className="text-lg font-extrabold text-secondary">
                      ${(scanResult.total_minor / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted">Extracted Line Items</span>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-low">
                    <Table>
                      <THead>
                        <TR>
                          <TH className="py-1.5 text-xs">Item</TH>
                          <TH className="py-1.5 text-xs text-right">Price</TH>
                        </TR>
                      </THead>
                      <tbody>
                        {scanResult.line_items.map((item, idx) => (
                          <TR key={idx}>
                            <TD className="py-1.5 text-xs font-medium">{item.name}</TD>
                            <TD className="py-1.5 text-xs font-mono text-right">
                              ${(item.price_minor / 100).toFixed(2)}
                            </TD>
                          </TR>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </div>

                {/* Gap B Auto-Suggested Pantry Restocks */}
                {scanResult.suggested_restocks.length > 0 && (
                  <div className="rounded-xl border border-secondary/20 bg-forest-soft/60 p-3 flex flex-col gap-2">
                    <span className="text-xs font-bold text-secondary flex items-center gap-1.5">
                      <Icon name="inventory_2" className="text-[16px]" />
                      Auto-Matched Pantry Essentials Restock
                    </span>
                    <p className="text-[11px] text-muted">
                      We detected items on this receipt that match essentials in your household pantry catalog:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {scanResult.suggested_restocks.map((restock) => {
                        const isRestocked = restockedIds.includes(restock.essential_id);
                        return (
                          <div
                            key={restock.essential_id}
                            className="flex items-center justify-between rounded-lg bg-surface px-2.5 py-1.5 text-xs border border-outline-variant/20"
                          >
                            <div className="flex flex-col">
                              <span className="font-bold text-on-surface">{restock.name}</span>
                              <span className="text-[10px] text-muted">
                                Current stock: {restock.current_stock} (threshold: {restock.threshold})
                              </span>
                            </div>
                            <Button
                              variant={isRestocked ? 'soft' : 'outline'}
                              size="sm"
                              disabled={isRestocked || restockMutation.isPending}
                              onClick={() => restockMutation.mutate(restock.essential_id)}
                            >
                              <Icon name={isRestocked ? 'check' : 'add'} className="text-[14px]" />
                              {isRestocked ? 'Restocked (+1)' : 'Restock to Pantry'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReceiptModalOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create Ledger Modal */}
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
      </div>
    </AppLayout>
  );
}
