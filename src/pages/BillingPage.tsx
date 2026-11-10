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
import type { AvailablePaymentMethods, Place, PlanChangePreview, UserRef } from '@/types';

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

  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'refund-policy'>('plan');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [refundInvoiceId, setRefundInvoiceId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundSubmitting, setRefundSubmitting] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'plus' | 'family' | 'enterprise'>('family');
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
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

  const paymentMethodsQuery = useQuery({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () =>
      (await api.get<{ data: AvailablePaymentMethods }>('/v1/billing/payment-methods')).data.data,
  });

  const invoicesQuery = useQuery({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => (await api.get<InvoicesResponse>('/v1/billing/invoices')).data,
  });

  const previewQuery = useQuery({
    queryKey: ['billing', 'change-preview', selectedTier, selectedPeriod],
    queryFn: async () =>
      (
        await api.post<PlanChangePreview>('/v1/billing/change-plan-preview', {
          tier: selectedTier,
          billing_period: selectedPeriod,
        })
      ).data,
    enabled: upgradeModalOpen,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (payload: { tier: string; billing_period: string; payment_method?: string }) =>
      (await api.post('/v1/billing/upgrade', payload)).data,
    onSuccess: (data: any) => {
      setNotice(
        data.invoice?.payment_method === 'cash' && data.invoice?.status === 'pending'
          ? `Cash payment request submitted for ${data.invoice?.tier ?? selectedTier} plan! Invoice ${data.invoice?.invoice_number} is pending in-person collection. Platform admin has been notified and will approve and issue your invoice upon payment.`
          : data.invoice?.payment_method === 'cash'
          ? `Plan upgraded to ${data.invoice?.tier ?? selectedTier}! Your physical invoice will be issued in person upon cash settlement.`
          : `Plan upgraded to ${data.invoice?.tier ?? selectedTier}! Official invoice ${data.invoice?.invoice_number} generated upon payment.`
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

  const [viewInvoiceHtml, setViewInvoiceHtml] = useState<string | null>(null);
  const [viewInvoiceNumber, setViewInvoiceNumber] = useState<string>('');
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<number | null>(null);

  const handleDownloadInvoice = async (invoiceId: number, invoiceNum?: string) => {
    setDownloadingInvoiceId(invoiceId);
    setError(null);
    try {
      const resp = await api.get<string>(`/v1/billing/invoices/${invoiceId}/download`, {
        responseType: 'text' as any,
      });
      setViewInvoiceHtml(resp.data);
      setViewInvoiceNumber(invoiceNum || `INV-${invoiceId}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleSimulatePayment = () => {
    upgradeMutation.mutate({
      tier: selectedTier,
      billing_period: selectedPeriod,
      payment_method: paymentMethod,
    });
  };

  const handleRefundSubmit = async () => {
    if (!refundReason.trim()) {
      setError('Please provide a brief reason for your refund request.');
      return;
    }
    setRefundSubmitting(true);
    setError(null);
    try {
      const selectedInvoice = invoicesList.find((inv) => inv.id === refundInvoiceId) || invoicesList[0];
      const amountCents = selectedInvoice ? selectedInvoice.amount_cents : 1900;
      await api.post('/v1/billing/refund-request', {
        invoice_id: selectedInvoice?.id,
        amount_cents: amountCents,
        currency: selectedInvoice?.currency ?? 'USD',
        reason: refundReason,
      });
      setNotice('Refund request successfully submitted! Our billing team reviews requests within 24 hours under our refund policy.');
      setRefundModalOpen(false);
      setRefundReason('');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setRefundSubmitting(false);
    }
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
          <button
            type="button"
            onClick={() => setActiveTab('refund-policy')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'refund-policy'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="verified_user" className="text-[18px]" />
            Refund Policy &amp; Guarantees
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

              {/* Money-Back Guarantee Notice */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary/20 bg-forest-soft/40 p-3.5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="verified_user" className="text-[20px]" />
                  </span>
                  <div>
                    <span className="text-label-md font-bold text-on-surface">Household Money-Back Guarantee</span>
                    <p className="text-body-xs text-muted">
                      7-day 100% refund on monthly plans · 30-day 80% refund on annual plans.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setRefundModalOpen(true)}
                  >
                    Request Refund
                  </Button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('refund-policy')}
                    className="text-xs font-bold text-secondary hover:underline px-2 py-1"
                  >
                    View Policy Details &rarr;
                  </button>
                </div>
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
                            {invoice.payment_method === 'cash' ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-secondary">
                                <Icon name="payments" className="text-[14px]" />
                                Cash / In-Person
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5">
                                <Icon name="credit_card" className="text-[14px]" />
                                •••• {invoice.last4 || '4242'}
                              </span>
                            )}
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
                            {invoice.payment_method === 'cash' && invoice.status !== 'paid' ? (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
                                <Icon name="receipt" className="text-[14px]" />
                                In-Person Invoice
                              </span>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={downloadingInvoiceId === invoice.id}
                                onClick={() => handleDownloadInvoice(invoice.id, invoice.invoice_number)}
                              >
                                <Icon name="download" className="text-[14px]" />
                                {downloadingInvoiceId === invoice.id ? 'Loading…' : 'PDF Receipt'}
                              </Button>
                            )}
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

        {activeTab === 'refund-policy' && (
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-5 p-6 border-l-4 border-secondary bg-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Household Refund &amp; Guarantee Status</h3>
                  <p className="text-xs text-muted">
                    Clear terms protecting your household subscription. Submit requests directly to platform billing triage.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setRefundModalOpen(true)}
                  >
                    <Icon name="assignment_return" className="text-[16px]" />
                    Request a Refund
                  </Button>
                  <Link to="/refund-policy">
                    <Button variant="outline" size="sm">
                      <Icon name="open_in_new" className="text-[16px]" />
                      Public Terms Page
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Household Status Breakdown */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-t border-outline-variant/20 pt-4">
                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <span className="text-xs font-semibold text-muted">Current Plan Commitment</span>
                  <div className="text-label-lg font-bold text-on-surface mt-1 capitalize">
                    {quota.planLabel}
                  </div>
                  <span className="text-[11px] text-muted">Active household tier</span>
                </div>

                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <span className="text-xs font-semibold text-muted">Latest Invoice</span>
                  <div className="text-label-lg font-bold text-on-surface mt-1 font-mono">
                    {invoicesList[0]?.invoice_number ?? 'No invoices yet'}
                  </div>
                  <span className="text-[11px] text-muted">
                    {invoicesList[0] ? `$${(invoicesList[0].amount_cents / 100).toFixed(2)} · ${invoicesList[0].status.toUpperCase()}` : 'Free trial'}
                  </span>
                </div>

                <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <span className="text-xs font-semibold text-muted">Money-Back Window</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Badge tone="success">7-Day Guarantee Active</Badge>
                  </div>
                  <span className="text-[11px] text-muted">100% refundable within 7 days of invoice</span>
                </div>
              </div>
            </Card>

            {/* 4 Policy Pillars */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="verified_user" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-label-lg font-bold text-on-surface">Monthly Subscriptions: 7-Day 100% Guarantee</h4>
                    <p className="text-body-xs text-muted">Full refund within 7 calendar days</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">
                  If you decide Family Essentials does not fit your household within 7 days of your monthly subscription invoice, you are entitled to a full 100% refund. After 7 days, charges for that cycle are non-refundable.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    <Icon name="workspace_premium" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-label-lg font-bold text-on-surface">Annual Commitments: 30-Day 80% Guarantee</h4>
                    <p className="text-body-xs text-muted">First-month early cancellation protection</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">
                  Annual subscriptions can be cancelled within the first month (30 days) for an 80% refund (20% retained for early termination and payment gateway costs). After 30 days, annual subscriptions are non-refundable.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                    <Icon name="swap_horiz" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-label-lg font-bold text-on-surface">Plan Modifications &amp; Prorations</h4>
                    <p className="text-body-xs text-muted">Clear timing rules for upgrades and downgrades</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">
                  Monthly plans can be upgraded or changed between <strong>Day 4 and Day 20</strong> with a 50% adjustment credit. Plan changes are locked on Days 0–3 and after Day 20. Annual plans may be changed within the first 3 months.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                    <Icon name="payments" className="text-[20px]" />
                  </span>
                  <div>
                    <h4 className="text-label-lg font-bold text-on-surface">Cash &amp; Offline Payment Refunds</h4>
                    <p className="text-body-xs text-muted">In-person cash settlement vouchers</p>
                  </div>
                </div>
                <p className="text-xs text-on-surface leading-relaxed">
                  For cash-based payments, refunds cannot be processed automatically back to an online bank card. Instead, approved refunds are settled offline in person with your platform administrator via an official printed refund voucher.
                </p>
              </Card>
            </div>
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

            {paymentMethodsQuery.data?.cash?.enabled && (
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-secondary bg-forest-soft/70 text-secondary'
                        : 'border-outline-variant/40 hover:bg-sage-soft'
                    }`}
                  >
                    <Icon name="credit_card" className="text-[16px]" />
                    Online Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-colors ${
                      paymentMethod === 'cash'
                        ? 'border-secondary bg-forest-soft/70 text-secondary'
                        : 'border-outline-variant/40 hover:bg-sage-soft'
                    }`}
                  >
                    <Icon name="payments" className="text-[16px]" />
                    Cash Payment
                  </button>
                </div>
              </div>
            )}

            {previewQuery.data && !previewQuery.data.eligible && (
              <Alert tone="warning">
                {previewQuery.data.reason}
              </Alert>
            )}

            {paymentMethod === 'cash' && paymentMethodsQuery.data?.cash?.enabled && (
              <div className="rounded-xl border border-secondary/30 bg-forest-soft/40 p-3.5 text-xs flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-secondary">
                  <Icon name="info" className="text-[16px]" />
                  <span>Cash Payment &amp; In-Person Settlement Instructions</span>
                </div>
                <p className="text-on-surface text-[12px] leading-relaxed">
                  {paymentMethodsQuery.data.cash.instructions ||
                    'Cash payment upon in-person settlement or physical collection.'}
                </p>
                <p className="text-[11px] text-muted">
                  Your cash payment request will be submitted to platform administration. The administrator collects the cash in person, hands you your physical printed invoice, and confirms payment in the software to upgrade your household plan.
                </p>
              </div>
            )}

            <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low p-3 text-xs flex flex-col gap-1.5">
              <div className="flex justify-between font-medium">
                <span>Payment Method:</span>
                <span className="font-mono text-muted">
                  {paymentMethod === 'cash' ? 'Cash Settlement (In-Person)' : 'Test Card (•••• 4242)'}
                </span>
              </div>
              {previewQuery.data && previewQuery.data.discount_cents > 0 && (
                <div className="flex justify-between font-semibold text-secondary">
                  <span>Mid-Cycle Adjustment ({previewQuery.data.adjustment_percent}% Credit):</span>
                  <span>-${(previewQuery.data.discount_cents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-on-surface">
                <span>Total Due:</span>
                <span className="text-secondary text-sm">
                  {previewQuery.data
                    ? `$${(previewQuery.data.final_amount_cents / 100).toFixed(2)}`
                    : selectedTier === 'plus'
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
                disabled={
                  upgradeMutation.isPending ||
                  (previewQuery.data !== undefined && !previewQuery.data.eligible)
                }
              >
                <Icon name={paymentMethod === 'cash' ? 'payments' : 'check_circle'} className="text-[18px]" />
                {upgradeMutation.isPending
                  ? 'Processing Upgrade...'
                  : paymentMethod === 'cash'
                  ? 'Confirm Cash Upgrade'
                  : 'Pay & Generate Invoice'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Invoice Receipt Viewer & Print Modal */}
        <Modal
          open={viewInvoiceHtml !== null}
          onClose={() => setViewInvoiceHtml(null)}
          title={`Official Invoice Receipt — ${viewInvoiceNumber}`}
          className="max-w-4xl"
          footer={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!viewInvoiceHtml) return;
                  const blob = new Blob([viewInvoiceHtml], { type: 'text/html' });
                  window.open(URL.createObjectURL(blob), '_blank');
                }}
              >
                <Icon name="open_in_new" className="text-[16px]" />
                Open in New Window
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const frame = document.getElementById('tenant-invoice-frame') as HTMLIFrameElement;
                  if (frame?.contentWindow) {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                  }
                }}
              >
                <Icon name="print" className="text-[16px]" />
                Print / Save as PDF
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              Official tax receipt for your household subscription records. You can print directly or save as PDF.
            </p>
            <div className="h-[520px] w-full rounded-2xl border border-outline-variant/30 bg-white shadow-inner overflow-hidden">
              <iframe
                id="tenant-invoice-frame"
                title="Official Invoice Receipt"
                srcDoc={viewInvoiceHtml ?? ''}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </Modal>

        {/* Request Refund Modal */}
        <Modal
          open={refundModalOpen}
          onClose={() => setRefundModalOpen(false)}
          title="Submit Household Refund Request"
          description="Submit a refund request under our 7-day monthly or 30-day annual guarantee policy."
        >
          <div className="flex flex-col gap-4 p-1">
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
              <span className="font-bold">Refund Policy Reminder:</span> Monthly plans are 100% refundable within 7 days. Annual plans are 80% refundable within 30 days. Requests are triaged by platform billing within 24 hours.
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface">Select Invoice to Refund</label>
              <select
                value={refundInvoiceId ?? (invoicesList[0]?.id || '')}
                onChange={(e) => setRefundInvoiceId(Number(e.target.value))}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface p-2.5 text-xs text-on-surface focus:border-secondary focus:outline-none"
              >
                {invoicesList.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoice_number} — ${(inv.amount_cents / 100).toFixed(2)} ({inv.tier} · {inv.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-on-surface">Reason for Refund Request</label>
              <textarea
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="e.g. Household moved, accidental duplicate subscription, or did not meet domestic requirements..."
                className="w-full rounded-xl border border-outline-variant/40 bg-surface p-3 text-xs text-on-surface focus:border-secondary focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-outline-variant/20 pt-3">
              <Button
                variant="outline"
                onClick={() => setRefundModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                disabled={refundSubmitting || !refundReason.trim()}
                onClick={handleRefundSubmit}
              >
                <Icon name="send" className="text-[16px]" />
                {refundSubmitting ? 'Submitting…' : 'Submit Refund Request'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
