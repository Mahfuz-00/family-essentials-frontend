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
import { StatCard, StatGrid, StatHighlight } from '@/components/ui/stat-card';
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

const planFeaturePoints: Record<string, { price: string; features: string[] }> = {
  starter: {
    price: '$9',
    features: [
      '2 Family members',
      '2 Geofenced saved places',
      '15 Active requests & errands / mo',
      '10 Receipt OCR scans / mo',
      '30 Pantry & essentials items',
      'Shared calendar & expense overview',
      'Standard community support',
    ],
  },
  pilot: {
    price: '$19',
    features: [
      '4 Family members',
      '5 Geofenced saved places',
      '40 Active requests & errands / mo',
      '5 Urgent voice escalations / mo',
      '10 Direct member calls / mo',
      '30 Receipt OCR scans / mo',
      '100 Pantry & essentials items',
      'Automated restock reminders',
      'Standard email support',
    ],
  },
  standard: {
    price: '$49',
    features: [
      '10 Family members',
      '20 Geofenced saved places',
      '250 Active requests & errands / mo',
      '30 Urgent voice escalations / mo',
      '100 Direct member calls / mo',
      '150 Receipt OCR scans / mo',
      '500 Pantry & essentials items',
      'AI Assistant & NLP parser',
      'Priority SLA & phone support',
    ],
  },
  enterprise: {
    price: '$99',
    features: [
      'Unlimited family members',
      'Unlimited geofenced places',
      'Unlimited monthly requests',
      'Unlimited voice calls & escalations',
      'Unlimited receipt scans & pantry',
      'Dedicated account manager & 24/7 SLA',
    ],
  },
};

export function BillingPage() {
  const queryClient = useQueryClient();
  const active = useTenantStore((state) => state.active);

  const [activeTab, setActiveTab] = useState<'plan' | 'invoices' | 'refund-policy'>('plan');
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [newInvoiceModal, setNewInvoiceModal] = useState<InvoiceRecord | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
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
      if (data.invoice) {
        setNewInvoiceModal(data.invoice);
      }
      queryClient.invalidateQueries({ queryKey: ['billing', 'invoices'] });
      queryClient.invalidateQueries({ queryKey: ['tenant', 'quotas'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => (await api.post('/v1/billing/cancel')).data,
    onSuccess: () => {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    },
    onError: (err) => {
      setError(apiError(err));
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

  const handleSimulatePayment = async () => {
    // Card payments go through the configured provider's hosted checkout. The
    // invoice stays pending until its signed webhook settles it. When the
    // platform has no provider keys, keep the local simulated flow.
    const activeGateway = paymentMethodsQuery.data?.active_gateway;
    const hostedGateways = ['stripe', 'paypal', 'razorpay'];

    if (paymentMethod === 'card' && activeGateway && hostedGateways.includes(activeGateway)) {
      try {
        const response = await api.post('/v1/billing/checkout-session', {
          tier: selectedTier,
          billing_period: selectedPeriod,
          gateway: activeGateway,
          success_url: `${window.location.origin}/billing?checkout=success`,
          cancel_url: `${window.location.origin}/billing?checkout=cancelled`,
        });

        const url = response.data?.data?.checkout?.url;

        if (typeof url === 'string' && url !== '') {
          window.location.href = url;
          return;
        }

        throw new Error('The checkout session did not include a redirect URL.');
      } catch (caught) {
        const status = (caught as { response?: { status?: number } }).response?.status;

        if (status !== 422) {
          setError(apiError(caught));
          setNotice(null);
          return;
        }

        // 422 means the gateway is not configured on this platform; fall back
        // to the existing simulated invoice so local development still works.
      }
    }

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
          title="Billing &amp; Plans"
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
            Invoices &amp; Receipts {invoicesQuery.isLoading ? '' : `(${invoicesList.length})`}
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
                      <Button
                        variant="outline"
                        className="text-error border-error/30 hover:bg-coral-soft"
                        onClick={() => setCancelModalOpen(true)}
                      >
                        <Icon name="cancel" className="text-[16px]" />
                        Cancel Plan
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-stretch">
                    {usage.map((meter) => (
                      <div
                        key={meter.label}
                        className="flex flex-col justify-between h-full w-full gap-2 rounded-2xl border border-[rgba(43,45,66,0.04)] bg-canvas p-4"
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
                {plans.map((tier) => {
                  const isCurrent = tier.key === active?.subscription_tier;
                  const details = planFeaturePoints[tier.key] ?? {
                    price: '$19',
                    features: ['Multi-member household', 'Standard quotas'],
                  };

                  return (
                    <Card
                      key={tier.key}
                      className={`flex flex-col justify-between h-full w-full gap-4 p-5 ${
                        isCurrent ? 'border-2 border-secondary shadow-e3 bg-forest-soft/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-0.5">
                          <h3 className="text-headline-sm text-on-surface">{tier.label}</h3>
                          <span className="text-body-xs text-muted">{tier.tagline}</span>
                        </div>
                        {isCurrent && <Badge tone="primary">Current</Badge>}
                      </div>

                      <div className="text-2xl font-extrabold text-on-surface">
                        {details.price} <span className="text-xs font-normal text-muted">/ month</span>
                      </div>

                      <ul className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3 my-1">
                        {details.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-on-surface">
                            <Icon name="check_circle" className="text-[16px] text-secondary shrink-0 mt-0.5" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        variant={isCurrent ? 'soft' : 'outline'}
                        onClick={() => {
                          setSelectedTier(tier.key as any);
                          setUpgradeModalOpen(true);
                        }}
                        className="mt-auto w-full"
                      >
                        {isCurrent ? 'Active Plan' : `Select ${tier.label}`}
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
            {/* Header Card with Warm Sage Banner */}
            <div className="relative overflow-hidden rounded-2xl border border-secondary/20 bg-forest-soft/40 p-6 shadow-e1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-white shadow-xs">
                    <Icon name="verified_user" className="text-[26px]" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-headline-sm font-extrabold text-on-surface">Household Refund &amp; Guarantee Protection</h3>
                      <Badge tone="success">Guaranteed</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
                      Every subscription comes with our graduated refund guarantee and automated proration protection. Submit claims directly to billing operations or simulate refund eligibility.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
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
                      Public Terms
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* 3 Unified StatCards */}
            <StatGrid count={3}>
              <StatCard
                title="Current Commitment"
                value={quota.planLabel}
                icon="verified_user"
                tone="forest"
                valueClassName="capitalize"
                highlight={<StatHighlight tone="success">Active</StatHighlight>}
              />
              <StatCard
                title="Latest Invoice"
                value={invoicesList[0] ? `$${(invoicesList[0].amount_cents / 100).toFixed(2)}` : 'Trial'}
                icon="receipt_long"
                tone="sage"
                valueClassName="font-mono"
                highlight={
                  invoicesList[0] ? (
                    <StatHighlight tone={invoicesList[0].status === 'paid' ? 'success' : 'warning'}>
                      {invoicesList[0].status.toUpperCase()}
                    </StatHighlight>
                  ) : (
                    <StatHighlight tone="neutral">No Invoices</StatHighlight>
                  )
                }
              />
              <StatCard
                title="Refund Eligibility"
                value="100% Grace"
                icon="security"
                tone="forest"
                valueClassName="text-secondary"
                highlight={<StatHighlight tone="success">Eligible</StatHighlight>}
              />
            </StatGrid>

            {/* Graduated Refund Pillars Breakdown */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Monthly Subscriptions Card */}
              <div className="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-e1">
                <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="calendar_month" className="text-[22px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Monthly Plan Schedule</h4>
                      <p className="text-xs text-muted">30-day graduated guarantee milestones</p>
                    </div>
                  </div>
                  <Badge tone="success">Monthly</Badge>
                </div>

                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex items-start gap-3 rounded-xl border border-secondary/30 bg-forest-soft/30 p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-secondary text-white text-xs font-bold">1</span>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">Days 1 to 7 (Grace Window)</span>
                        <Badge tone="success">100% Full Refund</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                        Unconditional full refund directly back to your payment card with zero deductions.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-50/40 p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-bold">2</span>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">Days 8 to 20 (Buffer Window)</span>
                        <Badge tone="warning">50% Prorated</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                        50% refund returned. Reverting to previous subscription tier is supported.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-3.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-outline text-white text-xs font-bold">3</span>
                    <div className="flex flex-col flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface">Day 21+ (Active Term)</span>
                        <Badge tone="neutral">Term Active</Badge>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted leading-relaxed">
                        Subscription completes term. Data remains safely preserved for 90 days in vault.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Annual Commitments Card */}
              <div className="flex flex-col rounded-2xl border border-outline-variant/30 bg-surface p-6 shadow-e1">
                <div className="flex items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                      <Icon name="workspace_premium" className="text-[22px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Annual Plan Schedule</h4>
                      <p className="text-xs text-muted">Yearly subscription graduated tiers</p>
                    </div>
                  </div>
                  <Badge tone="warning">Save 20%</Badge>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Days 1 to 15</span>
                      <Badge tone="success">100%</Badge>
                    </div>
                    <span className="text-[11px] text-muted">Annual unconditional trial guarantee</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Month 1 (Days 16–30)</span>
                      <Badge tone="success">75%</Badge>
                    </div>
                    <span className="text-[11px] text-muted">75% refund returned upon early review</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Months 2 to 3</span>
                      <Badge tone="warning">50%</Badge>
                    </div>
                    <span className="text-[11px] text-muted">50% refund. Plan reverting permitted</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl border border-outline-variant/30 bg-surface p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-on-surface">Months 4 to 6</span>
                      <Badge tone="warning">25%</Badge>
                    </div>
                    <span className="text-[11px] text-muted">25% refund through month 6. 0% after</span>
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-outline-variant/20 flex items-center gap-2 text-xs text-muted">
                  <Icon name="info" className="text-[16px] text-secondary" />
                  <span>Reverting to a previous plan is permitted while within the 50% refund window.</span>
                </div>
              </div>
            </div>

            {/* Core Household Guarantees 4-Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="currency_exchange" className="text-[20px]" />
                </span>
                <h4 className="text-label-md font-bold text-on-surface">Automated Proration</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Remaining unused days on your active plan are calculated down to the day and credited directly toward any upgrade.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                  <Icon name="undo" className="text-[20px]" />
                </span>
                <h4 className="text-label-md font-bold text-on-surface">Revert Plan Guarantee</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Changed your mind? Revert back to your previous household tier anytime while within the 50% refund eligibility window.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                  <Icon name="payments" className="text-[20px]" />
                </span>
                <h4 className="text-label-md font-bold text-on-surface">Cash Settlement Flow</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Cash payment invoices are verified in person by your platform administrator before marking settlement and enabling invoice downloads.
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-xs">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-soft text-primary">
                  <Icon name="lock_reset" className="text-[20px]" />
                </span>
                <h4 className="text-label-md font-bold text-on-surface">90-Day Vault Retention</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Upon cancellation, all family lists, places, and financial entries are safely encrypted for 90 days. Reactivate anytime with zero data loss.
                </p>
              </div>
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

        {/* Instant Post-Payment Invoice Modal (Point 23) */}
        <Modal
          open={newInvoiceModal !== null}
          onClose={() => setNewInvoiceModal(null)}
          title="Payment Confirmed & Invoice Issued"
          description="Your household subscription has been updated and an official tax invoice has been generated."
          className="max-w-lg"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  if (newInvoiceModal) {
                    handleDownloadInvoice(newInvoiceModal.id, newInvoiceModal.invoice_number);
                  }
                }}
              >
                <Icon name="download" className="text-[16px]" />
                View / Print Invoice
              </Button>
              <Button
                variant="primary"
                onClick={() => setNewInvoiceModal(null)}
              >
                Done &amp; Return to Billing
              </Button>
            </div>
          }
        >
          {newInvoiceModal && (
            <div className="flex flex-col gap-4 p-2">
              <div className="flex items-center gap-3 rounded-2xl bg-forest-soft p-4 border border-secondary/20">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary text-white">
                  <Icon name="verified" className="text-[28px]" />
                </span>
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-secondary uppercase tracking-wider">Transaction Success</span>
                  <span className="text-headline-sm font-bold text-on-surface">Invoice #{newInvoiceModal.invoice_number}</span>
                  <span className="text-xs text-muted">
                    {newInvoiceModal.payment_method === 'cash' ? 'Pending in-person settlement' : 'Paid in full via online payment'}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 flex flex-col gap-2.5 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-outline-variant/15">
                  <span className="text-muted">Subscription Tier:</span>
                  <span className="font-bold text-on-surface capitalize">{newInvoiceModal.tier.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-outline-variant/15">
                  <span className="text-muted">Billing Cycle:</span>
                  <span className="font-bold text-on-surface capitalize">{newInvoiceModal.billing_period}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-outline-variant/15">
                  <span className="text-muted">Amount Billed:</span>
                  <span className="font-bold text-secondary text-sm">${(newInvoiceModal.amount_cents / 100).toFixed(2)} {newInvoiceModal.currency}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-muted">Payment Method:</span>
                  <span className="font-bold text-on-surface capitalize">{newInvoiceModal.payment_method}</span>
                </div>
              </div>

              {newInvoiceModal.payment_method === 'cash' && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-xs text-amber-900">
                  <strong>Cash Notice:</strong> This invoice is pending collection. Once paid in person to your platform administrator, it will be marked as paid and downloadable from your permanent vault.
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Cancellation Confirmation Modal (Point 23) */}
        <Modal
          open={cancelModalOpen}
          onClose={() => setCancelModalOpen(false)}
          title="Cancel FairShare Subscription"
          description="Are you sure you want to cancel your household subscription?"
          footer={
            <div className="flex items-center justify-end gap-2 w-full">
              <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
                Keep My Plan
              </Button>
              <Button
                className="bg-error text-white hover:bg-error/90"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate()}
              >
                {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3 p-1 text-xs text-on-surface">
            <div className="rounded-xl border border-error/30 bg-coral-soft/50 p-3 text-error">
              <strong>Notice:</strong> Cancelling your plan immediately ends your current billing cycle, revokes active sessions, and logs you out.
            </div>
            <p>
              Upon logging in again, your account will be in a read-only locked state. All household activities, tasks, pantry, and finances will require an active subscription to access. You will only have access to Billing &amp; Subscriptions to reactivate your plan.
            </p>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
