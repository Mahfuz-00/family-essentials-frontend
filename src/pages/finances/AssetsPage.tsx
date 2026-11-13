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
import type { AssetType, FinancialAsset } from '@/types';

const ASSET_TYPES: { key: AssetType; label: string }[] = [
  { key: 'savings', label: 'Savings & Checking' },
  { key: 'investment', label: 'Index Funds & ETFs' },
  { key: 'stocks', label: 'Individual Stocks' },
  { key: 'retirement', label: 'Retirement (401k / IRA)' },
  { key: 'crypto', label: 'Cryptocurrency' },
  { key: 'real_estate', label: 'Real Estate Equity' },
  { key: 'cash', label: 'Cash & Equivalents' },
  { key: 'other', label: 'Other Asset' },
];

export function AssetsPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<FinancialAsset | null>(null);
  const [newBalance, setNewBalance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    type: 'investment' as AssetType,
    institution: '',
    balance: '',
    contribution_monthly: '',
    return_rate: '',
    notes: '',
  });

  const assets = useQuery({
    queryKey: ['finances', 'assets'],
    queryFn: async () => (await api.get<{ data: FinancialAsset[] }>('/v1/finances/assets')).data.data,
  });

  const createAsset = useMutation({
    mutationFn: async () => {
      const balanceMinor = parseMoneyToMinor(form.balance);
      const contribMinor = form.contribution_monthly
        ? parseMoneyToMinor(form.contribution_monthly)
        : null;
      const rateBps = form.return_rate ? Math.round(parseFloat(form.return_rate) * 100) : null;

      return api.post('/v1/finances/assets', {
        name: form.name,
        type: form.type,
        institution: form.institution || null,
        balance_minor: balanceMinor,
        contribution_monthly_minor: contribMinor,
        return_rate_bps: rateBps,
        notes: form.notes || null,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setNotice('Asset added successfully.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const updateAssetBalance = useMutation({
    mutationFn: async () => {
      if (!selectedAsset) return;
      const balanceMinor = parseMoneyToMinor(newBalance);
      return api.patch(`/v1/finances/assets/${selectedAsset.id}`, {
        balance_minor: balanceMinor,
      });
    },
    onSuccess: async () => {
      setUpdateModalOpen(false);
      setNewBalance('');
      setSelectedAsset(null);
      setNotice('Asset balance updated!');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteAsset = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/finances/assets/${id}`),
    onSuccess: async () => {
      setNotice('Asset removed.');
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['finances'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const openCreateModal = () => {
    setForm({
      name: '',
      type: 'investment',
      institution: '',
      balance: '',
      contribution_monthly: '',
      return_rate: '',
      notes: '',
    });
    setModalOpen(true);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Assets & Funds"
          description="Portfolio tracking, high-yield savings accounts, retirement funds, and asset growth."
          titleSize="headline"
          actions={
            <Button onClick={openCreateModal}>
              <Icon name="add" className="text-[18px] mr-1.5" />
              Add Savings or Investment
            </Button>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert>{error}</Alert>}

        {assets.isError && (
          <QueryError error={assets.error} what="assets" onRetry={() => void assets.refetch()} />
        )}

        {assets.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {assets.data && assets.data.length === 0 && (
          <EmptyState
            title="No savings or investments recorded"
            description="Track high-yield savings, index funds, brokerage accounts, or crypto to monitor wealth building."
            action={<Button onClick={openCreateModal}>Add First Asset</Button>}
          />
        )}

        {assets.data && assets.data.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
            {assets.data.map((item) => (
              <Card key={item.id} className="p-5 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <Badge tone="success" className="capitalize mb-1.5">
                        {item.type.replace('_', ' ')}
                      </Badge>
                      <h3 className="text-title-md font-bold text-on-surface">{item.name}</h3>
                      {item.institution && (
                        <p className="text-body-xs text-muted">Institution: {item.institution}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 mb-2">
                    <span className="text-xs text-muted uppercase tracking-wider">Current Balance</span>
                    <div className="text-title-lg font-black text-secondary">
                      {formatMoney(item.balance_minor, item.currency)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-outline-variant/40 text-body-xs">
                    {item.contribution_monthly_minor != null && (
                      <div>
                        <span className="text-muted block">Monthly Contrib:</span>
                        <span className="font-semibold text-on-surface">
                          {formatMoney(item.contribution_monthly_minor, item.currency)}/mo
                        </span>
                      </div>
                    )}
                    {item.return_rate_percent != null && (
                      <div>
                        <span className="text-muted block">Est. Annual Return:</span>
                        <span className="font-semibold text-secondary">
                          {item.return_rate_percent}% APY
                        </span>
                      </div>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-3 text-body-xs text-muted italic border-t border-outline-variant/40 pt-2">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-5 pt-3 border-t border-outline-variant/40">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedAsset(item);
                      setNewBalance((item.balance_minor / 100).toFixed(2));
                      setUpdateModalOpen(true);
                    }}
                  >
                    <Icon name="edit" className="text-[16px] mr-1" />
                    Update Balance
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-error hover:bg-error/10"
                    onClick={() => {
                      if (confirm(`Remove asset "${item.name}"?`)) {
                        deleteAsset.mutate(item.id);
                      }
                    }}
                  >
                    <Icon name="delete" className="text-[18px]" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Add Asset Modal */}
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Add Savings or Investment"
          description="Track savings accounts, brokerage portfolios, or retirement accounts."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={createAsset.isPending} onClick={() => createAsset.mutate()}>
                {createAsset.isPending ? 'Saving…' : 'Save Asset'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="asset-name">Asset Name</Label>
              <Input
                id="asset-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Vanguard Total Stock Market ETF (VTI)"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="asset-type">Asset Type</Label>
                <Select
                  id="asset-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="asset-institution">Bank / Brokerage</Label>
                <Input
                  id="asset-institution"
                  value={form.institution}
                  onChange={(e) => setForm({ ...form, institution: e.target.value })}
                  placeholder="e.g. Vanguard, Fidelity, Marcus"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="asset-balance">Current Balance</Label>
                <Input
                  id="asset-balance"
                  type="number"
                  step="any"
                  value={form.balance}
                  onChange={(e) => setForm({ ...form, balance: e.target.value })}
                  placeholder="e.g. 25000"
                />
              </div>

              <div>
                <Label htmlFor="asset-contrib">Monthly Contrib</Label>
                <Input
                  id="asset-contrib"
                  type="number"
                  step="any"
                  value={form.contribution_monthly}
                  onChange={(e) => setForm({ ...form, contribution_monthly: e.target.value })}
                  placeholder="e.g. 500"
                />
              </div>

              <div>
                <Label htmlFor="asset-return">Est. Return %</Label>
                <Input
                  id="asset-return"
                  type="number"
                  step="0.01"
                  value={form.return_rate}
                  onChange={(e) => setForm({ ...form, return_rate: e.target.value })}
                  placeholder="e.g. 7.5"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="asset-notes">Notes (optional)</Label>
              <Input
                id="asset-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="e.g. Auto-deposit on 1st of month"
              />
            </div>
          </div>
        </Modal>

        {/* Update Balance Modal */}
        <Modal
          open={updateModalOpen}
          onClose={() => setUpdateModalOpen(false)}
          title={`Update Balance for "${selectedAsset?.name}"`}
          description="Enter current updated valuation or balance."
          footer={
            <>
              <Button variant="ghost" onClick={() => setUpdateModalOpen(false)}>
                Cancel
              </Button>
              <Button disabled={updateAssetBalance.isPending} onClick={() => updateAssetBalance.mutate()}>
                {updateAssetBalance.isPending ? 'Updating…' : 'Update Balance'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="new-balance">New Current Balance</Label>
              <Input
                id="new-balance"
                type="number"
                step="any"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                placeholder="e.g. 27500.00"
                autoFocus
              />
            </div>
            {selectedAsset && (
              <p className="text-body-sm text-muted">
                Previous balance: {formatMoney(selectedAsset.balance_minor, selectedAsset.currency)}
              </p>
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
