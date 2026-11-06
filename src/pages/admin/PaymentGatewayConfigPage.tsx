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
  { code: 'INR', label: 'INR (₹) — Indian Rupee' },
  { code: 'CAD', label: 'CAD ($) — Canadian Dollar' },
  { code: 'AUD', label: 'AUD ($) — Australian Dollar' },
  { code: 'NGN', label: 'NGN (₦) — Nigerian Naira' },
];

export function PaymentGatewayConfigPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'global' | 'south-asia' | 'africa' | 'offline' | 'sandbox'>('all');
  const [showSandboxCheatsheet, setShowSandboxCheatsheet] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{
    status: string;
    message: string;
    latency_ms?: number;
    mode?: string;
  } | null>(null);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
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
      setNotice('Payment gateway configuration saved successfully.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'settings', 'payment'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const runTest = async (gatewayName: string, modeOverride?: string) => {
    setTestingGateway(gatewayName);
    setTestResult(null);
    try {
      const payload: Record<string, any> = { gateway: gatewayName };
      if (gatewayName !== 'cash') {
        payload.mode = modeOverride || (currentSettings?.gateways[gatewayName]?.sandbox === false ? 'live' : 'sandbox');
      }
      const res = (
        await api.post<{ status: string; message: string; latency_ms: number; mode: string }>(
          '/v1/platform/settings/payment/test',
          payload,
        )
      ).data;
      setTestResult(res);
    } catch (err) {
      setTestResult({ status: 'error', message: apiError(err) });
    } finally {
      setTestingGateway(null);
    }
  };

  const toggleSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleUpdate = (updater: (prev: PaymentGatewaySettings) => PaymentGatewaySettings) => {
    if (!currentSettings) return;
    setForm(updater(currentSettings));
  };

  const updateGatewayField = (gateway: string, field: string, value: any) => {
    handleUpdate((prev) => ({
      ...prev,
      gateways: {
        ...prev.gateways,
        [gateway]: {
          ...prev.gateways[gateway],
          [field]: value,
        },
      },
    }));
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-7xl">
        <PageHeader
          title="Payment Gateway Configuration"
          description="Manage global and regional merchant gateways, test sandbox environments, currency, and offline collection workflows."
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {paymentQuery.isLoading && <p className="text-body-md text-muted">Loading settings…</p>}

        {currentSettings && (
          <div className="flex flex-col gap-6">
            {/* Global Environment & Mode Card */}
            <Card className="flex flex-col gap-5 p-6 border-l-4 border-secondary bg-surface">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Global Environment &amp; Billing Settings</h3>
                  <p className="text-xs text-muted">
                    Configure your platform billing mode, primary default gateway, and automated renewal triggers.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-muted">Environment:</span>
                  <div className="flex rounded-xl border border-outline-variant/40 bg-surface-container-low p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => handleUpdate((prev) => ({ ...prev, mode: 'sandbox' }))}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                        currentSettings.mode === 'sandbox'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-muted hover:text-on-surface'
                      }`}
                    >
                      <Icon name="science" className="text-[16px]" />
                      Sandbox / Test Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate((prev) => ({ ...prev, mode: 'live' }))}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                        currentSettings.mode === 'live'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted hover:text-on-surface'
                      }`}
                    >
                      <Icon name="verified" className="text-[16px]" />
                      Live / Production
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3 border-t border-outline-variant/20 pt-4">
                <div>
                  <Label htmlFor="active-gateway">Primary Default Payment Gateway</Label>
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
                    <option value="stripe">Stripe Payments (Credit Cards / Wallets)</option>
                    <option value="paypal">PayPal Commerce Platform</option>
                    <option value="razorpay">Razorpay (India / UPI / Cards)</option>
                    <option value="sslcommerz">SSLCommerz (Bangladesh Cards / MFS)</option>
                    <option value="bkash">bKash (Bangladesh Mobile Financial Service)</option>
                    <option value="nagad">Nagad (Bangladesh Digital MFS)</option>
                    <option value="paystack">Paystack (Africa / Cards / MoMo)</option>
                    <option value="mollie">Mollie (Europe / SEPA / iDEAL)</option>
                    <option value="bank_transfer">Direct Bank Transfer / Wire</option>
                    <option value="cash">Cash Payment (In-Person / Physical Collection)</option>
                    <option value="mock">Internal Sandbox Payment Simulator (Mock)</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="platform-currency">Platform Operating Currency</Label>
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

                <div>
                  <Label htmlFor="webhook-url">Unified Webhook Callback Endpoint</Label>
                  <Input
                    id="webhook-url"
                    value={currentSettings.webhook_url}
                    readOnly
                    className="bg-surface-container-low font-mono text-xs text-muted"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 border-t border-outline-variant/20 pt-3">
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
                  Enable automated monthly and annual recurring subscription renewals
                </Label>
              </div>
            </Card>

            {/* Sandbox Testing Cheatsheet & Mock Simulator Helper */}
            {currentSettings.mode === 'sandbox' && (
              <Card className="flex flex-col gap-3 p-5 border-amber-300 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Icon name="science" className="text-[20px]" />
                    <h4 className="text-sm font-bold">Sandbox Mode Active: Developer Test Cards &amp; Simulator Cheatsheet</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSandboxCheatsheet((p) => !p)}
                    className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
                  >
                    {showSandboxCheatsheet ? 'Collapse Simulator' : 'Expand Simulator'}
                  </button>
                </div>

                {showSandboxCheatsheet && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs pt-1">
                    <div className="rounded-xl border border-amber-200 bg-surface p-3 flex flex-col gap-1 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">Stripe Sandbox Card</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-secondary">
                        4242 4242 4242 4242
                      </code>
                      <span className="text-[11px] text-muted">Exp: Any future date · CVC: 123</span>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-surface p-3 flex flex-col gap-1 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">Stripe Declined Test Card</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-error">
                        4000 0000 0000 0002
                      </code>
                      <span className="text-[11px] text-muted">Simulates card insufficient funds / decline</span>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-surface p-3 flex flex-col gap-1 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">bKash / Nagad Sandbox OTP</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-secondary">
                        OTP: 123456 · PIN: 12123
                      </code>
                      <span className="text-[11px] text-muted">Test numbers: 01770618575 / 01877722344</span>
                    </div>

                    <div className="rounded-xl border border-amber-200 bg-surface p-3 flex flex-col gap-1 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">Internal Mock Simulator</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-secondary">
                        gateway: &quot;mock&quot;
                      </code>
                      <span className="text-[11px] text-muted">Zero-dependency automated test checkout</span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant/30 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted mr-1">Filter Gateways:</span>
              {(
                [
                  { id: 'all', label: 'All Providers (11)' },
                  { id: 'global', label: 'Cards & Global (Stripe, PayPal, Mollie)' },
                  { id: 'south-asia', label: 'South Asia & Bangladesh (bKash, Nagad, SSLCommerz, Razorpay)' },
                  { id: 'africa', label: 'Africa (Paystack)' },
                  { id: 'offline', label: 'Direct & Offline (Cash, Bank Wire)' },
                  { id: 'sandbox', label: 'Internal Sandbox Simulator' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCategoryFilter(tab.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    categoryFilter === tab.id
                      ? 'bg-secondary text-white shadow-sm'
                      : 'border border-outline-variant/40 bg-surface text-muted hover:bg-sage-soft hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* 1. Stripe */}
              {(categoryFilter === 'all' || categoryFilter === 'global') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                          <Icon name="credit_card" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Stripe Payments</h4>
                          <p className="text-body-xs text-muted">Global cards, Apple Pay, Google Pay, SEPA</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'stripe' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.stripe?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('stripe', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="stripe-pub">Publishable Key</Label>
                        <Input
                          id="stripe-pub"
                          value={currentSettings.gateways.stripe?.publishable_key ?? ''}
                          onChange={(e) => updateGatewayField('stripe', 'publishable_key', e.target.value)}
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
                            onChange={(e) => updateGatewayField('stripe', 'secret_key', e.target.value)}
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
                        <Input
                          id="stripe-wh"
                          value={currentSettings.gateways.stripe?.webhook_secret ?? ''}
                          onChange={(e) => updateGatewayField('stripe', 'webhook_secret', e.target.value)}
                          placeholder="whsec_..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Mode: {currentSettings.gateways.stripe?.sandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'stripe'}
                      onClick={() => runTest('stripe')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'stripe' ? 'Testing…' : 'Ping Stripe API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 2. PayPal */}
              {(categoryFilter === 'all' || categoryFilter === 'global') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                          <Icon name="payments" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">PayPal Commerce Platform</h4>
                          <p className="text-body-xs text-muted">PayPal checkout, Pay Later &amp; Venmo</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'paypal' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.paypal?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('paypal', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="paypal-cid">Client ID</Label>
                        <Input
                          id="paypal-cid"
                          value={currentSettings.gateways.paypal?.client_id ?? ''}
                          onChange={(e) => updateGatewayField('paypal', 'client_id', e.target.value)}
                          placeholder="sb-client-id..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="paypal-sec">Client Secret</Label>
                        <div className="relative">
                          <Input
                            id="paypal-sec"
                            type={showSecrets['paypal_sec'] ? 'text' : 'password'}
                            value={currentSettings.gateways.paypal?.client_secret ?? ''}
                            onChange={(e) => updateGatewayField('paypal', 'client_secret', e.target.value)}
                            placeholder="secret..."
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret('paypal_sec')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                          >
                            <Icon name={showSecrets['paypal_sec'] ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="paypal-wh">Webhook ID</Label>
                        <Input
                          id="paypal-wh"
                          value={currentSettings.gateways.paypal?.webhook_id ?? ''}
                          onChange={(e) => updateGatewayField('paypal', 'webhook_id', e.target.value)}
                          placeholder="WH-..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Mode: {currentSettings.gateways.paypal?.sandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'paypal'}
                      onClick={() => runTest('paypal')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'paypal' ? 'Testing…' : 'Ping PayPal API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 3. bKash (Bangladesh) */}
              {(categoryFilter === 'all' || categoryFilter === 'south-asia') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300">
                          <Icon name="phone_android" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">bKash Payment Gateway (PGW)</h4>
                          <p className="text-body-xs text-muted">Bangladesh #1 Mobile Financial Service (MFS)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'bkash' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.bkash?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('bkash', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="bkash-appkey">App Key</Label>
                        <Input
                          id="bkash-appkey"
                          value={currentSettings.gateways.bkash?.app_key ?? ''}
                          onChange={(e) => updateGatewayField('bkash', 'app_key', e.target.value)}
                          placeholder="App Key"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bkash-appsec">App Secret</Label>
                        <div className="relative">
                          <Input
                            id="bkash-appsec"
                            type={showSecrets['bkash_sec'] ? 'text' : 'password'}
                            value={currentSettings.gateways.bkash?.app_secret ?? ''}
                            onChange={(e) => updateGatewayField('bkash', 'app_secret', e.target.value)}
                            placeholder="App Secret"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret('bkash_sec')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                          >
                            <Icon name={showSecrets['bkash_sec'] ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="bkash-user">API Username</Label>
                        <Input
                          id="bkash-user"
                          value={currentSettings.gateways.bkash?.username ?? ''}
                          onChange={(e) => updateGatewayField('bkash', 'username', e.target.value)}
                          placeholder="sandbox_user"
                        />
                      </div>

                      <div>
                        <Label htmlFor="bkash-pwd">API Password</Label>
                        <Input
                          id="bkash-pwd"
                          type={showSecrets['bkash_pwd'] ? 'text' : 'password'}
                          value={currentSettings.gateways.bkash?.password ?? ''}
                          onChange={(e) => updateGatewayField('bkash', 'password', e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Sandbox URL: tokenized.sandbox.bka.sh
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'bkash'}
                      onClick={() => runTest('bkash')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'bkash' ? 'Testing…' : 'Ping bKash Gateway'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 4. Nagad (Bangladesh) */}
              {(categoryFilter === 'all' || categoryFilter === 'south-asia') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300">
                          <Icon name="account_balance_wallet" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Nagad Digital MFS</h4>
                          <p className="text-body-xs text-muted">Bangladesh Post Office Digital Financial Service</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'nagad' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.nagad?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('nagad', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="nagad-mid">Merchant ID</Label>
                        <Input
                          id="nagad-mid"
                          value={currentSettings.gateways.nagad?.merchant_id ?? ''}
                          onChange={(e) => updateGatewayField('nagad', 'merchant_id', e.target.value)}
                          placeholder="NAGAD_MERCHANT_ID"
                        />
                      </div>

                      <div>
                        <Label htmlFor="nagad-pub">PG Public Key</Label>
                        <Input
                          id="nagad-pub"
                          value={currentSettings.gateways.nagad?.public_key ?? ''}
                          onChange={(e) => updateGatewayField('nagad', 'public_key', e.target.value)}
                          placeholder="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="nagad-priv">Merchant Private Key</Label>
                        <Input
                          id="nagad-priv"
                          type="password"
                          value={currentSettings.gateways.nagad?.private_key ?? ''}
                          onChange={(e) => updateGatewayField('nagad', 'private_key', e.target.value)}
                          placeholder="MIIEvgIBADANBgkqhkiG9w0BAQEFAASC..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Mode: {currentSettings.gateways.nagad?.sandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'nagad'}
                      onClick={() => runTest('nagad')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'nagad' ? 'Testing…' : 'Ping Nagad API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 5. SSLCommerz (Bangladesh) */}
              {(categoryFilter === 'all' || categoryFilter === 'south-asia') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <Icon name="storefront" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">SSLCommerz Hosted Gateway</h4>
                          <p className="text-body-xs text-muted">Multi-channel payments (Visa, MC, bKash, Nagad, Internet Banking)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'sslcommerz' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.sslcommerz?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('sslcommerz', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="sslcommerz-store">Store ID</Label>
                        <Input
                          id="sslcommerz-store"
                          value={currentSettings.gateways.sslcommerz?.store_id ?? ''}
                          onChange={(e) => updateGatewayField('sslcommerz', 'store_id', e.target.value)}
                          placeholder="fairshare_sandbox"
                        />
                      </div>

                      <div>
                        <Label htmlFor="sslcommerz-pwd">Store Password</Label>
                        <div className="relative">
                          <Input
                            id="sslcommerz-pwd"
                            type={showSecrets['sslcommerz_pwd'] ? 'text' : 'password'}
                            value={currentSettings.gateways.sslcommerz?.store_passwd ?? ''}
                            onChange={(e) => updateGatewayField('sslcommerz', 'store_passwd', e.target.value)}
                            placeholder="Store Password"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSecret('sslcommerz_pwd')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                          >
                            <Icon name={showSecrets['sslcommerz_pwd'] ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Session API: sandbox.sslcommerz.com
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'sslcommerz'}
                      onClick={() => runTest('sslcommerz')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'sslcommerz' ? 'Testing…' : 'Ping SSLCommerz API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 6. Razorpay (India / UPI) */}
              {(categoryFilter === 'all' || categoryFilter === 'south-asia') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          <Icon name="account_balance" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Razorpay (India &amp; UPI)</h4>
                          <p className="text-body-xs text-muted">Unified Payments Interface (UPI), RuPay, NetBanking</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'razorpay' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.razorpay?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('razorpay', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="razorpay-key">Key ID</Label>
                        <Input
                          id="razorpay-key"
                          value={currentSettings.gateways.razorpay?.key_id ?? ''}
                          onChange={(e) => updateGatewayField('razorpay', 'key_id', e.target.value)}
                          placeholder="rzp_test_..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="razorpay-sec">Key Secret</Label>
                        <Input
                          id="razorpay-sec"
                          type="password"
                          value={currentSettings.gateways.razorpay?.key_secret ?? ''}
                          onChange={(e) => updateGatewayField('razorpay', 'key_secret', e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">
                      Mode: {currentSettings.gateways.razorpay?.sandbox ? 'Sandbox (Test)' : 'Production (Live)'}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'razorpay'}
                      onClick={() => runTest('razorpay')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'razorpay' ? 'Testing…' : 'Ping Razorpay API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 7. Paystack (Africa) */}
              {(categoryFilter === 'all' || categoryFilter === 'africa') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                          <Icon name="public" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Paystack Africa</h4>
                          <p className="text-body-xs text-muted">Nigeria, Ghana, Kenya, South Africa (Cards &amp; Mobile Money)</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'paystack' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.paystack?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('paystack', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="paystack-pub">Public Key</Label>
                        <Input
                          id="paystack-pub"
                          value={currentSettings.gateways.paystack?.public_key ?? ''}
                          onChange={(e) => updateGatewayField('paystack', 'public_key', e.target.value)}
                          placeholder="pk_test_..."
                        />
                      </div>

                      <div>
                        <Label htmlFor="paystack-sec">Secret Key</Label>
                        <Input
                          id="paystack-sec"
                          type="password"
                          value={currentSettings.gateways.paystack?.secret_key ?? ''}
                          onChange={(e) => updateGatewayField('paystack', 'secret_key', e.target.value)}
                          placeholder="sk_test_..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">API: api.paystack.co</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'paystack'}
                      onClick={() => runTest('paystack')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'paystack' ? 'Testing…' : 'Ping Paystack API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 8. Mollie (Europe / SEPA) */}
              {(categoryFilter === 'all' || categoryFilter === 'global') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                          <Icon name="euro" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Mollie Payments (Europe)</h4>
                          <p className="text-body-xs text-muted">iDEAL, Bancontact, SEPA Direct Debit, Sofort</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'mollie' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.mollie?.sandbox ?? true}
                            onChange={(e) => updateGatewayField('mollie', 'sandbox', e.target.checked)}
                            className="h-3.5 w-3.5 accent-amber-500"
                          />
                          <span>Sandbox</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <Label htmlFor="mollie-key">API Key</Label>
                        <Input
                          id="mollie-key"
                          value={currentSettings.gateways.mollie?.api_key ?? ''}
                          onChange={(e) => updateGatewayField('mollie', 'api_key', e.target.value)}
                          placeholder="test_..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">API: api.mollie.com/v2</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'mollie'}
                      onClick={() => runTest('mollie')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'mollie' ? 'Testing…' : 'Ping Mollie API'}
                    </Button>
                  </div>
                </Card>
              )}

              {/* 9. Direct Bank Transfer / Wire */}
              {(categoryFilter === 'all' || categoryFilter === 'offline') && (
                <Card className="flex flex-col justify-between gap-4 p-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          <Icon name="account_balance" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Direct Bank Transfer / Wire</h4>
                          <p className="text-body-xs text-muted">Direct B2B wire, ACH, and manual invoice matching</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {currentSettings.active_gateway === 'bank_transfer' && <Badge tone="success">Primary Active</Badge>}
                        <label className="flex items-center gap-1.5 text-xs font-semibold cursor-pointer text-muted">
                          <input
                            type="checkbox"
                            checked={currentSettings.gateways.bank_transfer?.enabled ?? false}
                            onChange={(e) => updateGatewayField('bank_transfer', 'enabled', e.target.checked)}
                            className="h-3.5 w-3.5 accent-secondary"
                          />
                          <span>Enabled</span>
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="bank-name">Bank Institution Name</Label>
                        <Input
                          id="bank-name"
                          value={currentSettings.gateways.bank_transfer?.bank_name ?? ''}
                          onChange={(e) => updateGatewayField('bank_transfer', 'bank_name', e.target.value)}
                          placeholder="JPMorgan Chase / City Bank"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank-acc">Account Number / IBAN</Label>
                        <Input
                          id="bank-acc"
                          value={currentSettings.gateways.bank_transfer?.account_number ?? ''}
                          onChange={(e) => updateGatewayField('bank_transfer', 'account_number', e.target.value)}
                          placeholder="••••••••1234"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank-rout">Routing / Sort Code</Label>
                        <Input
                          id="bank-rout"
                          value={currentSettings.gateways.bank_transfer?.routing_code ?? ''}
                          onChange={(e) => updateGatewayField('bank_transfer', 'routing_code', e.target.value)}
                          placeholder="021000021"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bank-swift">SWIFT / BIC</Label>
                        <Input
                          id="bank-swift"
                          value={currentSettings.gateways.bank_transfer?.swift_bic ?? ''}
                          onChange={(e) => updateGatewayField('bank_transfer', 'swift_bic', e.target.value)}
                          placeholder="CHASUS33"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">B2B offline reconciliation</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'bank_transfer'}
                      onClick={() => runTest('bank_transfer')}
                    >
                      <Icon name="check" className="text-[16px]" />
                      Verify Bank Details
                    </Button>
                  </div>
                </Card>
              )}

              {/* 10. Cash Payment & Offline Handover */}
              {(categoryFilter === 'all' || categoryFilter === 'offline') && (
                <Card className="flex flex-col justify-between gap-4 p-5 lg:col-span-2 border-emerald-300 dark:border-emerald-900/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                          <Icon name="payments" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Cash Payment &amp; Offline Settlement</h4>
                          <p className="text-body-xs text-muted">
                            Allow households to pay cash in person with printed physical invoice receipts
                          </p>
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

                    <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low p-3.5">
                      <input
                        type="checkbox"
                        id="cash-enabled"
                        checked={currentSettings.gateways.cash?.enabled ?? false}
                        onChange={(e) => updateGatewayField('cash', 'enabled', e.target.checked)}
                        className="h-4 w-4 cursor-pointer accent-secondary"
                      />
                      <div>
                        <Label htmlFor="cash-enabled" className="cursor-pointer font-bold text-on-surface">
                          Enable Cash Payment for Household Plan Upgrades
                        </Label>
                        <p className="text-body-xs text-muted">
                          When checked, tenants can select &ldquo;Cash Payment&rdquo; at checkout. Admin collects the cash and hands over printed invoice.
                        </p>
                      </div>
                    </div>

                    {(currentSettings.gateways.cash?.enabled ?? false) && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col gap-1.5 md:col-span-2">
                          <Label htmlFor="cash-instructions">Tenant Collection Instructions &amp; Notes</Label>
                          <textarea
                            id="cash-instructions"
                            rows={2}
                            value={currentSettings.gateways.cash?.instructions ?? ''}
                            onChange={(e) => updateGatewayField('cash', 'instructions', e.target.value)}
                            className="w-full rounded-xl border border-outline-variant/50 bg-surface p-3 text-body-sm text-on-surface focus:border-secondary focus:outline-none"
                            placeholder="e.g. Please hand physical cash to your community manager at the central reception desk."
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            id="cash-auto-paid"
                            checked={currentSettings.gateways.cash?.auto_mark_paid ?? false}
                            onChange={(e) => updateGatewayField('cash', 'auto_mark_paid', e.target.checked)}
                            className="h-4 w-4 cursor-pointer accent-secondary"
                          />
                          <Label htmlFor="cash-auto-paid" className="cursor-pointer text-body-sm text-on-surface">
                            Auto-mark cash invoices as Paid immediately (uncheck to require admin approval)
                          </Label>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-outline-variant/20 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'cash'}
                      onClick={() => runTest('cash')}
                    >
                      <Icon name="bolt" className="text-[16px]" />
                      {testingGateway === 'cash' ? 'Testing…' : 'Test Cash Payment Configuration'}
                    </Button>

                    <Link to="/admin/billing">
                      <Button size="sm" variant="outline">
                        <Icon name="receipt_long" className="text-[16px]" />
                        Open Cash Settlement Queue &rarr;
                      </Button>
                    </Link>
                  </div>
                </Card>
              )}

              {/* 11. Mock / Internal Sandbox Simulator */}
              {(categoryFilter === 'all' || categoryFilter === 'sandbox') && (
                <Card className="flex flex-col justify-between gap-4 p-5 lg:col-span-2 border-dashed border-2 border-amber-300 bg-amber-50/20 dark:border-amber-900/50">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Icon name="smart_toy" className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-label-lg font-bold text-on-surface">Internal Sandbox Payment Simulator</h4>
                          <p className="text-body-xs text-muted">Zero-dependency automated mock payment engine for QA, staging &amp; developer testing</p>
                        </div>
                      </div>
                      <Badge tone={currentSettings.active_gateway === 'mock' ? 'success' : 'neutral'}>
                        {currentSettings.active_gateway === 'mock' ? 'Active Default Gateway' : 'Available Sandbox'}
                      </Badge>
                    </div>

                    <p className="text-xs text-on-surface leading-relaxed">
                      The sandbox simulator enables immediate plan upgrades without external merchant credentials. It generates authentic invoices with simulated latency and supports forced decline testing.
                    </p>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-on-surface">
                        <input
                          type="checkbox"
                          checked={currentSettings.gateways.mock?.simulate_failure ?? false}
                          onChange={(e) => updateGatewayField('mock', 'simulate_failure', e.target.checked)}
                          className="h-4 w-4 accent-error"
                        />
                        <span>Simulate payment gateway decline / card errors</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3">
                    <span className="text-[11px] text-muted">Latency: ~120ms simulated response</span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={testingGateway === 'mock'}
                      onClick={() => runTest('mock')}
                    >
                      <Icon name="play_arrow" className="text-[16px]" />
                      {testingGateway === 'mock' ? 'Running…' : 'Run Sandbox Simulation'}
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Test Connection Result Alert */}
            {testResult && (
              <Alert tone={testResult.status === 'connected' ? 'success' : 'error'}>
                <div className="flex items-center gap-2">
                  <Icon name={testResult.status === 'connected' ? 'verified' : 'error'} className="text-[18px]" />
                  <span className="font-semibold">{testResult.message}</span>
                </div>
              </Alert>
            )}

            {/* Save Configuration Floating Bar */}
            <div className="flex items-center justify-end gap-3 border-t border-outline-variant/30 pt-4">
              <Button
                size="lg"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate(currentSettings)}
              >
                <Icon name="save" className="text-[18px]" />
                {updateMutation.isPending ? 'Saving Settings…' : 'Save Payment Gateway Configuration'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
