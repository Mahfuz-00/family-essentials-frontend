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
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { SkeletonCard } from '@/components/ui/skeleton';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { api, apiError } from '@/lib/api';
import { formatMoney, getCurrencySign } from '@/lib/money';

interface EssentialItem {
  id: number;
  tenant_id: number;
  name: string;
  category: string;
  current_stock: number;
  reorder_point: number;
  target_stock: number;
  unit: string;
  is_low_stock: boolean;
  unit_price_minor: number;
  last_spent_minor: number;
  total_spent_minor: number;
  projected_restock_minor: number;
  currency?: string;
  created_at: string;
  updated_at: string;
}

interface PantrySummary {
  low_stock_count: number;
  out_of_stock_count: number;
  tracked_count: number;
  total_spent_minor: number;
  projected_restock_minor: number;
}

export interface CategoryOption {
  id: string;
  label: string;
  icon: string;
}

const PANTRY_CATEGORIES: CategoryOption[] = [
  { id: 'all', label: 'All Items', icon: 'grid_view' },
  { id: 'produce', label: 'Produce & Fresh', icon: 'nutrition' },
  { id: 'dairy_eggs', label: 'Dairy & Eggs', icon: 'egg' },
  { id: 'meat_seafood', label: 'Meat & Seafood', icon: 'set_meal' },
  { id: 'bakery', label: 'Bakery & Bread', icon: 'bakery_dining' },
  { id: 'pantry_staples', label: 'Pantry Staples', icon: 'kitchen' },
  { id: 'beverages', label: 'Beverages', icon: 'local_cafe' },
  { id: 'snacks', label: 'Snacks', icon: 'cookie' },
  { id: 'household_cleaning', label: 'Cleaning & Household', icon: 'cleaning_services' },
  { id: 'personal_care', label: 'Personal Care', icon: 'soap' },
  { id: 'medicine', label: 'Health & Pharmacy', icon: 'medication' },
  { id: 'baby_child', label: 'Baby & Child', icon: 'child_care' },
  { id: 'pet_supplies', label: 'Pet Care', icon: 'pets' },
  { id: 'other', label: 'Other Essentials', icon: 'category' },
];

const categoryLabels: Record<string, string> = {
  produce: 'Produce & Fresh',
  dairy_eggs: 'Dairy & Eggs',
  dairy: 'Dairy & Eggs',
  meat_seafood: 'Meat & Seafood',
  meat: 'Meat & Seafood',
  bakery: 'Bakery & Bread',
  pantry_staples: 'Pantry Staples',
  pantry: 'Pantry Staples',
  groceries: 'Produce & Fresh',
  beverages: 'Beverages',
  breakfast: 'Pantry Staples',
  snacks: 'Snacks',
  household_cleaning: 'Cleaning & Household',
  home: 'Cleaning & Household',
  cleaning: 'Cleaning & Household',
  personal_care: 'Personal Care',
  toiletries: 'Personal Care',
  medicine: 'Health & Pharmacy',
  medication: 'Health & Pharmacy',
  baby_child: 'Baby & Child',
  baby: 'Baby & Child',
  pet_supplies: 'Pet Care',
  pet: 'Pet Care',
  other: 'Other Essentials',
};

const categoryIcons: Record<string, string> = {
  produce: 'nutrition',
  dairy_eggs: 'egg',
  dairy: 'egg',
  meat_seafood: 'set_meal',
  meat: 'set_meal',
  bakery: 'bakery_dining',
  pantry_staples: 'kitchen',
  pantry: 'kitchen',
  groceries: 'shopping_basket',
  beverages: 'local_cafe',
  breakfast: 'kitchen',
  snacks: 'cookie',
  household_cleaning: 'cleaning_services',
  home: 'cleaning_services',
  cleaning: 'cleaning_services',
  personal_care: 'soap',
  toiletries: 'soap',
  medicine: 'medication',
  medication: 'medication',
  baby_child: 'child_care',
  baby: 'child_care',
  pet_supplies: 'pets',
  pet: 'pets',
  other: 'inventory_2',
};

const emptyForm = {
  name: '',
  category: 'produce',
  current_stock: 1,
  reorder_point: 2,
  target_stock: 5,
  unit: 'items',
  unit_price: '3.50',
};

export function PantryPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [restockItem, setRestockItem] = useState<EssentialItem | null>(null);
  const [restockQuantity, setRestockQuantity] = useState(1);
  const [restockSpend, setRestockSpend] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const pantryQuery = useQuery({
    queryKey: ['essentials'],
    queryFn: async () => {
      const res = await api.get('/v1/essentials');
      return res.data;
    },
  });

  const summaryQuery = useQuery({
    queryKey: ['essentials', 'summary'],
    queryFn: async () => (await api.get<PantrySummary>('/v1/essentials/summary')).data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['essentials'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const createMutation = useMutation({
    mutationFn: async () =>
      api.post('/v1/essentials', {
        name: form.name,
        category: form.category,
        stock_level: Number(form.current_stock),
        threshold: Number(form.reorder_point),
        pack_size: form.unit,
        unit_price_minor: Math.round(parseFloat(form.unit_price || '0') * 100),
        current_stock: Number(form.current_stock),
        reorder_point: Number(form.reorder_point),
        target_stock: Number(form.target_stock),
        unit: form.unit,
      }),
    onSuccess: async () => {
      setForm(emptyForm);
      setAddOpen(false);
      setError(null);
      setNotice('Item added to pantry and spending tracker.');
      await refresh();
    },
    onError,
  });

  const restockMutation = useMutation({
    mutationFn: async ({ id, quantity, spendMinor }: { id: number; quantity: number; spendMinor: number }) =>
      api.post(`/v1/essentials/${id}/restock`, {
        quantity,
        quantity_added: quantity,
        spent_minor: spendMinor,
        spend_amount_minor: spendMinor,
      }),
    onSuccess: async () => {
      setRestockItem(null);
      setError(null);
      setNotice('Restock logged and pantry expense updated.');
      await refresh();
    },
    onError,
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/essentials/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Pantry item removed.');
      await refresh();
    },
    onError,
  });

  const rawPayload = pantryQuery.data;
  const rawList: any[] = Array.isArray(rawPayload)
    ? rawPayload
    : Array.isArray(rawPayload?.data)
    ? rawPayload.data
    : Array.isArray(rawPayload?.data?.data)
    ? rawPayload.data.data
    : [];

  const items: EssentialItem[] = useMemo(() => {
    return rawList.map((raw) => {
      const current_stock = Number(raw.current_stock ?? raw.stock_level ?? 0);
      const reorder_point = Number(raw.reorder_point ?? raw.threshold ?? 1);
      const target_stock = Number(raw.target_stock ?? Math.max(reorder_point * 2, current_stock));
      const unit = raw.unit ?? raw.pack_size ?? 'items';
      const is_low_stock = Boolean(raw.is_low_stock ?? raw.is_due ?? (current_stock <= reorder_point));

      return {
        id: Number(raw.id),
        tenant_id: Number(raw.tenant_id ?? 1),
        name: String(raw.name ?? 'Item'),
        category: String(raw.category ?? 'groceries'),
        current_stock,
        reorder_point,
        target_stock,
        unit,
        is_low_stock,
        unit_price_minor: Number(raw.unit_price_minor ?? 0),
        last_spent_minor: Number(raw.last_spent_minor ?? 0),
        total_spent_minor: Number(raw.total_spent_minor ?? 0),
        projected_restock_minor: Number(raw.projected_restock_minor ?? 0),
        created_at: String(raw.created_at ?? ''),
        updated_at: String(raw.updated_at ?? ''),
      };
    });
  }, [rawList]);

  const rawSummary = rawPayload?.summary ?? summaryQuery.data ?? {};
  const summary: PantrySummary = {
    low_stock_count:
      rawSummary.low_stock_count ??
      rawSummary.due ??
      rawSummary.safety_stock ??
      items.filter((item) => item.is_low_stock).length,
    out_of_stock_count:
      rawSummary.out_of_stock_count ??
      items.filter((item) => item.current_stock <= 0).length,
    tracked_count: rawSummary.tracked_count ?? rawSummary.total ?? items.length,
    total_spent_minor:
      rawSummary.total_spent_minor ??
      items.reduce((acc, item) => acc + (item.total_spent_minor || 0), 0),
    projected_restock_minor:
      rawSummary.projected_restock_minor ??
      items
        .filter((item) => item.is_low_stock)
        .reduce(
          (acc, item) =>
            acc + Math.max(0, item.target_stock - item.current_stock) * (item.unit_price_minor || 0),
          0,
        ),
  };

  const visible = useMemo(
    () =>
      items.filter((item) => {
        const matchesFilter = filter === 'all' || item.category === filter;
        const matchesSearch =
          search.trim() === '' || item.name.toLowerCase().includes(search.toLowerCase());
        return matchesFilter && matchesSearch;
      }),
    [items, filter, search],
  );

  const currency = (items[0] as any)?.currency ?? 'BDT';

  if (pantryQuery.isLoading || summaryQuery.isLoading) {
    return (
      <AppLayout>
        <div className="flex flex-col gap-6">
          <PageHeader
            title="Pantry Inventory"
            description="Track household stock levels, projected restock costs, and historic grocery spending."
            titleSize="headline"
          />
          <StatGridSkeleton count={4} />
          <div className="h-14 rounded-[1.25rem] border border-white/70 bg-surface p-4 shadow-e1 animate-pulse" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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
          title="Pantry Inventory"
          description="Track household stock levels, projected restock costs, and historic grocery spending."
          titleSize="headline"
          actions={
            <Button size="lg" onClick={() => setAddOpen(true)}>
              <Icon name="add" className="text-[18px]" />
              Add Essential
            </Button>
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* 4 Unified StatCards */}
        <StatGrid count={4}>
          <StatCard
            title="Total Pantry Spent"
            value={formatMoney(summary.total_spent_minor, currency)}
            icon="payments"
            tone="forest"
            valueClassName="text-secondary"
            highlight={<StatHighlight tone="success">All-Time Spend</StatHighlight>}
          />
          <StatCard
            title="Projected Restock Cost"
            value={formatMoney(summary.projected_restock_minor, currency)}
            icon="trending_up"
            tone="coral"
            highlight={<StatHighlight tone="danger">Restock Budget</StatHighlight>}
          />
          <StatCard
            title="Low Stock Alerts"
            value={summary.low_stock_count}
            icon="warning"
            tone="amber"
            highlight={
              summary.low_stock_count > 0 ? (
                <StatHighlight tone={summary.out_of_stock_count > 0 ? 'danger' : 'warning'} pulse={summary.out_of_stock_count > 0}>
                  {summary.out_of_stock_count > 0 ? `${summary.out_of_stock_count} Depleted` : 'Needs Reorder'}
                </StatHighlight>
              ) : (
                <StatHighlight tone="success">All Stocked</StatHighlight>
              )
            }
          />
          <StatCard
            title="Tracked Essentials"
            value={items.length}
            icon="inventory_2"
            tone="sage"
            highlight={<StatHighlight tone="neutral">Active Catalog</StatHighlight>}
          />
        </StatGrid>

        {/* Search and Filters */}
        <Card className="flex flex-col gap-3 p-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full max-w-sm">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
            />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search pantry &amp; groceries…"
              className="h-10 pl-9"
            />
          </div>

          <div
            className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)]"
            role="group"
            aria-label="Filter pantry"
          >
            {PANTRY_CATEGORIES.map((cat) => {
              const count = cat.id === 'all' ? items.length : items.filter((i) => i.category === cat.id).length;
              if (cat.id !== 'all' && count === 0 && filter !== cat.id) return null;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilter(cat.id)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    filter === cat.id
                      ? 'bg-secondary font-bold text-on-secondary shadow-[var(--shadow-clay-sm)]'
                      : 'text-on-surface-variant hover:bg-surface/70'
                  }`}
                >
                  <Icon name={cat.icon} className="text-[14px]" />
                  <span>{cat.label}</span>
                  {count > 0 && <span className="text-[10px] opacity-80">({count})</span>}
                </button>
              );
            })}
          </div>
        </Card>

        {pantryQuery.isError && (
          <QueryError error={pantryQuery.error} what="pantry essentials" onRetry={() => void pantryQuery.refetch()} />
        )}

        {pantryQuery.isSuccess && visible.length === 0 && (
          <EmptyState
            title={items.length === 0 ? 'No pantry essentials tracked yet' : 'No items match'}
            description={
              items.length === 0
                ? 'Add frequently purchased groceries, household paper, and supplies to track spending and restock needs.'
                : 'Try adjusting your search query or category filter.'
            }
            action={
              <Button size="lg" onClick={() => setAddOpen(true)}>
                <Icon name="add" className="text-[18px]" />
                Track Your First Item
              </Button>
            }
          />
        )}

        {/* Essentials Grid */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 items-stretch">
          {visible.map((item) => {
            const isDepleted = item.current_stock <= 0;
            const isLow = item.is_low_stock;
            const stockPct = Math.min(100, Math.round((item.current_stock / Math.max(1, item.target_stock)) * 100));

            return (
              <Card key={item.id} className="flex flex-col justify-between p-5 border border-outline-variant/30 h-full w-full">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                        <Icon name={categoryIcons[item.category] ?? 'inventory_2'} className="text-[22px]" />
                      </span>
                      <div className="flex flex-col">
                        <h3 className="text-headline-sm font-bold text-on-surface">{item.name}</h3>
                        <span className="text-body-xs text-muted">
                          {categoryLabels[item.category] ?? item.category} · {item.unit}
                        </span>
                      </div>
                    </div>
                    <Badge tone={isDepleted ? 'danger' : isLow ? 'warning' : 'success'}>
                      {isDepleted ? 'Empty' : isLow ? 'Low Stock' : 'In Stock'}
                    </Badge>
                  </div>

                  {/* Stock Level Bar */}
                  <div className="flex flex-col gap-1.5 rounded-xl bg-surface-container-low p-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-muted">Stock Level:</span>
                      <span className="font-bold text-on-surface">
                        {item.current_stock} / {item.target_stock} {item.unit}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-surface-container overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isDepleted ? 'bg-error' : isLow ? 'bg-amber-500' : 'bg-secondary'
                        }`}
                        style={{ width: `${stockPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Reorder at: {item.reorder_point}</span>
                      <span>Target: {item.target_stock}</span>
                    </div>
                  </div>

                  {/* Spending & Cost Breakdown (Point 9) */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl border border-outline-variant/20 p-2.5 bg-canvas/60">
                      <span className="text-muted block text-[11px]">Est. Unit Price</span>
                      <span className="font-bold text-on-surface">
                        {formatMoney(item.unit_price_minor, currency)}
                      </span>
                    </div>
                    <div className="rounded-xl border border-outline-variant/20 p-2.5 bg-canvas/60">
                      <span className="text-muted block text-[11px]">Total Spent</span>
                      <span className="font-bold text-secondary">
                        {formatMoney(item.total_spent_minor, currency)}
                      </span>
                    </div>
                  </div>

                  {item.last_spent_minor > 0 && (
                    <div className="flex items-center gap-1.5 text-[11px] text-muted">
                      <Icon name="history" className="text-[14px]" />
                      <span>Last restock spent: {formatMoney(item.last_spent_minor, currency)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-outline-variant/20 pt-4 mt-4">
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => {
                      setRestockItem(item);
                      const needed = Math.max(1, item.target_stock - item.current_stock);
                      setRestockQuantity(needed);
                      setRestockSpend(((needed * item.unit_price_minor) / 100).toFixed(2));
                    }}
                  >
                    <Icon name="shopping_cart" className="text-[16px] mr-1" />
                    Restock &amp; Log Spend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-error hover:bg-coral-soft"
                    disabled={removeMutation.isPending}
                    onClick={() => removeMutation.mutate(item.id)}
                  >
                    Remove
                  </Button>
                </div>
              </Card>
            );
          })}
        </section>
      </div>

      {/* Add Essential Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Pantry Essential"
        description="Track inventory levels, unit price, and spending for this item."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={createMutation.isPending || !form.name.trim()}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? 'Saving…' : 'Save Item'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="item-name">Item Name</Label>
            <Input
              id="item-name"
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Olive Oil, Whole Milk, Dish Soap"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="item-category">Category</Label>
              <Select
                id="item-category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {PANTRY_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="item-unit">Unit of Measure</Label>
              <Input
                id="item-unit"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="bottles, kg, packs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="current-stock">Current Stock</Label>
              <Input
                id="current-stock"
                type="number"
                min={0}
                value={form.current_stock}
                onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="reorder-point">Reorder Point</Label>
              <Input
                id="reorder-point"
                type="number"
                min={0}
                value={form.reorder_point}
                onChange={(e) => setForm({ ...form, reorder_point: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label htmlFor="target-stock">Target Stock</Label>
              <Input
                id="target-stock"
                type="number"
                min={1}
                value={form.target_stock}
                onChange={(e) => setForm({ ...form, target_stock: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="unit-price">Estimated Unit Price ({getCurrencySign(currency)})</Label>
            <Input
              id="unit-price"
              type="number"
              step="0.01"
              value={form.unit_price}
              onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
              placeholder="3.50"
            />
            <p className="text-[11px] text-muted mt-1">
              Used to calculate projected restock costs and budget requirements.
            </p>
          </div>
        </div>
      </Modal>

      {/* Restock & Log Spend Modal */}
      <Modal
        open={restockItem !== null}
        onClose={() => setRestockItem(null)}
        title={`Restock ${restockItem?.name ?? 'Item'}`}
        description="Log new inventory and record the amount spent."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={() => setRestockItem(null)}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={restockMutation.isPending || restockQuantity <= 0}
              onClick={() => {
                if (restockItem) {
                  restockMutation.mutate({
                    id: restockItem.id,
                    quantity: Number(restockQuantity),
                    spendMinor: Math.round(parseFloat(restockSpend || '0') * 100),
                  });
                }
              }}
            >
              {restockMutation.isPending ? 'Logging…' : 'Log Restock & Spend'}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-forest-soft p-3 text-xs text-secondary flex justify-between items-center">
            <span>Current inventory:</span>
            <span className="font-bold">
              {restockItem?.current_stock} {restockItem?.unit} (Target: {restockItem?.target_stock})
            </span>
          </div>

          <div>
            <Label htmlFor="restock-qty">Quantity Added ({restockItem?.unit})</Label>
            <Input
              id="restock-qty"
              type="number"
              min={1}
              value={restockQuantity}
              onChange={(e) => {
                const qty = Number(e.target.value);
                setRestockQuantity(qty);
                if (restockItem) {
                  setRestockSpend(((qty * restockItem.unit_price_minor) / 100).toFixed(2));
                }
              }}
            />
          </div>

          <div>
            <Label htmlFor="restock-cost">Total Amount Spent ({getCurrencySign(currency)})</Label>
            <Input
              id="restock-cost"
              type="number"
              step="0.01"
              value={restockSpend}
              onChange={(e) => setRestockSpend(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-[11px] text-muted mt-1">
              This will update the total historical spend for this pantry item.
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
