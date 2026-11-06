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
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { api, apiError } from '@/lib/api';
import type { PaymentGatewaySettings } from '@/types';

const currencies = [
  { code: 'USD', label: 'USD ($) — US Dollar' },
  { code: 'EUR', label: 'EUR (€) — Euro' },
  { code: 'GBP', label: 'GBP (£) — British Pound' },
  { code: 'BDT', label: 'BDT (৳) — Bangladeshi Taka' },
  { code: 'CAD', label: 'CAD ($) — Canadian Dollar' },
  { code: 'AUD', label: 'AUD ($) — Australian Dollar' },
];

export function PaymentGatewayConfigPage() {
  const queryClient = useQueryClient();
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{
    status: string;
    message: string;
    latency_ms?: number;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentQuery = useQuery({
    queryKey: ['platform', 'settings', 'payment'],
    queryFn: async () =>
      (await api.get<{ data: PaymentGatewaySettings }>('/v1/platform/settings/payment')).data.data,
  });

  const [form, setForm] = useState<PaymentGatewaySettings | null>(null);

  // Sync state once data loads
  const currentSettings = form ?? paymentQuery.data;

  const updateMutation = useMutation({
    mutationFn: async (settings: PaymentGatewaySettings) =>
      (await api.post('/v1/platform/settings/payment', settings)).data,
    onSuccess: () => {
      setNotice('Payment gateway configuration saved.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'settings', 'payment'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const runTest = async (gatewayName: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = (
        await api.post<{ status: string; message: string; latency_ms: number }>(
          '/v1/platform/settings/payment/test',
          { gateway: gatewayName },
        )
      ).data;
      setTestResult(res);
    } catch (err) {
      setTestResult({ status: 'error', message: apiError(err) });
    } finally {
      setTesting(false);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleUpdate = (updater: (prev: PaymentGatewaySettings) => PaymentGatewaySettings) => {
    if (!currentSettings) return;
    setForm(updater(currentSettings));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Payment Gateway Configuration"
          description="Configure merchant credentials, active gateway provider, test sandboxes, currency, and webhook synchronization."
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {paymentQuery.isLoading && <p className="text-body-md text-muted">Loading settings…</p>}

        {currentSettings && (
          <div className="flex flex-col gap-6">
            {/* General Gateway Parameters */}
            <Card className="flex flex-col gap-5 p-6">
              <h3 className="text-headline-sm font-bold text-on-surface">General Billing &amp; Mode</h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <Label htmlFor="active-gateway">Active Payment Gateway</Label>
                  <Select
                    id="active-gateway"
                    value={currentSettings.active_gateway}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        active_gateway: e.target.value as PaymentGatewaySettings['active_gateway'],
                      }))
                    }
                  >
                    <option value="stripe">Stripe Payments</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="sslcommerz">SSLCommerz</option>
                    <option value="paypal">PayPal Commerce</option>
                    <option value="cash">Cash Payment (In-Person / Offline)</option>
                    <option value="mock">Internal Sandbox / Mock</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gateway-mode">Environment Mode</Label>
                  <Select
                    id="gateway-mode"
                    value={currentSettings.mode}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        mode: e.target.value as 'sandbox' | 'live',
                      }))
                    }
                  >
                    <option value="sandbox">Sandbox / Test Mode</option>
                    <option value="live">Live / Production</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="platform-currency">Platform Currency</Label>
                  <Select
                    id="platform-currency"
                    value={currentSettings.currency}
                    onChange={(e) =>
                      handleUpdate((prev) => ({
                        ...prev,
                        currency: e.target.value,
                      }))
                    }
                  >
                    {currencies.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-surface-container pt-4">
                <input
                  type="checkbox"
                  id="auto-billing"
                  checked={currentSettings.auto_billing_enabled}
                  onChange={(e) =>
                    handleUpdate((prev) => ({
                      ...prev,
                      auto_billing_enabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 cursor-pointer accent-secondary"
                />
                <Label htmlFor="auto-billing" className="cursor-pointer text-body-md font-medium text-on-surface">
                  Enable automated monthly recurring subscription renewals
                </Label>
              </div>
            </Card>

            {/* Gateway Specific Credentials Tabs / Cards */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Stripe Card */}
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="credit_card" className="text-[20px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Stripe</h4>
                      <p className="text-body-xs text-muted">Global card processing &amp; wallets</p>
                    </div>
                  </div>
                  {currentSettings.active_gateway === 'stripe' ? (
                    <Badge tone="success">Active Gateway</Badge>
                  ) : (
                    <Badge tone="neutral">Standby</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="stripe-pub">Publishable Key</Label>
                    <Input
                      id="stripe-pub"
                      value={currentSettings.gateways.stripe?.publishable_key ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          gateways: {
                            ...prev.gateways,
                            stripe: { ...prev.gateways.stripe, enabled: true, publishable_key: e.target.value },
                          },
                        }))
                      }
                      placeholder="pk_test_..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="stripe-sec">Secret Key</Label>
                    <div className="relative">
                      <Input
                        id="stripe-sec"
                        type={showSecrets['stripe_sec'] ? 'text' : 'password'}
                        value={currentSettings.gateways.stripe?.secret_key ?? ''}
                        onChange={(e) =>
                          handleUpdate((prev) => ({
                            ...prev,
                            gateways: {
                              ...prev.gateways,
                              stripe: { ...prev.gateways.stripe, enabled: true, secret_key: e.target.value },
                            },
                          }))
                        }
                        placeholder="sk_test_..."
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret('stripe_sec')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                      >
                        <Icon name={showSecrets['stripe_sec'] ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="stripe-wh">Webhook Signing Secret</Label>
                    <div className="relative">
                      <Input
                        id="stripe-wh"
                        type={showSecrets['stripe_wh'] ? 'text' : 'password'}
                        value={currentSettings.gateways.stripe?.webhook_secret ?? ''}
                        onChange={(e) =>
                          handleUpdate((prev) => ({
                            ...prev,
                            gateways: {
                              ...prev.gateways,
                              stripe: { ...prev.gateways.stripe, enabled: true, webhook_secret: e.target.value },
                            },
                          }))
                        }
                        placeholder="whsec_..."
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecret('stripe_wh')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                      >
                        <Icon name={showSecrets['stripe_wh'] ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-surface-container pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testing}
                    onClick={() => runTest('stripe')}
                  >
                    <Icon name="bolt" className="text-[16px]" />
                    {testing ? 'Testing…' : 'Ping Stripe API'}
                  </Button>
                </div>
              </Card>

              {/* Razorpay & Local Providers Card */}
              <Card className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-soft text-primary">
                      <Icon name="account_balance" className="text-[20px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Razorpay &amp; SSLCommerz</h4>
                      <p className="text-body-xs text-muted">South Asia / India / Bangladesh gateways</p>
                    </div>
                  </div>
                  {currentSettings.active_gateway === 'razorpay' ||
                  currentSettings.active_gateway === 'sslcommerz' ? (
                    <Badge tone="success">Active Gateway</Badge>
                  ) : (
                    <Badge tone="neutral">Standby</Badge>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <div>
                    <Label htmlFor="razorpay-key">Razorpay Key ID</Label>
                    <Input
                      id="razorpay-key"
                      value={currentSettings.gateways.razorpay?.key_id ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          gateways: {
                            ...prev.gateways,
                            razorpay: { ...prev.gateways.razorpay, enabled: true, key_id: e.target.value },
                          },
                        }))
                      }
                      placeholder="rzp_test_..."
                    />
                  </div>

                  <div>
                    <Label htmlFor="sslcommerz-store">SSLCommerz Store ID</Label>
                    <Input
                      id="sslcommerz-store"
                      value={currentSettings.gateways.sslcommerz?.store_id ?? ''}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          gateways: {
                            ...prev.gateways,
                            sslcommerz: { ...prev.gateways.sslcommerz, enabled: true, store_id: e.target.value },
                          },
                        }))
                      }
                      placeholder="store_id"
                    />
                  </div>

                  <div className="rounded-xl bg-surface-container-low p-3">
                    <span className="text-label-sm font-semibold text-on-surface">Active Webhook Callback URL:</span>
                    <p className="mt-1 font-mono text-body-xs text-muted">
                      https://api.fairshare.app/v1/webhooks/payment
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between border-t border-surface-container pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testing}
                    onClick={() => runTest('razorpay')}
                  >
                    <Icon name="bolt" className="text-[16px]" />
                    {testing ? 'Testing…' : 'Ping Provider API'}
                  </Button>
                </div>
              </Card>

              {/* Cash Payment & Offline Settlement Card */}
              <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="payments" className="text-[20px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Cash Payment &amp; Offline Settlement</h4>
                      <p className="text-body-xs text-muted">Allow households to pay in-person or via manual cash handover</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentSettings.active_gateway === 'cash' ? (
                      <Badge tone="success">Primary Active Gateway</Badge>
                    ) : (currentSettings.gateways.cash?.enabled ?? false) ? (
                      <Badge tone="success">Cash Option Enabled</Badge>
                    ) : (
                      <Badge tone="neutral">Disabled</Badge>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3.5">
                    <input
                      type="checkbox"
                      id="cash-enabled"
                      checked={currentSettings.gateways.cash?.enabled ?? false}
                      onChange={(e) =>
                        handleUpdate((prev) => ({
                          ...prev,
                          gateways: {
                            ...prev.gateways,
                            cash: {
                              ...prev.gateways.cash,
                              enabled: e.target.checked,
                              instructions: prev.gateways.cash?.instructions ?? 'Cash payment upon in-person settlement or physical invoice collection.',
                              auto_mark_paid: prev.gateways.cash?.auto_mark_paid ?? true,
                            },
                          },
                        }))
                      }
                      className="h-4 w-4 cursor-pointer accent-secondary"
                    />
                    <div>
                      <Label htmlFor="cash-enabled" className="cursor-pointer font-bold text-on-surface">
                        Enable Cash Payment for Household Plan Upgrades
                      </Label>
                      <p className="text-body-xs text-muted">
                        When enabled, tenants will see &ldquo;Cash Payment / In-Person&rdquo; as a payment option on the billing upgrade modal.
                      </p>
                    </div>
                  </div>

                  {(currentSettings.gateways.cash?.enabled ?? false) && (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="flex flex-col gap-1.5 md:col-span-2">
                        <Label htmlFor="cash-instructions">Tenant Collection Instructions &amp; Notes</Label>
                        <textarea
                          id="cash-instructions"
                          rows={3}
                          value={currentSettings.gateways.cash?.instructions ?? ''}
                          onChange={(e) =>
                            handleUpdate((prev) => ({
                              ...prev,
                              gateways: {
                                ...prev.gateways,
                                cash: {
                                  ...prev.gateways.cash,
                                  enabled: true,
                                  instructions: e.target.value,
                                },
                              },
                            }))
                          }
                          className="w-full rounded-xl border border-outline-variant/50 bg-surface p-3 text-body-sm text-on-surface focus:border-secondary focus:outline-none"
                          placeholder="e.g. Please hand physical cash to your community manager at the central clubhouse or office desk."
                        />
                        <p className="text-body-xs text-muted">
                          These instructions will be displayed to the tenant in the checkout modal when they choose Cash Payment.
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="cash-auto-paid"
                          checked={currentSettings.gateways.cash?.auto_mark_paid ?? true}
                          onChange={(e) =>
                            handleUpdate((prev) => ({
                              ...prev,
                              gateways: {
                                ...prev.gateways,
                                cash: {
                                  ...prev.gateways.cash,
                                  enabled: true,
                                  auto_mark_paid: e.target.checked,
                                },
                              },
                            }))
                          }
                          className="h-4 w-4 cursor-pointer accent-secondary"
                        />
                        <Label htmlFor="cash-auto-paid" className="cursor-pointer text-body-sm text-on-surface">
                          Mark cash invoices as Paid immediately upon checkout
                        </Label>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-surface-container pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={testing}
                    onClick={() => runTest('cash')}
                  >
                    <Icon name="bolt" className="text-[16px]" />
                    {testing ? 'Testing…' : 'Test Cash Payment Configuration'}
                  </Button>

                  <Link to="/admin/billing">
                    <Button size="sm" variant="outline">
                      <Icon name="receipt_long" className="text-[16px]" />
                      Open Cash Settlement Queue &rarr;
                    </Button>
                  </Link>
                </div>
              </Card>
            </div>

            {/* Test Connection Result Alert */}
            {testResult && (
              <Alert tone={testResult.status === 'connected' ? 'success' : 'error'}>
                <div className="flex items-center gap-2">
                  <Icon name={testResult.status === 'connected' ? 'verified' : 'error'} className="text-[18px]" />
                  <span>{testResult.message}</span>
                </div>
              </Alert>
            )}

            {/* Save Buttons */}
            <div className="flex items-center justify-end gap-3">
              <Button
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(currentSettings)}
              >
                <Icon name="save" className="text-[18px]" />
                {updateMutation.isPending ? 'Saving Settings…' : 'Save Payment Configuration'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
