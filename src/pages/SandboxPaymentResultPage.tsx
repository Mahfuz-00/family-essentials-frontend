import { useEffect, useState } from 'react';
import { useNavigate, useParams, useRouterState } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, apiError } from '@/lib/api';
import type { SandboxInvoice, SandboxPaymentStatus } from '@/types';

/** How long the invoice stays on screen before returning to the gateway console. */
const RETURN_DELAY_SECONDS = 30;

function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
  }
}

function formatInvoiceDate(value?: string | null): string {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}

/** Download the display-only invoice as a printable HTML file. Nothing is persisted. */
function downloadInvoice(invoice: SandboxInvoice, gatewayName: string): void {
  const rows: Array<[string, string]> = [
    ['Invoice', invoice.invoice_number],
    ['Gateway', gatewayName],
    ['Amount', `${(invoice.amount_cents / 100).toFixed(2)} ${invoice.currency}`],
    ['Plan', `${invoice.tier} (${invoice.billing_period})`],
    ['Status', invoice.status],
    ['Issued', formatInvoiceDate(invoice.issued_at)],
    ['Paid', invoice.paid_at ? formatInvoiceDate(invoice.paid_at) : '—'],
    ['Provider reference', invoice.reference ?? '—'],
  ];
  const body = rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(invoice.invoice_number)}</title>
<style>body{font-family:system-ui,sans-serif;margin:40px;color:#1c2b22}h1{font-size:20px}table{border-collapse:collapse;margin-top:20px;min-width:360px}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #dde5df}th{color:#5b6b61;font-weight:600}.note{margin-top:24px;font-size:12px;color:#5b6b61}</style></head>
<body><h1>FairShare sandbox test invoice</h1><p>${escapeHtml(invoice.invoice_number)}</p><table>${body}</table>
<p class="note">Generated for a sandbox payment test. This invoice is not saved to the billing ledger.</p></body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${invoice.invoice_number}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function statusLabel(status: SandboxPaymentStatus['status'] | undefined): string {
  switch (status) {
    case 'paid':
      return 'Payment confirmed';
    case 'failed':
      return 'Payment failed';
    case 'pending':
      return 'Waiting for the provider';
    default:
      return 'Payment result';
  }
}

/**
 * The provider returns the browser here after a sandbox payment. The page is
 * deliberately bare: it shows the generated (display-only) invoice, then returns
 * to the gateway console where the sandbox payment was triggered.
 */
export function SandboxPaymentResultPage() {
  const navigate = useNavigate();
  const { token } = useParams({ from: '/sandbox/payment-result/$token' });
  const search = useRouterState({ select: (state) => state.location.search as Record<string, unknown> });
  const flow = typeof search.flow === 'string' ? search.flow : 'success';
  const [seconds, setSeconds] = useState(RETURN_DELAY_SECONDS);

  const result = useQuery({
    queryKey: ['platform', 'settings', 'payment', 'sandbox-result', token],
    queryFn: async () =>
      (
        await api.get<{ data: SandboxPaymentStatus }>(
          `/v1/sandbox-payment-result/${encodeURIComponent(token)}`,
        )
      ).data.data,
    enabled: token !== '',
    retry: false,
    refetchInterval: (query) => {
      const value = query.state.data?.status;
      return value === 'paid' || value === 'failed' ? false : 4_000;
    },
  });

  useEffect(() => {
    if (!result.data) {
      return;
    }
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => window.clearInterval(timer);
  }, [result.data]);

  useEffect(() => {
    if (seconds > 0) {
      return;
    }
    navigate({ to: '/admin/payment-gateways' });
  }, [seconds, navigate]);

  const invoice = result.data?.invoice ?? null;
  const paid = result.data?.status === 'paid';
  const failed = result.data?.status === 'failed';
  const cancelled = flow === 'cancelled';

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-4 sm:p-6">
      <Card className="w-full max-w-lg p-6 sm:p-8">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
              paid
                ? 'bg-forest-soft text-secondary'
                : failed || cancelled
                  ? 'bg-surface-container-high text-error'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300'
            }`}
          >
            <Icon name={paid ? 'check_circle' : failed || cancelled ? 'error' : 'hourglass_top'} className="text-[24px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Sandbox payment</p>
            <h1 className="text-headline-sm font-bold text-on-surface">
              {cancelled && !paid ? 'Payment cancelled' : statusLabel(result.data?.status)}
            </h1>
            <p className="mt-1 text-body-sm text-muted">
              {result.data?.message ??
                (cancelled
                  ? 'The provider reported that the checkout was cancelled.'
                  : 'Reading the sandbox payment result…')}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {token === '' ? (
            <Alert tone="error">This result link is missing its sandbox payment token.</Alert>
          ) : result.isLoading ? (
            <div className="flex flex-col gap-2" role="status" aria-live="polite">
              <div className="h-5 w-40 animate-pulse rounded bg-surface-container-high" />
              <div className="h-4 w-56 animate-pulse rounded bg-surface-container-high" />
              <div className="h-24 animate-pulse rounded-xl bg-surface-container-high" />
            </div>
          ) : result.isError ? (
            <Alert tone="error">{apiError(result.error)}</Alert>
          ) : invoice ? (
            <section
              aria-label="Sandbox test invoice"
              className="rounded-2xl border border-outline-variant/40 bg-surface-container-low p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Test invoice</p>
                  <p className="break-all font-mono text-label-md font-bold text-on-surface">
                    {invoice.invoice_number}
                  </p>
                </div>
                <Badge
                  tone={invoice.status === 'paid' ? 'success' : invoice.status === 'failed' ? 'danger' : 'warning'}
                >
                  {invoice.status === 'paid' ? 'Paid' : invoice.status === 'failed' ? 'Failed' : 'Pending'}
                </Badge>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-body-sm">
                <div>
                  <dt className="text-[11px] text-muted">Amount</dt>
                  <dd className="font-bold text-on-surface">{formatAmount(invoice.amount_cents, invoice.currency)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Plan</dt>
                  <dd className="font-semibold capitalize text-on-surface">
                    {invoice.tier} · {invoice.billing_period}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">{invoice.paid_at ? 'Paid at' : 'Issued at'}</dt>
                  <dd className="font-semibold text-on-surface">
                    {formatInvoiceDate(invoice.paid_at ?? invoice.issued_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] text-muted">Gateway</dt>
                  <dd className="font-semibold capitalize text-on-surface">{invoice.payment_method}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] leading-snug text-muted">
                  Sandbox test invoice — generated for this flow, not saved to billing.
                </p>
                <Button size="sm" variant="outline" onClick={() => downloadInvoice(invoice, invoice.payment_method)}>
                  <Icon name="download" className="text-[16px]" />
                  Download
                </Button>
              </div>
            </section>
          ) : (
            <Alert tone="warning">No invoice was generated for this sandbox payment.</Alert>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
          <p className="text-body-xs text-muted" role="status" aria-live="polite">
            {result.data
              ? `Returning to payment gateways in ${seconds}s…`
              : 'Returning to payment gateways shortly…'}
          </p>
          <Button size="sm" variant="primary" onClick={() => navigate({ to: '/admin/payment-gateways' })}>
            Back to payment gateways
          </Button>
        </div>
      </Card>
    </div>
  );
}
