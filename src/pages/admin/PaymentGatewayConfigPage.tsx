import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { GatewayPingDrawer, type GatewayPingFeedback } from '@/components/GatewayPingDrawer';
import { Icon } from '@/components/Icon';
import { SandboxPaymentDrawer } from '@/components/SandboxPaymentDrawer';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonForm } from '@/components/ui/skeleton';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { Select } from '@/components/ui/select';
import { api, apiError } from '@/lib/api';
import type {
  GatewayTestResult,
  PaymentGatewayCredentials,
  PaymentGatewaySettings,
} from '@/types';

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

/** Area key for the payment settings query; mutations invalidate the area. */
const PAYMENT_SETTINGS_KEY = ['platform', 'settings', 'payment'] as const;

/**
 * Gateways with a `sandbox-payment` endpoint on the platform API. Nagad has a
 * credential editor but no sandbox checkout driver yet, so it gets no button.
 */
const sandboxPaymentGateways = new Set([
  'stripe',
  'paypal',
  'razorpay',
  'sslcommerz',
  'bkash',
  'paystack',
  'mollie',
  'paddle',
  'mock',
]);

const supportsSandboxPayment = (gateway: string): boolean => sandboxPaymentGateways.has(gateway);

type EditorMode = 'sandbox' | 'live';
type CategoryFilter = 'all' | 'global' | 'south-asia' | 'africa' | 'offline' | 'sandbox';
type CardSaveState = { state: 'saving' | 'saved' | 'error'; message?: string };
type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface FieldSpec {
  /** Key inside `credentials[mode]` for digital gateways, or a flat legacy field. */
  name: string;
  label: string;
  placeholder?: string;
  /** Masked by the API; rendered behind a reveal toggle. */
  secret?: boolean;
  multiline?: boolean;
}

interface GatewayMeta {
  key: string;
  /** Used for the per-card "Save <Gateway>" / "Ping <Gateway>" controls. */
  saveName: string;
  title: string;
  description: string;
  icon: string;
  iconClassName: string;
  category: Exclude<CategoryFilter, 'all'>;
  /** `digital` gateways keep separate sandbox/live credential sets. */
  kind: 'digital' | 'flat';
  fields: FieldSpec[];
  columns?: 1 | 2;
  pingLabel: string;
}

/**
 * Credential field names per gateway, mirroring `GatewayCredentials::fields()`
 * in the API. Digital gateways bind these to `credentials[mode]`.
 */
const gatewayMeta: GatewayMeta[] = [
  {
    key: 'stripe',
    saveName: 'Stripe',
    title: 'Stripe Payments',
    description: 'Global cards, Apple Pay, Google Pay, SEPA',
    icon: 'credit_card',
    iconClassName: 'bg-forest-soft text-secondary',
    category: 'global',
    kind: 'digital',
    pingLabel: 'Ping Stripe API',
    fields: [
      { name: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_test_…' },
      { name: 'secret_key', label: 'Secret Key', placeholder: 'sk_test_…', secret: true },
      { name: 'webhook_secret', label: 'Webhook Signing Secret', placeholder: 'whsec_…', secret: true },
    ],
  },
  {
    key: 'paypal',
    saveName: 'PayPal',
    title: 'PayPal Commerce Platform',
    description: 'PayPal checkout, Pay Later & Venmo',
    icon: 'payments',
    iconClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    category: 'global',
    kind: 'digital',
    pingLabel: 'Ping PayPal API',
    fields: [
      { name: 'client_id', label: 'Client ID', placeholder: 'sb-client-id…' },
      { name: 'client_secret', label: 'Client Secret', placeholder: 'secret…', secret: true },
      { name: 'webhook_id', label: 'Webhook ID', placeholder: 'WH-…' },
    ],
  },
  {
    key: 'bkash',
    saveName: 'bKash',
    title: 'bKash Payment Gateway (PGW)',
    description: 'Bangladesh #1 Mobile Financial Service (MFS)',
    icon: 'phone_android',
    iconClassName: 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300',
    category: 'south-asia',
    kind: 'digital',
    columns: 2,
    pingLabel: 'Ping bKash Gateway',
    fields: [
      { name: 'app_key', label: 'App Key', placeholder: 'App Key' },
      { name: 'app_secret', label: 'App Secret', placeholder: 'App Secret', secret: true },
      { name: 'username', label: 'API Username', placeholder: 'sandbox_user' },
      { name: 'password', label: 'API Password', placeholder: '••••••••', secret: true },
    ],
  },
  {
    key: 'nagad',
    saveName: 'Nagad',
    title: 'Nagad Digital MFS',
    description: 'Bangladesh Post Office Digital Financial Service',
    icon: 'account_balance_wallet',
    iconClassName: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
    category: 'south-asia',
    kind: 'digital',
    pingLabel: 'Ping Nagad API',
    fields: [
      { name: 'merchant_id', label: 'Merchant ID', placeholder: 'NAGAD_MERCHANT_ID' },
      { name: 'public_key', label: 'PG Public Key', placeholder: 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A…' },
      {
        name: 'private_key',
        label: 'Merchant Private Key',
        placeholder: 'MIIEvgIBADANBgkqhkiG9w0BAQEFAASC…',
        secret: true,
      },
    ],
  },
  {
    key: 'sslcommerz',
    saveName: 'SSLCommerz',
    title: 'SSLCommerz Hosted Gateway',
    description: 'Multi-channel payments (Visa, MC, bKash, Nagad, Internet Banking)',
    icon: 'storefront',
    iconClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    category: 'south-asia',
    kind: 'digital',
    pingLabel: 'Ping SSLCommerz API',
    fields: [
      { name: 'store_id', label: 'Store ID', placeholder: 'fairshare_sandbox' },
      { name: 'store_passwd', label: 'Store Password', placeholder: 'Store Password', secret: true },
    ],
  },
  {
    key: 'razorpay',
    saveName: 'Razorpay',
    title: 'Razorpay (India & UPI)',
    description: 'Unified Payments Interface (UPI), RuPay, NetBanking',
    icon: 'account_balance',
    iconClassName: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    category: 'south-asia',
    kind: 'digital',
    pingLabel: 'Ping Razorpay API',
    fields: [
      { name: 'key_id', label: 'Key ID', placeholder: 'rzp_test_…' },
      { name: 'key_secret', label: 'Key Secret', placeholder: '••••••••', secret: true },
      { name: 'webhook_secret', label: 'Webhook Secret', placeholder: '••••••••', secret: true },
    ],
  },
  {
    key: 'paystack',
    saveName: 'Paystack',
    title: 'Paystack Africa',
    description: 'Nigeria, Ghana, Kenya, South Africa (Cards & Mobile Money)',
    icon: 'public',
    iconClassName: 'bg-teal-100 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
    category: 'africa',
    kind: 'digital',
    pingLabel: 'Ping Paystack API',
    fields: [
      { name: 'public_key', label: 'Public Key', placeholder: 'pk_test_…' },
      { name: 'secret_key', label: 'Secret Key', placeholder: 'sk_test_…', secret: true },
    ],
  },
  {
    key: 'mollie',
    saveName: 'Mollie',
    title: 'Mollie Payments (Europe)',
    description: 'iDEAL, Bancontact, SEPA Direct Debit, Sofort',
    icon: 'euro',
    iconClassName: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    category: 'global',
    kind: 'digital',
    pingLabel: 'Ping Mollie API',
    fields: [
      { name: 'api_key', label: 'API Key', placeholder: 'test_…', secret: true },
      { name: 'webhook_url', label: 'Webhook URL', placeholder: 'https://…/api/v1/webhooks/mollie' },
    ],
  },
  {
    key: 'paddle',
    saveName: 'Paddle',
    title: 'Paddle (Merchant of Record)',
    description: 'Global cards, PayPal, Apple Pay & Google Pay via Paddle',
    icon: 'shopping_cart',
    iconClassName: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300',
    category: 'global',
    kind: 'digital',
    pingLabel: 'Ping Paddle API',
    fields: [
      { name: 'api_key', label: 'API Key', placeholder: 'pdl_sdbx_apikey_…', secret: true },
      { name: 'webhook_secret', label: 'Webhook Signing Secret', placeholder: 'pdl_ntfset_…', secret: true },
      {
        name: 'price_id',
        label: 'Product ID',
        placeholder: 'pro_…',
        secret: true,
      },
      {
        name: 'test_price_id',
        label: 'Price ID',
        placeholder: 'pri_…',
        secret: true,
      },
      {
        name: 'client_token',
        label: 'Client-side Token',
        placeholder: 'test_…',
        secret: true,
      },
      {
        // Plain text: the sandbox drawer hands this URL to Paddle as the
        // post-checkout destination, so the operator must read it back.
        name: 'default_payment_link',
        label: 'Default Payment Link',
        placeholder: 'https://example.com/checkout',
        secret: false,
      },
    ],
  },
  {
    key: 'bank_transfer',
    saveName: 'Bank Transfer',
    title: 'Direct Bank Transfer / Wire',
    description: 'Direct B2B wire, ACH, and manual invoice matching',
    icon: 'account_balance',
    iconClassName: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    category: 'offline',
    kind: 'flat',
    columns: 2,
    pingLabel: 'Verify Bank Details',
    fields: [
      { name: 'bank_name', label: 'Bank Institution Name', placeholder: 'JPMorgan Chase / City Bank' },
      { name: 'account_name', label: 'Account Holder Name', placeholder: 'FairShare Operations Inc.' },
      { name: 'account_number', label: 'Account Number / IBAN', placeholder: '••••••••1234' },
      { name: 'routing_code', label: 'Routing / Sort Code', placeholder: '021000021' },
      { name: 'swift_bic', label: 'SWIFT / BIC', placeholder: 'CHASUS33' },
      {
        name: 'instructions',
        label: 'Tenant Transfer Instructions',
        multiline: true,
        placeholder: 'Please reference your Invoice Number in the wire transfer description.',
      },
    ],
  },
];

/**
 * Legacy flat credential fields, per gateway. The API still returns these next
 * to the new `credentials` object, so a row stored before the split must keep
 * rendering in the editor for the matching environment.
 */
const legacyCredentialFields: Record<string, string[]> = {
  stripe: ['publishable_key', 'secret_key', 'webhook_secret'],
  paypal: ['client_id', 'client_secret', 'webhook_id'],
  razorpay: ['key_id', 'key_secret', 'webhook_secret'],
  sslcommerz: ['store_id', 'store_passwd'],
  bkash: ['app_key', 'app_secret', 'username', 'password'],
  nagad: ['merchant_id', 'public_key', 'private_key'],
  paystack: ['public_key', 'secret_key'],
  mollie: ['api_key', 'webhook_url'],
  paddle: ['api_key', 'webhook_secret', 'price_id', 'test_price_id', 'client_token', 'default_payment_link'],
};

/**
 * Flat (non-credential) fields for the cards rendered by hand: cash and the
 * mock simulator have no sandbox/live credential sets.
 */
const offlineFlatFields: Record<string, string[]> = {
  cash: ['instructions', 'auto_mark_paid'],
  mock: ['simulate_failure', 'latency_ms'],
};

/** Reads a flat legacy field without widening the credential type. */
function flatFieldValue(config: PaymentGatewayCredentials, name: string): string | number | boolean | undefined {
  const record: Record<string, unknown> = { ...config };
  const value = record[name];
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? value : undefined;
}

/** The environment a gateway's legacy flat fields belong to. */
function clientModeOf(config: PaymentGatewayCredentials | undefined): EditorMode {
  return config?.sandbox === false ? 'live' : 'sandbox';
}

/**
 * Derives `credentials.sandbox` / `credentials.live` for gateways that still
 * carry flat fields. Legacy values land in the set matching the gateway's
 * client mode (sandbox unless `sandbox === false`). Never mutates the cache.
 */
function normaliseGateway(key: string, config: PaymentGatewayCredentials): PaymentGatewayCredentials {
  const fields = legacyCredentialFields[key];
  if (!fields) return config;

  const sandbox = { ...(config.credentials?.sandbox ?? {}) };
  const live = { ...(config.credentials?.live ?? {}) };
  const target = clientModeOf(config) === 'live' ? live : sandbox;

  for (const field of fields) {
    const value = flatFieldValue(config, field);
    if (typeof value !== 'string' || value === '') continue;
    if (!target[field]) target[field] = value;
  }

  return { ...config, credentials: { sandbox, live } };
}

function normalisePaymentSettings(settings: PaymentGatewaySettings): PaymentGatewaySettings {
  const gateways: Record<string, PaymentGatewayCredentials> = {};
  for (const [key, config] of Object.entries(settings.gateways)) {
    gateways[key] = normaliseGateway(key, config);
  }
  return { ...settings, gateways };
}

function describeTestStatus(status: string): { tone: BadgeTone; label: string } {
  switch (status) {
    case 'connected':
      return { tone: 'success', label: 'Connected' };
    case 'error':
      return { tone: 'danger', label: 'Failed' };
    case 'unconfigured':
      return { tone: 'warning', label: 'Not configured' };
    default:
      return { tone: 'neutral', label: status || 'Unknown' };
  }
}

function formatTimestamp(value?: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

const modeLabels: Record<EditorMode, string> = { sandbox: 'Sandbox', live: 'Live' };

export function PaymentGatewayConfigPage() {
  const queryClient = useQueryClient();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [showSandboxCheatsheet, setShowSandboxCheatsheet] = useState(true);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [editorModes, setEditorModes] = useState<Record<string, EditorMode>>({});
  const [cardSave, setCardSave] = useState<Record<string, CardSaveState>>({});
  /** Cards with unsaved edits; Ping/Sandbox payment persist those first. */
  const [dirtyGateways, setDirtyGateways] = useState<Record<string, boolean>>({});
  const [testFeedback, setTestFeedback] = useState<GatewayPingFeedback | null>(null);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);
  /** The gateway whose ping drawer is open, if any. */
  const [pingDrawer, setPingDrawer] = useState<{ gateway: string; gatewayName: string; mode?: EditorMode } | null>(
    null,
  );
  const [sandboxPaymentFor, setSandboxPaymentFor] = useState<{ key: string; name: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const paymentQuery = useQuery({
    queryKey: PAYMENT_SETTINGS_KEY,
    queryFn: async () =>
      (await api.get<{ data: PaymentGatewaySettings }>('/v1/platform/settings/payment')).data.data,
  });

  const [form, setForm] = useState<PaymentGatewaySettings | null>(null);

  // Derived, never written back into the query cache: legacy flat credential
  // fields are folded into the matching `credentials` set for rendering.
  const currentSettings = useMemo(
    () => form ?? (paymentQuery.data ? normalisePaymentSettings(paymentQuery.data) : null),
    [form, paymentQuery.data],
  );

  const handleUpdate = (updater: (prev: PaymentGatewaySettings) => PaymentGatewaySettings) => {
    if (!currentSettings) return;
    setForm(updater(currentSettings));
  };

  const gatewayConfig = (gateway: string): PaymentGatewayCredentials =>
    currentSettings?.gateways[gateway] ?? { enabled: false };

  const markDirty = (gateway: string) =>
    setDirtyGateways((prev) => ({ ...prev, [gateway]: true }));

  const updateGatewayField = <K extends keyof PaymentGatewayCredentials>(
    gateway: string,
    field: K,
    value: PaymentGatewayCredentials[K],
  ) => {
    markDirty(gateway);
    handleUpdate((prev) => ({
      ...prev,
      gateways: {
        ...prev.gateways,
        [gateway]: { ...(prev.gateways[gateway] ?? { enabled: false }), [field]: value },
      },
    }));
  };

  const updateCredential = (gateway: string, mode: EditorMode, field: string, value: string) => {
    markDirty(gateway);
    handleUpdate((prev) => {
      const existing = prev.gateways[gateway] ?? { enabled: false };
      return {
        ...prev,
        gateways: {
          ...prev.gateways,
          [gateway]: {
            ...existing,
            credentials: {
              ...existing.credentials,
              [mode]: { ...(existing.credentials?.[mode] ?? {}), [field]: value },
            },
          },
        },
      };
    });
  };

  const editorModeFor = (gateway: string): EditorMode =>
    editorModes[gateway] ?? clientModeOf(currentSettings?.gateways[gateway]);

  const isDigitalGateway = (gateway: string) => gatewayMeta.some((meta) => meta.key === gateway);

  /** Environment probed by Ping: the editor tab for digital gateways, none for cash. */
  const pingMode = (gateway: string): EditorMode | undefined => {
    if (gateway === 'cash') return undefined;
    if (isDigitalGateway(gateway)) return editorModeFor(gateway);
    return clientModeOf(currentSettings?.gateways[gateway]);
  };

  const applyLastTest = (gateway: string, mode: EditorMode, result: GatewayTestResult) => {
    setForm((prev) => {
      const base = prev ?? currentSettings;
      if (!base) return prev;
      const existing = base.gateways[gateway] ?? { enabled: false };
      return {
        ...base,
        gateways: {
          ...base.gateways,
          [gateway]: {
            ...existing,
            last_test: { ...existing.last_test, [mode]: result },
          },
        },
      };
    });
  };

  const saveGatewayMutation = useMutation({
    mutationFn: async ({ gateway, payload }: { gateway: string; payload: Record<string, unknown> }) =>
      (await api.post<{ data?: PaymentGatewayCredentials }>(`/v1/platform/settings/payment/${gateway}`, payload))
        .data,
    onSuccess: (response, { gateway }) => {
      const saved = response?.data;
      // The endpoint answers with the updated (masked) gateway, so the card can
      // settle on what the server actually stored.
      if (saved && typeof saved === 'object' && typeof saved.enabled === 'boolean') {
        handleUpdate((prev) => ({
          ...prev,
          gateways: {
            ...prev.gateways,
            [gateway]: { ...(prev.gateways[gateway] ?? { enabled: false }), ...saved },
          },
        }));
      }
      setCardSave((prev) => ({ ...prev, [gateway]: { state: 'saved' } }));
      setDirtyGateways((prev) => ({ ...prev, [gateway]: false }));
      setError(null);
      queryClient.invalidateQueries({ queryKey: PAYMENT_SETTINGS_KEY });
    },
    onError: (err, { gateway }) => {
      setCardSave((prev) => ({ ...prev, [gateway]: { state: 'error', message: apiError(err) } }));
    },
  });

  const globalMutation = useMutation({
    mutationFn: async (payload: {
      active_gateway: PaymentGatewaySettings['active_gateway'];
      mode: EditorMode;
      currency: string;
      auto_billing_enabled: boolean;
    }) => (await api.post('/v1/platform/settings/payment', payload)).data,
    onSuccess: () => {
      setNotice('Global payment settings saved.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: PAYMENT_SETTINGS_KEY });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  /** Payload for one card: digital gateways send both credential sets. */
  const buildGatewayPayload = (gateway: string): Record<string, unknown> => {
    const config = gatewayConfig(gateway);
    const meta = gatewayMeta.find((entry) => entry.key === gateway);
    const payload: Record<string, unknown> = { enabled: config.enabled ?? false };

    const flatFields =
      meta?.kind === 'flat' ? meta.fields.map((field) => field.name) : offlineFlatFields[gateway];

    if (flatFields) {
      // Offline cards keep their flat legacy fields; they own no credential sets.
      if (typeof config.sandbox === 'boolean') payload.sandbox = config.sandbox;
      for (const name of flatFields) {
        const value = flatFieldValue(config, name);
        if (value !== undefined) payload[name] = value;
      }
      return payload;
    }

    payload.sandbox = clientModeOf(config) === 'sandbox';
    payload.credentials = {
      sandbox: config.credentials?.sandbox ?? {},
      live: config.credentials?.live ?? {},
    };
    return payload;
  };

  /** Persist a card, resolving with the saved gateway so callers can wait for it. */
  const persistGateway = async (gateway: string) => {
    if (!currentSettings) {
      throw new Error('Payment settings are not loaded yet.');
    }

    setCardSave((prev) => ({ ...prev, [gateway]: { state: 'saving' } }));

    return saveGatewayMutation.mutateAsync({ gateway, payload: buildGatewayPayload(gateway) });
  };

  const saveGateway = (gateway: string) => {
    void persistGateway(gateway).catch(() => undefined);
  };

  const runTest = async (gateway: string, mode?: EditorMode) => {
    setTestingGateway(gateway);
    setTestFeedback(null);

    const payload: { gateway: string; mode?: EditorMode } = { gateway };
    if (mode) payload.mode = mode;

    try {
      const result = (await api.post<GatewayTestResult>('/v1/platform/settings/payment/test', payload)).data;
      setTestFeedback({
        gateway,
        mode,
        status: result.status,
        message: result.message ?? 'Gateway responded.',
        latency_ms: result.latency_ms,
      });
      if (mode) {
        applyLastTest(gateway, mode, { ...result, at: result.at ?? new Date().toISOString() });
      }
      queryClient.invalidateQueries({ queryKey: PAYMENT_SETTINGS_KEY });
    } catch (err) {
      const status = (err as { response?: { data?: { status?: string } } })?.response?.data?.status;
      setTestFeedback({ gateway, mode, status: status ?? 'error', message: apiError(err) });
    } finally {
      setTestingGateway(null);
    }
  };

  const saveGlobalSettings = () => {
    if (!currentSettings) return;
    globalMutation.mutate({
      active_gateway: currentSettings.active_gateway,
      mode: currentSettings.mode,
      currency: currentSettings.currency,
      auto_billing_enabled: currentSettings.auto_billing_enabled,
    });
  };

  const renderClientModeToggle = (meta: GatewayMeta) => {
    const isSandbox = clientModeOf(currentSettings?.gateways[meta.key]) === 'sandbox';
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Client mode</span>
        <div
          role="group"
          aria-label={`${meta.saveName} client mode`}
          className="flex items-center rounded-lg border border-outline-variant/40 bg-surface-container-low p-0.5 text-xs font-semibold"
        >
          <button
            type="button"
            aria-pressed={isSandbox}
            aria-label={`Use ${meta.saveName} in sandbox for checkout`}
            onClick={() => updateGatewayField(meta.key, 'sandbox', true)}
            className={`rounded px-2.5 py-0.5 transition-all ${
              isSandbox ? 'bg-amber-500 font-bold text-white shadow-xs' : 'text-muted hover:text-on-surface'
            }`}
          >
            Sandbox
          </button>
          <button
            type="button"
            aria-pressed={!isSandbox}
            aria-label={`Use ${meta.saveName} live for checkout`}
            onClick={() => updateGatewayField(meta.key, 'sandbox', false)}
            className={`rounded px-2.5 py-0.5 transition-all ${
              !isSandbox ? 'bg-emerald-600 font-bold text-white shadow-xs' : 'text-muted hover:text-on-surface'
            }`}
          >
            Live
          </button>
        </div>
      </div>
    );
  };

  const renderEnabledToggle = (meta: GatewayMeta, enabled: boolean) => (
    <label className="flex w-fit cursor-pointer items-center gap-2 text-xs font-semibold text-muted">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(event) => updateGatewayField(meta.key, 'enabled', event.target.checked)}
        aria-label={`Enable ${meta.saveName}`}
        className="h-3.5 w-3.5 cursor-pointer accent-secondary"
      />
      <span>Enabled for checkout</span>
    </label>
  );

  /**
   * Corner check: the API decides whether the credential set for the mode being
   * edited holds every required field, so the console never re-implements that
   * rule. Offline cards own no credential sets and never show it.
   */
  const renderConfiguredCheck = (meta: GatewayMeta) => {
    if (meta.kind !== 'digital') return null;
    const mode = editorModeFor(meta.key);
    if (!gatewayConfig(meta.key).configured?.[mode]) return null;

    return (
      <span
        role="img"
        title={`${modeLabels[mode]} credentials configured`}
        aria-label={`${meta.saveName} ${modeLabels[mode].toLowerCase()} credentials configured`}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-400/30"
      >
        <Icon name="check" className="text-[14px]" />
      </span>
    );
  };

  const renderLastTestBadge = (gateway: string, mode?: EditorMode) => {
    if (!mode) return null;
    const result = currentSettings?.gateways[gateway]?.last_test?.[mode];
    const label = result
      ? [
          `${modeLabels[mode]} test: ${describeTestStatus(result.status).label}`,
          typeof result.latency_ms === 'number' ? `${result.latency_ms} ms` : null,
          formatTimestamp(result.at),
        ]
          .filter(Boolean)
          .join(' · ')
      : `${modeLabels[mode]} test: not run yet`;

    return <Badge tone={result ? describeTestStatus(result.status).tone : 'neutral'}>{label}</Badge>;
  };

  const renderCardStatus = (gateway: string) => {
    const state = cardSave[gateway];
    if (!state) return null;
    if (state.state === 'saving') {
      return (
        <span role="status" className="text-[11px] text-muted">
          Saving…
        </span>
      );
    }
    if (state.state === 'saved') {
      const name = gatewayMeta.find((meta) => meta.key === gateway)?.saveName ?? gateway;
      return (
        <span role="status" className="text-[11px] font-semibold text-secondary">
          {name} credentials saved.
        </span>
      );
    }
    return null;
  };

  /** Save/saved status on its own right-aligned line, above a card's buttons. */
  const renderCardStatusLine = (gateway: string) => {
    const status = renderCardStatus(gateway);
    if (!status) return null;
    return <div className="flex justify-end">{status}</div>;
  };

  const renderCardSaveError = (gateway: string) => {
    const state = cardSave[gateway];
    if (state?.state !== 'error' || !state.message) return null;
    return <Alert tone="error">{state.message}</Alert>;
  };

  /**
   * Opens the ping drawer, saves the card first so the probe uses the credentials
   * currently on screen, then pings that environment.
   */
  const openPing = async (gateway: string, gatewayName: string) => {
    const mode = pingMode(gateway);
    setPingDrawer({ gateway, gatewayName, mode });
    setTestFeedback(null);
    setTestingGateway(gateway);

    try {
      if (dirtyGateways[gateway]) {
        await persistGateway(gateway);
      }
      await runTest(gateway, mode);
    } catch (err) {
      setTestingGateway(null);
      setTestFeedback({
        gateway,
        mode,
        status: 'error',
        message: `Could not save the card first: ${apiError(err)}`,
      });
    }
  };

  /** Save the card, then start a sandbox payment with the just-saved credentials. */
  const openSandboxPayment = async (gateway: string, gatewayName: string) => {
    try {
      if (dirtyGateways[gateway]) {
        await persistGateway(gateway);
      }
      setSandboxPaymentFor({ key: gateway, name: gatewayName });
    } catch {
      // The card shows the save error; do not create a session from stale values.
    }
  };

  const renderCardActions = (meta: GatewayMeta) => {
    const saving = cardSave[meta.key]?.state === 'saving';
    return (
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button size="sm" variant="soft" disabled={saving} onClick={() => saveGateway(meta.key)}>
          <Icon name="save" className="text-[16px]" />
          {saving ? `Saving ${meta.saveName}…` : `Save ${meta.saveName}`}
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-haspopup="dialog"
          disabled={testingGateway === meta.key}
          onClick={() => void openPing(meta.key, meta.saveName)}
        >
          <Icon name="bolt" className="text-[16px]" />
          {testingGateway === meta.key ? 'Testing…' : meta.pingLabel}
        </Button>
        {meta.kind === 'digital' && supportsSandboxPayment(meta.key) && (
          <Button
            size="sm"
            variant="outline"
            aria-label={`Sandbox payment for ${meta.saveName}`}
            onClick={() => void openSandboxPayment(meta.key, meta.saveName)}
          >
            <Icon name="science" className="text-[16px]" />
            Sandbox payment
          </Button>
        )}
      </div>
    );
  };

  const renderCardFooter = (meta: GatewayMeta, mode?: EditorMode) => (
    <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3">
      {renderCardStatusLine(meta.key)}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {renderLastTestBadge(meta.key, mode)}
          {mode && (
            <span className="text-[11px] text-muted">
              Client mode:{' '}
              {clientModeOf(currentSettings?.gateways[meta.key]) === 'sandbox' ? 'Sandbox (test)' : 'Live (production)'}
            </span>
          )}
        </div>
        {renderCardActions(meta)}
      </div>
    </div>
  );

  const renderFieldInput = (
    meta: GatewayMeta,
    mode: EditorMode,
    field: FieldSpec,
    value: string,
    onChange: (value: string) => void,
  ) => {
    const inputId = `payment-${meta.key}-${mode}-${field.name}`;
    const revealKey = `${meta.key}-${mode}-${field.name}`;
    const revealed = showSecrets[revealKey] ?? false;

    if (field.multiline) {
      return (
        <div key={field.name} className={meta.columns === 2 ? 'sm:col-span-2' : undefined}>
          <Label htmlFor={inputId}>{field.label}</Label>
          <textarea
            id={inputId}
            rows={2}
            value={value}
            onChange={(event) => onChange(event.target.value.replace(/•/g, ''))}
            placeholder={field.placeholder}
            className="w-full rounded-xl border border-outline-variant/50 bg-surface p-3 text-body-sm text-on-surface focus:border-secondary focus:outline-none"
          />
        </div>
      );
    }

    // Every key/ID field gets a reveal control; only multiline instructions skip it.
    const secret = field.secret ?? true;

    const input = (
      <Input
        id={inputId}
        type={secret && !revealed ? 'password' : 'text'}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/•/g, ''))}
        onFocus={(event) => {
          if (value.includes('•')) event.currentTarget.select();
        }}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        className={secret ? 'pr-11 font-mono text-sm' : undefined}
      />
    );

    return (
      <div key={field.name} className="min-w-0">
        <Label htmlFor={inputId}>{field.label}</Label>
        {secret ? (
          <div className="relative">
            {input}
            <button
              type="button"
              onClick={() => setShowSecrets((prev) => ({ ...prev, [revealKey]: !revealed }))}
              aria-pressed={revealed}
              aria-label={`${revealed ? 'Hide' : 'Show'} ${field.label} for ${meta.saveName} ${mode}`}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted hover:text-on-surface"
            >
              <Icon name={revealed ? 'visibility_off' : 'visibility'} className="text-[16px]" />
            </button>
          </div>
        ) : (
          input
        )}
      </div>
    );
  };

  const renderCredentialEditor = (meta: GatewayMeta) => {
    const mode = editorModeFor(meta.key);
    const credentials = currentSettings?.gateways[meta.key]?.credentials?.[mode] ?? {};

    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            role="group"
            aria-label={`${meta.saveName} credential environment`}
            className="flex items-center gap-1 rounded-xl bg-canvas p-1"
          >
            {(['sandbox', 'live'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={mode === option}
                aria-label={`Edit ${meta.saveName} ${option} credentials`}
                onClick={() => setEditorModes((prev) => ({ ...prev, [meta.key]: option }))}
                className={`cursor-pointer rounded-lg px-3 py-1 text-label-md transition-all ${
                  mode === option ? 'bg-surface font-bold text-secondary shadow-sm' : 'text-muted hover:text-on-surface'
                }`}
              >
                {modeLabels[option]}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-muted">Editing {mode} credentials</span>
        </div>

        <div className={meta.columns === 2 ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'flex flex-col gap-3'}>
          {meta.fields.map((field) =>
            renderFieldInput(meta, mode, field, credentials[field.name] ?? '', (value) =>
              updateCredential(meta.key, mode, field.name, value),
            ),
          )}
        </div>

        <p className="text-[11px] text-muted">
          Secrets come back masked. Leaving a masked or empty field untouched keeps the stored value.
        </p>
      </div>
    );
  };

  const renderFlatEditor = (meta: GatewayMeta) => {
    const config = gatewayConfig(meta.key);
    const mode = clientModeOf(config);
    const valueOf = (name: string) => {
      const value = flatFieldValue(config, name);
      return typeof value === 'string' ? value : value === undefined ? '' : String(value);
    };

    return (
      <div className={meta.columns === 2 ? 'grid grid-cols-1 gap-3 sm:grid-cols-2' : 'flex flex-col gap-3'}>
        {meta.fields.map((field) =>
          renderFieldInput(meta, mode, field, valueOf(field.name), (value) =>
            updateGatewayField(meta.key, field.name as keyof PaymentGatewayCredentials, value),
          ),
        )}
      </div>
    );
  };

  const renderGatewayCard = (meta: GatewayMeta) => {
    const config = gatewayConfig(meta.key);
    const mode = editorModeFor(meta.key);

    return (
      <Card key={meta.key} className="flex flex-col justify-between gap-4 p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${meta.iconClassName}`}>
                <Icon name={meta.icon} className="text-[20px]" />
              </span>
              <div>
                <h4 className="text-label-lg font-bold text-on-surface">{meta.title}</h4>
                <p className="text-body-xs text-muted">{meta.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {currentSettings?.active_gateway === meta.key && <Badge tone="success">Primary Active</Badge>}
              {renderClientModeToggle(meta)}
              {renderConfiguredCheck(meta)}
            </div>
          </div>

          {renderEnabledToggle(meta, config.enabled ?? false)}
          {meta.kind === 'digital' ? renderCredentialEditor(meta) : renderFlatEditor(meta)}
        </div>

        {renderCardSaveError(meta.key)}
        {renderCardFooter(meta, mode)}
      </Card>
    );
  };

  const renderCashCard = () => {
    const cash = currentSettings?.gateways.cash;
    const enabled = cash?.enabled ?? false;
    const saving = cardSave.cash?.state === 'saving';

    return (
      <Card className="flex flex-col justify-between gap-4 border-emerald-300 p-5 lg:col-span-2 dark:border-emerald-900/50">
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
              {currentSettings?.active_gateway === 'cash' ? (
                <Badge tone="success">Primary Active Gateway</Badge>
              ) : enabled ? (
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
              checked={enabled}
              onChange={(event) => updateGatewayField('cash', 'enabled', event.target.checked)}
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

          {enabled && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1.5 md:col-span-2">
                <Label htmlFor="cash-instructions">Tenant Collection Instructions &amp; Notes</Label>
                <textarea
                  id="cash-instructions"
                  rows={2}
                  value={cash?.instructions ?? ''}
                  onChange={(event) => updateGatewayField('cash', 'instructions', event.target.value)}
                  className="w-full rounded-xl border border-outline-variant/50 bg-surface p-3 text-body-sm text-on-surface focus:border-secondary focus:outline-none"
                  placeholder="e.g. Please hand physical cash to your community manager at the central reception desk."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="cash-auto-paid"
                  checked={cash?.auto_mark_paid ?? false}
                  onChange={(event) => updateGatewayField('cash', 'auto_mark_paid', event.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-secondary"
                />
                <Label htmlFor="cash-auto-paid" className="cursor-pointer text-body-sm text-on-surface">
                  Auto-mark cash invoices as Paid immediately (uncheck to require admin approval)
                </Label>
              </div>
            </div>
          )}
        </div>

        {renderCardSaveError('cash')}

        <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3">
          {renderCardStatusLine('cash')}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              size="sm"
              variant="outline"
              aria-haspopup="dialog"
              disabled={testingGateway === 'cash'}
              onClick={() => void openPing('cash', 'Cash Payment')}
            >
              <Icon name="bolt" className="text-[16px]" />
              {testingGateway === 'cash' ? 'Testing…' : 'Test Cash Payment Configuration'}
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Link to="/admin/billing">
                <Button size="sm" variant="outline">
                  <Icon name="receipt_long" className="text-[16px]" />
                  Open Cash Settlement Queue &rarr;
                </Button>
              </Link>
              <Button size="sm" variant="soft" disabled={saving} onClick={() => saveGateway('cash')}>
                <Icon name="save" className="text-[16px]" />
                {saving ? 'Saving Cash…' : 'Save Cash'}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const renderMockCard = () => {
    const mock = currentSettings?.gateways.mock;
    const saving = cardSave.mock?.state === 'saving';

    return (
      <Card className="flex flex-col justify-between gap-4 border-2 border-dashed border-amber-300 bg-amber-50/20 p-5 lg:col-span-2 dark:border-amber-900/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <Icon name="smart_toy" className="text-[20px]" />
              </span>
              <div>
                <h4 className="text-label-lg font-bold text-on-surface">Internal Sandbox Payment Simulator</h4>
                <p className="text-body-xs text-muted">Zero-dependency automated mock payment engine for QA, staging &amp; developer testing</p>
              </div>
            </div>
            <Badge tone={currentSettings?.active_gateway === 'mock' ? 'success' : 'neutral'}>
              {currentSettings?.active_gateway === 'mock' ? 'Active Default Gateway' : 'Available Sandbox'}
            </Badge>
          </div>

          <p className="text-xs leading-relaxed text-on-surface">
            The sandbox simulator enables immediate plan upgrades without external merchant credentials. It generates authentic invoices with simulated latency and supports forced decline testing.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-semibold text-on-surface">
              <input
                type="checkbox"
                checked={mock?.simulate_failure ?? false}
                onChange={(event) => updateGatewayField('mock', 'simulate_failure', event.target.checked)}
                className="h-4 w-4 accent-error"
              />
              <span>Simulate payment gateway decline / card errors</span>
            </label>
          </div>
        </div>

        {renderCardSaveError('mock')}

        <div className="flex flex-col gap-2 border-t border-outline-variant/20 pt-3">
          {renderCardStatusLine('mock')}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {renderLastTestBadge('mock', pingMode('mock'))}
              <span className="text-[11px] text-muted">Latency: ~120ms simulated response</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="soft" disabled={saving} onClick={() => saveGateway('mock')}>
                <Icon name="save" className="text-[16px]" />
                {saving ? 'Saving Mock Simulator…' : 'Save Mock Simulator'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-haspopup="dialog"
                disabled={testingGateway === 'mock'}
                onClick={() => void openPing('mock', 'Mock Simulator')}
              >
                <Icon name="play_arrow" className="text-[16px]" />
                {testingGateway === 'mock' ? 'Running…' : 'Run Sandbox Simulation'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                aria-label="Sandbox payment for Mock Simulator"
                onClick={() => void openSandboxPayment('mock', 'Mock Simulator')}
              >
                <Icon name="science" className="text-[16px]" />
                Sandbox payment
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  const digitalGatewayCount = currentSettings
    ? Object.keys(currentSettings.gateways).filter((key) => isDigitalGateway(key)).length
    : 0;
  /**
   * Every provider the filter pills enumerate: the `gatewayMeta` cards plus the
   * two hand-rendered ones (cash and the internal mock simulator), so adding a
   * gateway to `gatewayMeta` keeps the "All Providers" count honest.
   */
  const providerCount = gatewayMeta.length + 2;
  const sandboxCount = currentSettings
    ? Object.entries(currentSettings.gateways).filter(
        ([key, config]) => isDigitalGateway(key) && clientModeOf(config) === 'sandbox',
      ).length
    : 0;
  const liveCount = digitalGatewayCount - sandboxCount;
  const hasAnySandbox =
    sandboxCount > 0 || (currentSettings?.gateways.mock?.enabled ?? true) || currentSettings?.mode === 'sandbox';

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Gateways"
          titleSize="headline"
          description="Manage global and regional merchant gateways, test sandbox environments, currency, and offline collection workflows."
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {paymentQuery.isLoading && (
          <div className="flex flex-col gap-6">
            <StatGridSkeleton count={4} />
            <SkeletonForm fields={4} />
            <SkeletonForm fields={6} />
          </div>
        )}

        {currentSettings && (
          <div className="flex flex-col gap-6">
            {/* Unified Gateway KPI Strip */}
            <StatGrid count={4}>
              <StatCard
                title="Primary Default Gateway"
                value={currentSettings.active_gateway.toUpperCase()}
                subtitle="Default checkout processor"
                icon="credit_card"
                tone="forest"
                highlight={
                  <StatHighlight
                    tone="forest"
                    icon="verified"
                    label={currentSettings.auto_billing_enabled ? 'Auto-renewals enabled' : 'Manual renewals'}
                  />
                }
              />
              <StatCard
                title="Live Providers"
                value={liveCount}
                subtitle="Production merchant gateways"
                icon="verified_user"
                tone="sage"
                highlight={<StatHighlight tone="sage" icon="check_circle" label="Real customer checkout" />}
              />
              <StatCard
                title="Sandbox Providers"
                value={sandboxCount}
                subtitle="Test-mode merchant gateways"
                icon="science"
                tone="amber"
                highlight={<StatHighlight tone="amber" icon="bug_report" label="Safe simulator active" />}
              />
              <StatCard
                title="Operating Currency"
                value={currentSettings.currency}
                subtitle="Settlement & invoice currency"
                icon="currency_exchange"
                tone="forest"
                highlight={<StatHighlight tone="forest" icon="public" label="Global & regional MFS" />}
              />
            </StatGrid>

            {/* Global Environment & Mode Card */}
            <Card className="flex flex-col gap-5 bg-surface p-6">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">Payment Gateways &amp; Environment Controls</h3>
                  <p className="text-xs text-muted">
                    Configure your platform billing mode, primary default gateway, and individual Sandbox vs Live settings per provider.
                  </p>
                </div>

                <div className="flex shrink-0 flex-nowrap items-center gap-2.5">
                  <div className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-xs">
                    <span className="font-semibold text-muted">Providers:</span>
                    <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                      {liveCount} Live
                    </span>
                    <span className="text-muted">·</span>
                    <span className="flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                      <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                      {sandboxCount} Sandbox
                    </span>
                  </div>

                  <div className="flex shrink-0 whitespace-nowrap rounded-xl border border-outline-variant/40 bg-surface-container-low p-1 text-xs">
                    <button
                      type="button"
                      aria-pressed={currentSettings.mode === 'sandbox'}
                      onClick={() => {
                        handleUpdate((prev) => {
                          const updated = { ...prev.gateways };
                          Object.keys(updated).forEach((k) => {
                            if (!['cash', 'bank_transfer'].includes(k)) {
                              updated[k] = { ...updated[k], sandbox: true };
                            }
                          });
                          return { ...prev, mode: 'sandbox', gateways: updated };
                        });
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                        currentSettings.mode === 'sandbox'
                          ? 'bg-amber-500 text-white shadow-sm'
                          : 'text-muted hover:text-on-surface'
                      }`}
                    >
                      <Icon name="science" className="text-[16px]" />
                      Set All Sandbox
                    </button>
                    <button
                      type="button"
                      aria-pressed={currentSettings.mode === 'live'}
                      onClick={() => {
                        handleUpdate((prev) => {
                          const updated = { ...prev.gateways };
                          Object.keys(updated).forEach((k) => {
                            if (!['cash', 'bank_transfer'].includes(k)) {
                              updated[k] = { ...updated[k], sandbox: false };
                            }
                          });
                          return { ...prev, mode: 'live', gateways: updated };
                        });
                      }}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-bold transition-all ${
                        currentSettings.mode === 'live'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-muted hover:text-on-surface'
                      }`}
                    >
                      <Icon name="verified" className="text-[16px]" />
                      Set All Live
                    </button>
                  </div>
                </div>
              </div>

              {/* Informational banner explaining individual sandbox operation */}
              <div className="flex items-center gap-2.5 rounded-xl border border-outline-variant/30 bg-sage-soft/40 p-3 text-xs text-on-surface">
                <Icon name="info" className="shrink-0 text-[18px] text-secondary" />
                <p>
                  <strong className="font-semibold text-secondary">Individual Gateway Environments:</strong> Each payment gateway can be individually set to <strong>Sandbox (Test Mode)</strong> or <strong>Live (Production)</strong>. You can process real customer checkouts with <strong>Stripe (Live)</strong> while simultaneously testing local providers like <strong>bKash</strong>, <strong>Razorpay</strong>, or <strong>Nagad</strong> in <strong>Sandbox</strong>. Bulk changes above stay on screen — press each provider&apos;s own save button to persist them.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 border-t border-outline-variant/20 pt-4 md:grid-cols-3">
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
                    <option value="paddle">Paddle (Merchant of Record)</option>
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
            {hasAnySandbox && (
              <Card className="flex flex-col gap-3 border-amber-300 bg-amber-50/50 p-5 dark:border-amber-900/40 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                    <Icon name="science" className="text-[20px]" />
                    <h4 className="text-sm font-bold">
                      Sandbox Simulator Active ({sandboxCount} Gateway{sandboxCount === 1 ? '' : 's'} in Test Mode): Test Cards Cheatsheet
                    </h4>
                  </div>
                  <button
                    type="button"
                    aria-expanded={showSandboxCheatsheet}
                    onClick={() => setShowSandboxCheatsheet((p) => !p)}
                    className="text-xs font-semibold text-amber-700 hover:underline dark:text-amber-300"
                  >
                    {showSandboxCheatsheet ? 'Collapse Simulator' : 'Expand Simulator'}
                  </button>
                </div>

                {showSandboxCheatsheet && (
                  <div className="grid grid-cols-1 gap-3 pt-1 text-xs sm:grid-cols-2 lg:grid-cols-4">
                    <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-surface p-3 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">Stripe Sandbox Card</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-secondary">
                        4242 4242 4242 4242
                      </code>
                      <span className="text-[11px] text-muted">Exp: Any future date · CVC: 123</span>
                    </div>

                    <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-surface p-3 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">Stripe Declined Test Card</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-error">
                        4000 0000 0000 0002
                      </code>
                      <span className="text-[11px] text-muted">Simulates card insufficient funds / decline</span>
                    </div>

                    <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-surface p-3 dark:border-amber-900/30">
                      <span className="font-bold text-on-surface">bKash / Nagad Sandbox OTP</span>
                      <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-[11px] text-secondary">
                        OTP: 123456 · PIN: 12123
                      </code>
                      <span className="text-[11px] text-muted">Test numbers: 01770618575 / 01877722344</span>
                    </div>

                    <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-surface p-3 dark:border-amber-900/30">
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

            {/* Soft Tactile Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/80 bg-surface p-1.5 shadow-e1">
              {(
                [
                  { id: 'all', label: `All Providers (${providerCount})`, icon: 'apps' },
                  { id: 'global', label: 'Cards & Global', icon: 'public' },
                  { id: 'south-asia', label: 'South Asia & Bangladesh', icon: 'Qr_code_2' },
                  { id: 'africa', label: 'Africa (Paystack)', icon: 'payments' },
                  { id: 'offline', label: 'Direct & Offline', icon: 'account_balance' },
                  { id: 'sandbox', label: 'Internal Simulator', icon: 'science' },
                ] as const
              ).map((tab) => {
                const isActive = categoryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setCategoryFilter(tab.id)}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl px-3.5 py-2 text-label-md font-bold transition-all ${
                      isActive
                        ? 'bg-secondary text-on-secondary shadow-xs'
                        : 'text-on-surface-variant hover:bg-sage-soft/60 hover:text-on-surface'
                    }`}
                  >
                    <Icon name={tab.icon.toLowerCase()} className="text-[16px]" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Provider Cards Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {gatewayMeta
                .filter((meta) => categoryFilter === 'all' || categoryFilter === meta.category)
                .map((meta) => renderGatewayCard(meta))}

              {(categoryFilter === 'all' || categoryFilter === 'offline') && renderCashCard()}
              {(categoryFilter === 'all' || categoryFilter === 'sandbox') && renderMockCard()}
            </div>

            {/* Save Global Settings bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/30 pt-4">
              <p className="max-w-xl text-[11px] text-muted">
                This bar saves the primary gateway, currency, recurring billing and platform mode only. Credentials and each
                gateway&apos;s client mode are saved from that gateway&apos;s own card.
              </p>
              <Button size="lg" disabled={globalMutation.isPending} onClick={saveGlobalSettings}>
                <Icon name="save" className="text-[18px]" />
                {globalMutation.isPending ? 'Saving Global Settings…' : 'Save Global Settings'}
              </Button>
            </div>
          </div>
        )}
      </div>

      <GatewayPingDrawer
        open={pingDrawer !== null}
        gatewayName={pingDrawer?.gatewayName ?? ''}
        mode={pingDrawer?.mode}
        testing={testingGateway !== null && testingGateway === pingDrawer?.gateway}
        feedback={testFeedback && testFeedback.gateway === pingDrawer?.gateway ? testFeedback : null}
        onClose={() => {
          setPingDrawer(null);
          setTestFeedback(null);
        }}
      />

      <SandboxPaymentDrawer
        open={sandboxPaymentFor !== null}
        gateway={sandboxPaymentFor?.key ?? ''}
        gatewayName={sandboxPaymentFor?.name ?? ''}
        onClose={() => setSandboxPaymentFor(null)}
      />
    </AppLayout>
  );
}
