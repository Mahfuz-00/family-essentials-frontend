import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { PlatformBillingInvoice } from '@/types';

interface InvoicesApiResponse {
  invoices: {
    data: PlatformBillingInvoice[];
    total: number;
    current_page: number;
    last_page: number;
  };
  stats: {
    total_count: number;
    paid_count: number;
    pending_cash_count: number;
    pending_cash_cents: number;
    total_revenue_cents: number;
  };
}

export function AdminBillingPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'failed'>('all');
  const [methodFilter, setMethodFilter] = useState<'all' | 'cash' | 'card'>('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Invoice Print / Preview Modal State
  const [invoiceModalHtml, setInvoiceModalHtml] = useState<string | null>(null);
  const [invoiceModalNumber, setInvoiceModalNumber] = useState<string>('');
  const [fetchingInvoiceId, setFetchingInvoiceId] = useState<number | null>(null);

  const handlePrintOrPreview = async (invoiceId: number, invoiceNumber: string) => {
    setFetchingInvoiceId(invoiceId);
    setError(null);
    try {
      const resp = await api.get<string>(`/v1/platform/billing/invoices/${invoiceId}/download`, {
        responseType: 'text' as any,
      });
      setInvoiceModalHtml(resp.data);
      setInvoiceModalNumber(invoiceNumber);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setFetchingInvoiceId(null);
    }
  };

  const billingQuery = useQuery({
    queryKey: ['platform', 'billing', 'invoices', statusFilter, methodFilter, search],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (methodFilter !== 'all') {
        params.append('payment_method', methodFilter === 'card' ? 'credit_card' : 'cash');
      }
      if (search.trim()) params.append('search', search.trim());

      return (
        await api.get<InvoicesApiResponse>(`/v1/platform/billing/invoices?${params.toString()}`)
      ).data;
    },
  });

  const pendingCashQuery = useQuery({
    queryKey: ['platform', 'billing', 'pending-cash'],
    queryFn: async () =>
      (await api.get<{ data: PlatformBillingInvoice[]; count: number }>('/v1/platform/billing/pending-cash')).data,
  });

  const approveMutation = useMutation({
    mutationFn: async (invoiceId: number) =>
      (await api.post(`/v1/platform/billing/invoices/${invoiceId}/approve-cash`)).data,
    onSuccess: (data: any) => {
      setNotice(data.message ?? 'Cash payment approved successfully and household upgraded.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (invoiceId: number) =>
      (await api.post(`/v1/platform/billing/invoices/${invoiceId}/reject-cash`)).data,
    onSuccess: (data: any) => {
      setNotice(data.message ?? 'Cash payment declined.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'billing'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'notifications'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const stats = billingQuery.data?.stats;
  const pendingCashList = pendingCashQuery.data?.data ?? [];
  const invoicesList = billingQuery.data?.invoices.data ?? [];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-7xl">
        <PageHeader
          title="Billing, Invoices &amp; Cash Settlements"
          description="Approve in-person cash payments, track subscription revenue, and manage household billing transactions across the platform."
          actions={
            <Link to="/admin/payment-gateways">
              <Button variant="outline">
                <Icon name="tune" className="text-[18px]" />
                Payment Gateway Config
              </Button>
            </Link>
          }
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="flex flex-col gap-1.5 p-4 border-l-4 border-amber-500 bg-surface">
            <div className="flex items-center justify-between text-muted">
              <span className="text-body-xs font-semibold uppercase tracking-wider">Pending Cash</span>
              <Icon name="payments" className="text-[20px] text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-headline-md font-bold text-on-surface">
                {stats?.pending_cash_count ?? pendingCashList.length}
              </span>
              <span className="text-body-xs font-semibold text-amber-600">
                ${(((stats?.pending_cash_cents ?? 0) / 100).toFixed(2))} due
              </span>
            </div>
            <p className="text-[11px] text-muted">Awaiting in-person cash collection</p>
          </Card>

          <Card className="flex flex-col gap-1.5 p-4 border-l-4 border-secondary bg-surface">
            <div className="flex items-center justify-between text-muted">
              <span className="text-body-xs font-semibold uppercase tracking-wider">Paid Invoices</span>
              <Icon name="verified" className="text-[20px] text-secondary" />
            </div>
            <span className="text-headline-md font-bold text-on-surface">
              {stats?.paid_count ?? 0}
            </span>
            <p className="text-[11px] text-muted">Successfully collected &amp; active</p>
          </Card>

          <Card className="flex flex-col gap-1.5 p-4 border-l-4 border-forest-deep bg-surface">
            <div className="flex items-center justify-between text-muted">
              <span className="text-body-xs font-semibold uppercase tracking-wider">Total Revenue</span>
              <Icon name="attach_money" className="text-[20px] text-forest-deep" />
            </div>
            <span className="text-headline-md font-bold text-on-surface">
              ${(((stats?.total_revenue_cents ?? 0) / 100).toFixed(2))}
            </span>
            <p className="text-[11px] text-muted">Lifetime platform invoice volume</p>
          </Card>

          <Card className="flex flex-col gap-1.5 p-4 border-l-4 border-outline-variant bg-surface">
            <div className="flex items-center justify-between text-muted">
              <span className="text-body-xs font-semibold uppercase tracking-wider">Total Invoices</span>
              <Icon name="receipt" className="text-[20px] text-muted" />
            </div>
            <span className="text-headline-md font-bold text-on-surface">
              {stats?.total_count ?? invoicesList.length}
            </span>
            <p className="text-[11px] text-muted">Generated across all households</p>
          </Card>
        </div>

        {/* Actionable Pending Cash Settlements Queue */}
        {pendingCashList.length > 0 && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                  <Icon name="pending_actions" className="text-[18px]" />
                </span>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Action Required: Pending In-Person Cash Settlements ({pendingCashList.length})
                </h3>
              </div>
              <Badge tone="warning">Awaiting Approval</Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pendingCashList.map((invoice) => (
                <Card
                  key={invoice.id}
                  className="flex flex-col justify-between gap-4 p-5 border-amber-300 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-label-lg font-bold text-on-surface">
                          {invoice.tenant?.name ?? `Household #${invoice.tenant_id}`}
                        </h4>
                        <span className="font-mono text-body-xs text-muted">{invoice.invoice_number}</span>
                      </div>
                      <Badge tone="warning">Pending Cash</Badge>
                    </div>

                    <div className="flex flex-col gap-1 rounded-xl bg-surface p-3 text-xs border border-outline-variant/30">
                      <div className="flex justify-between">
                        <span className="text-muted">Target Plan Tier:</span>
                        <span className="font-bold capitalize text-on-surface">{invoice.tier}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Billing Cycle:</span>
                        <span className="capitalize text-on-surface">{invoice.billing_period}</span>
                      </div>
                      <div className="flex justify-between border-t border-outline-variant/20 pt-1 mt-1 font-bold text-secondary">
                        <span>Cash Amount Due:</span>
                        <span>${(invoice.amount_cents / 100).toFixed(2)} {invoice.currency}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted">
                        <span>Requested:</span>
                        <span>{new Date(invoice.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintOrPreview(invoice.id, invoice.invoice_number)}
                      disabled={fetchingInvoiceId === invoice.id}
                      title="Download or print physical invoice for in-person handover"
                    >
                      <Icon name="print" className="text-[16px]" />
                      {fetchingInvoiceId === invoice.id ? 'Loading Invoice…' : 'Print Handover Invoice'}
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(invoice.id)}
                      >
                        <Icon name="close" className="text-[16px]" />
                        Decline
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(invoice.id)}
                      >
                        <Icon name="check_circle" className="text-[16px]" />
                        {approveMutation.isPending ? 'Approving…' : 'Approve & Mark Paid'}
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Full Invoices & Transactions Table */}
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-headline-sm font-bold text-on-surface">All Platform Invoices</h3>

            <div className="flex flex-wrap items-center gap-2">
              <div className="w-56">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search invoice or household…"
                />
              </div>

              {/* Status Filter */}
              <div className="flex rounded-xl border border-outline-variant/40 bg-surface p-0.5 text-xs">
                {(['all', 'pending', 'paid', 'failed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={`rounded-lg px-2.5 py-1 font-semibold capitalize transition-colors ${
                      statusFilter === s
                        ? 'bg-secondary text-on-secondary'
                        : 'text-muted hover:text-on-surface'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Payment Method Filter */}
              <div className="flex rounded-xl border border-outline-variant/40 bg-surface p-0.5 text-xs">
                {(['all', 'cash', 'card'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethodFilter(m)}
                    className={`rounded-lg px-2.5 py-1 font-semibold capitalize transition-colors ${
                      methodFilter === m
                        ? 'bg-forest-soft text-secondary'
                        : 'text-muted hover:text-on-surface'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {billingQuery.isLoading ? (
            <p className="text-body-md text-muted py-6 text-center">Loading platform invoices…</p>
          ) : invoicesList.length === 0 ? (
            <div className="py-12 text-center text-muted">
              <Icon name="receipt_long" className="mx-auto text-[36px] opacity-40 mb-2" />
              <p className="text-body-md font-semibold">No invoices match your filter criteria.</p>
              <p className="text-body-xs">When tenants upgrade plans or submit cash payments, records will appear here.</p>
            </div>
          ) : (
            <Table>
              <THead>
                <TH>Invoice #</TH>
                <TH>Household</TH>
                <TH>Tier &amp; Period</TH>
                <TH>Amount</TH>
                <TH>Method</TH>
                <TH>Status</TH>
                <TH>Date</TH>
                <TH className="text-right">Actions</TH>
              </THead>
              <tbody>
                {invoicesList.map((invoice) => (
                  <TR key={invoice.id}>
                    <TD className="font-mono text-xs font-bold text-secondary">
                      {invoice.invoice_number}
                    </TD>
                    <TD className="text-xs font-semibold text-on-surface">
                      {invoice.tenant ? (
                        <Link
                          to="/admin/tenants/$tenantId"
                          params={{ tenantId: String(invoice.tenant.id) }}
                          className="hover:underline text-secondary font-medium"
                        >
                          {invoice.tenant.name}
                        </Link>
                      ) : (
                        `Household #${invoice.tenant_id}`
                      )}
                    </TD>
                    <TD className="capitalize text-xs">
                      {invoice.tier} ({invoice.billing_period})
                    </TD>
                    <TD className="text-xs font-bold text-on-surface">
                      ${(invoice.amount_cents / 100).toFixed(2)} {invoice.currency}
                    </TD>
                    <TD className="text-xs text-muted">
                      {invoice.payment_method === 'cash' ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Icon name="payments" className="text-[14px]" />
                          Cash
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Icon name="credit_card" className="text-[14px]" />
                          Card (•••• {invoice.last4 || '4242'})
                        </span>
                      )}
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          invoice.status === 'paid'
                            ? 'success'
                            : invoice.status === 'pending'
                            ? 'warning'
                            : 'danger'
                        }
                      >
                        {invoice.status.toUpperCase()}
                      </Badge>
                    </TD>
                    <TD className="text-xs text-muted">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </TD>
                    <TD className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintOrPreview(invoice.id, invoice.invoice_number)}
                          disabled={fetchingInvoiceId === invoice.id}
                          title={invoice.payment_method === 'cash' ? 'Download or print physical invoice for cash handover' : 'Download Invoice Receipt'}
                        >
                          <Icon name={invoice.payment_method === 'cash' ? 'print' : 'download'} className="text-[14px]" />
                          {fetchingInvoiceId === invoice.id
                            ? 'Loading…'
                            : invoice.payment_method === 'cash'
                            ? 'Print'
                            : 'Receipt'}
                        </Button>
                        {invoice.status === 'pending' && invoice.payment_method === 'cash' && (
                          <Button
                            size="sm"
                            variant="primary"
                            disabled={approveMutation.isPending}
                            onClick={() => approveMutation.mutate(invoice.id)}
                          >
                            <Icon name="check_circle" className="text-[14px]" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        {/* Invoice Viewer & Print Handover Modal */}
        <Modal
          open={invoiceModalHtml !== null}
          onClose={() => setInvoiceModalHtml(null)}
          title={`Official Invoice Voucher — ${invoiceModalNumber}`}
          className="max-w-4xl"
          footer={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  if (!invoiceModalHtml) return;
                  const blob = new Blob([invoiceModalHtml], { type: 'text/html' });
                  window.open(URL.createObjectURL(blob), '_blank');
                }}
              >
                <Icon name="open_in_new" className="text-[16px]" />
                Open in New Window
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  const frame = document.getElementById('admin-invoice-frame') as HTMLIFrameElement;
                  if (frame?.contentWindow) {
                    frame.contentWindow.focus();
                    frame.contentWindow.print();
                  }
                }}
              >
                <Icon name="print" className="text-[16px]" />
                Print Handover Document
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-muted">
              Official printed invoice voucher for in-person cash settlement. Review details below and click print to hand to the tenant.
            </p>
            <div className="h-[520px] w-full rounded-2xl border border-outline-variant/30 bg-white shadow-inner overflow-hidden">
              <iframe
                id="admin-invoice-frame"
                title="Official Invoice Voucher"
                srcDoc={invoiceModalHtml ?? ''}
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
