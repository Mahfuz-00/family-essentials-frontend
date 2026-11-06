import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { useQuota } from '@/hooks/useQuota';
import { plans } from '@/lib/plans';
import { useTenantStore } from '@/stores/tenant';
import type { Place, UserRef } from '@/types';

interface InvoiceRecord {
  id: number;
  tenant_id: number;
  invoice_number: string;
  amount_cents: number;
  currency: string;
  status: string;
  tier: string;
  billing_period: string;
  paid_at: string | null;
  payment_method: string;
  last4: string;
  created_at: string;
}

interface InvoicesResponse {
  data: InvoiceRecord[];
  total: number;
  current_page: number;
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const active = useTenantStore((state) => state.active);

  const [activeTab, setActiveTab] = useState<'plan' | 'invoices'>('plan');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'plus' | 'family' | 'enterprise'>('family');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: UserRef[] }>('/v1/tenant/members')).data.data,
  });

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => (await api.get<InvoicesResponse>('/v1/billing/invoices')).data,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (payload: { tier: string; billing_period: string }) =>
      (await api.post('/v1/billing/upgrade', payload)).data,
    onSuccess: (data: any) => {
      setNotice(
        `Plan upgraded to ${data.invoice?.tier ?? selectedTier}! Official invoice ${data.invoice?.invoice_number} generated upon payment.`
      );
      setError(null);
      setUpgradeModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'quotas'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const quota = useQuota();
  const seatsUsed = quota.data?.usage.members ?? members.data?.length ?? active?.member_count ?? 0;
  const placesUsed = quota.data?.usage.places ?? places.data?.length ?? 0;
  const seatCap = quota.seatCap;
  const placeCap = quota.placeCap;

  const remaining = (cap: number | null, used: number) =>
    cap === null ? 'the API has not reported the plan limit' : `${Math.max(0, cap - used)} remaining`;

  const usage = [
    {
      label: 'Family member seats',
      used: seatsUsed,
      cap: seatCap,
      icon: 'group',
      note:
        (quota.data?.usage.seats_reserved ?? 0) > 0
          ? `${remaining(seatCap, seatsUsed)} · ${quota.data?.usage.seats_reserved} held by invitations`
          : remaining(seatCap, seatsUsed),
    },
    {
      label: 'Saved places',
      used: placesUsed,
      cap: placeCap,
      icon: 'pin_drop',
      note: remaining(placeCap, placesUsed),
    },
    ...(quota.data?.meters ?? [])
      .filter((meter) => meter.key === 'requests' || meter.key === 'voice')
      .map((meter) => ({
        label: meter.label,
        used: meter.used,
        cap: meter.cap,
        icon: meter.icon,
        note: meter.at_cap
          ? 'At the plan limit — the API refuses the next one'
          : `${meter.remaining} remaining`,
      })),
  ];

  const loading = quota.isLoading || members.isLoading || places.isLoading;
  const invoicesList = invoicesQuery.data?.data ?? [];

  const handleDownloadInvoice = (invoiceId: number) => {
    window.open(`/api/v1/billing/invoices/${invoiceId}/download`, '_blank');
  };

  const handleSimulatePayment = () => {
    upgradeMutation.mutate({
      tier: selectedTier,
      billing_period: selectedPeriod,
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-6xl">
        <PageHeader
          title="Billing &amp; Subscription Portal"
          description="Your household plan, seat allocation, usage quotas, and official downloadable payment invoices."
          actions={
            <Button
              variant="primary"
              onClick={() => setUpgradeModalOpen(true)}
            >
              <Icon name="upgrade" className="text-[18px]" />
              Upgrade / Change Tier
            </Button>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {/* Tab Switcher */}
        <div className="flex border-b border-outline-variant/30 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'plan'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="credit_card" className="text-[18px]" />
            Plan &amp; Quotas
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'invoices'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="receipt_long" className="text-[18px]" />
            Invoices &amp; Receipts ({invoicesList.length})
          </button>
        </div>

        {activeTab === 'plan' && (
          <div className="flex flex-col gap-6">
            {/* ---------------------- active subscription overview ---------------------- */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {usage.map((meter) => (
                  <SkeletonCard key={meter.label} />
                ))}
              </div>
            ) : (
              <Card className="p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                        <Icon name="verified_user" className="text-[24px]" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <h2 className="text-headline-md text-on-surface">{quota.planLabel}</h2>
                          <Badge tone={active?.status === 'suspended' ? 'danger' : 'success'}>
                            {active?.status === 'suspended' ? 'Suspended' : 'Active membership'}
                          </Badge>
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-label-sm text-muted">
                          <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 font-mono">
                            tier: {quota.plan?.key ?? active?.subscription_tier ?? '—'}
                          </span>
                          {quota.plan && (
                            <span className="rounded-full bg-surface-container-low px-2.5 py-0.5">
                              {quota.plan.price} {quota.plan.cadence}
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setUpgradeModalOpen(true)}
                      >
                        <Icon name="credit_card" className="text-[16px]" />
                        Change Plan
                      </Button>
                      <Link to="/members">
                        <Button variant="soft">
                          <Icon name="group" className="text-[16px]" />
                          Manage seats
                        </Button>
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {usage.map((meter) => (
                      <div
                        key={meter.label}
                        className="flex flex-col gap-2 rounded-2xl border border-[rgba(43,45,66,0.04)] bg-canvas p-4"
                      >
                        <span className="flex items-center justify-between">
                          <span className="text-label-sm text-muted">{meter.label}</span>
                          <Icon name={meter.icon} className="text-[18px] text-primary" />
                        </span>
                        <span className="text-headline-md font-bold text-on-surface">
                          {meter.used}
                          {meter.cap !== null && (
                            <span className="text-body-md font-normal text-muted"> of {meter.cap}</span>
                          )}
                        </span>
                        {meter.cap !== null && (
                          <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                            <span
                              className="block h-1.5 rounded-full bg-secondary"
                              style={{ width: `${Math.min(100, (meter.used / meter.cap) * 100)}%` }}
                            />
                          </span>
                        )}
                        <span className="text-body-sm text-muted">{meter.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* ----------------------------- plan comparison ---------------------------- */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-headline-md text-on-surface">Available Plan Tiers</h2>
                <p className="text-body-sm text-muted">
                  Select a tier that fits your household's coordination, geofencing, and voice escalation needs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {plans
                  .filter((tier) => tier.key !== 'enterprise')
                  .map((tier) => {
                    const isCurrent = tier.key === active?.subscription_tier;

                    return (
                      <Card
                        key={tier.key}
                        className={`flex flex-col gap-4 p-5 ${
                          isCurrent ? 'border-2 border-secondary shadow-e3 bg-forest-soft/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <h3 className="text-headline-sm text-on-surface">{tier.label}</h3>
                            <span className="text-body-sm text-muted">{tier.tagline}</span>
                          </div>
                          {isCurrent && <Badge tone="primary">Current plan</Badge>}
                        </div>

                        <div className="text-xl font-extrabold text-on-surface">
                          {tier.key === 'starter' ? '$9' : tier.key === 'pilot' ? '$19' : '$49'} <span className="text-xs font-normal text-muted">/ month</span>
                        </div>

                        <Button
                          variant={isCurrent ? 'soft' : 'outline'}
                          onClick={() => {
                            setSelectedTier(tier.key as any);
                            setUpgradeModalOpen(true);
                          }}
                          className="mt-auto w-full"
                        >
                          {isCurrent ? 'Active Plan' : `Upgrade to ${tier.label}`}
                        </Button>
                      </Card>
                    );
                  })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="flex flex-col gap-6">
            {/* Invoicing Confirmation Note */}
            <div className="flex items-center gap-3 rounded-2xl border border-secondary/20 bg-forest-soft/70 p-4 text-xs text-on-surface">
              <Icon name="receipt_long" className="text-[22px] text-secondary shrink-0" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-secondary">Automatic Invoicing Guarantee</span>
                <span>
                  An official tax invoice is automatically generated and permanently recorded in your household vault upon every subscription payment and plan upgrade.
                </span>
              </div>
            </div>

            {/* ----------------------------- Invoices & Receipts Vault (Gap F) ---------------------------- */}
            <section className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-headline-sm font-bold text-on-surface">Payment History &amp; Invoices</h2>
                  <p className="text-xs text-muted">
                    Official billing records, payment verification, and downloadable tax receipts for this household.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] })}
                >
                  <Icon name="refresh" className="text-[16px]" />
                  Refresh Invoices
                </Button>
              </div>

              <Card className="overflow-hidden p-0">
                {invoicesQuery.isLoading ? (
                  <div className="p-8 text-center text-xs text-muted">Loading payment records...</div>
                ) : invoicesList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-container text-muted">
                      <Icon name="receipt" className="text-[24px]" />
                    </span>
                    <span className="text-sm font-semibold text-on-surface">No invoices issued yet</span>
                    <p className="max-w-md text-xs text-muted">
                      Invoices are generated upon subscription upgrade and renewal. Upgrade your plan to test invoice generation.
                    </p>
                    <Button variant="outline" size="sm" onClick={() => setUpgradeModalOpen(true)}>
                      Upgrade Plan to Generate First Invoice
                    </Button>
                  </div>
                ) : (
                  <Table>
                    <THead>
                      <TH>Invoice #</TH>
                      <TH>Plan Tier</TH>
                      <TH>Billing Cadence</TH>
                      <TH>Amount Paid</TH>
                      <TH>Payment Method</TH>
                      <TH>Date Issued</TH>
                      <TH>Status</TH>
                      <TH className="text-right">Receipt</TH>
                    </THead>
                    <tbody>
                      {invoicesList.map((invoice) => (
                        <TR key={invoice.id}>
                          <TD className="font-mono font-bold text-secondary text-xs">
                            {invoice.invoice_number}
                          </TD>
                          <TD className="capitalize font-semibold text-xs">
                            {invoice.tier.replace('_', ' ')}
                          </TD>
                          <TD className="capitalize text-xs text-muted">
                            {invoice.billing_period}
                          </TD>
                          <TD className="font-bold text-xs">
                            ${(invoice.amount_cents / 100).toFixed(2)}
                          </TD>
                          <TD className="text-xs text-muted">
                            <span className="inline-flex items-center gap-1.5">
                              <Icon name="credit_card" className="text-[14px]" />
                              •••• {invoice.last4 || '4242'}
                            </span>
                          </TD>
                          <TD className="text-xs text-muted">
                            {invoice.paid_at
                              ? new Date(invoice.paid_at).toLocaleDateString()
                              : new Date(invoice.created_at).toLocaleDateString()}
                          </TD>
                          <TD>
                            <Badge tone={invoice.status === 'paid' ? 'success' : 'neutral'}>
                              {invoice.status.toUpperCase()}
                            </Badge>
                          </TD>
                          <TD className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(invoice.id)}
                            >
                              <Icon name="download" className="text-[14px]" />
                              PDF Receipt
                            </Button>
                          </TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card>
            </section>
          </div>
        )}

        {/* Upgrade / Payment Simulation Modal */}
        <Modal
          open={upgradeModalOpen}
          onClose={() => setUpgradeModalOpen(false)}
          title="Upgrade Household Plan &amp; Generate Invoice"
        >
          <div className="flex flex-col gap-5 p-1">
            <p className="text-xs text-muted">
              Upgrading immediately provisions additional member seats, unlimited geofenced places, and generates an official invoice receipt.
            </p>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface">Select Tier</label>
              <div className="grid grid-cols-3 gap-2">
                {(['plus', 'family', 'enterprise'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTier(t)}
                    className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-xs transition-colors ${
                      selectedTier === t
                        ? 'border-secondary bg-forest-soft/70 font-bold text-secondary'
                        : 'border-outline-variant/40 bg-surface hover:bg-sage-soft'
                    }`}
                  >
                    <span className="capitalize">{t}</span>
                    <span className="text-[11px] text-muted">
                      {t === 'plus' ? '$9/mo' : t === 'family' ? '$19/mo' : '$49/mo'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-on-surface">Billing Cadence</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('monthly')}
                  className={`rounded-xl border p-2.5 text-xs font-semibold ${
                    selectedPeriod === 'monthly'
                      ? 'border-secondary bg-forest-soft/70 text-secondary'
                      : 'border-outline-variant/40 hover:bg-sage-soft'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPeriod('annual')}
                  className={`rounded-xl border p-2.5 text-xs font-semibold ${
                    selectedPeriod === 'annual'
                      ? 'border-secondary bg-forest-soft/70 text-secondary'
                      : 'border-outline-variant/40 hover:bg-sage-soft'
                  }`}
                >
                  Annual (2 Mos Free)
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between font-medium">
                <span>Payment Method:</span>
                <span className="font-mono text-muted">Test Card (•••• 4242)</span>
              </div>
              <div className="flex justify-between font-bold text-on-surface">
                <span>Total Due:</span>
                <span className="text-secondary text-sm">
                  {selectedTier === 'plus'
                    ? selectedPeriod === 'annual' ? '$90.00/yr' : '$9.00/mo'
                    : selectedTier === 'family'
                    ? selectedPeriod === 'annual' ? '$190.00/yr' : '$19.00/mo'
                    : selectedPeriod === 'annual' ? '$490.00/yr' : '$49.00/mo'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUpgradeModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSimulatePayment}
                disabled={upgradeMutation.isPending}
              >
                <Icon name="check_circle" className="text-[18px]" />
                {upgradeMutation.isPending ? 'Processing Payment...' : 'Pay & Generate Invoice'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
