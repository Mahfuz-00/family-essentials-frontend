import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { api, apiError } from '@/lib/api';
import { getCurrencySign } from '@/lib/money';
import { useQuota } from '@/hooks/useQuota';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { AuthUser, Tenant } from '@/types';

type SettingsTab = 'profile' | 'alerts' | 'workspace';

/**
 * Household settings: identity, verification, reachability, and workspace data vault.
 */
export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const active = useTenantStore((state) => state.active);
  const quota = useQuota();

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const tenant = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get<{ data: Tenant }>('/v1/tenant')).data.data,
  });

  const tenantSettings = (tenant.data?.settings ?? {}) as Record<string, any>;
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    try {
      return localStorage.getItem('family_essentials_currency') || 'BDT';
    } catch {
      return 'BDT';
    }
  });
  const [selectedDateFormat, setSelectedDateFormat] = useState<string>('YYYY-MM-DD');
  const [selectedTimeFormat, setSelectedTimeFormat] = useState<string>('12h');
  const [defaultDueDays, setDefaultDueDays] = useState<number>(2);

  useEffect(() => {
    if (tenantSettings.currency) {
      setSelectedCurrency(String(tenantSettings.currency));
      try {
        localStorage.setItem('family_essentials_currency', String(tenantSettings.currency));
      } catch {
        // ignore
      }
    }
    if (tenantSettings.date_format) {
      setSelectedDateFormat(String(tenantSettings.date_format));
    }
    if (tenantSettings.time_format) {
      setSelectedTimeFormat(String(tenantSettings.time_format));
    }
    if (typeof tenantSettings.default_due_days === 'number') {
      setDefaultDueDays(tenantSettings.default_due_days);
    }
  }, [tenantSettings.currency, tenantSettings.date_format, tenantSettings.time_format, tenantSettings.default_due_days]);

  const saveSettingsMutation = useMutation({
    mutationFn: async () => {
      try {
        localStorage.setItem('family_essentials_currency', selectedCurrency);
      } catch {
        // ignore
      }
      await api.patch('/v1/tenant', {
        settings: {
          currency: selectedCurrency,
          date_format: selectedDateFormat,
          time_format: selectedTimeFormat,
          default_due_days: defaultDueDays,
        },
      });
      await tenant.refetch();
    },
    onSuccess: () => {
      const sign = getCurrencySign(selectedCurrency);
      setNotice(`Household preferences saved! Platform currency symbol set to "${sign}" (${selectedCurrency}).`);
      setError(null);
    },
    onError: (e) => setError(apiError(e)),
  });

  const voiceConsent = useMutation({
    mutationFn: async (optIn: boolean) => {
      await api.patch('/v1/auth/voice-consent', { voice_opt_in: optIn });
      const { data } = await api.get<{ data: AuthUser }>('/v1/auth/me');
      setUser(data.data);
    },
    onError: (caught) => setError(apiError(caught)),
    onSuccess: () => setError(null),
  });

  const locationConsent = useMutation({
    mutationFn: async (optIn: boolean) => {
      await api.patch('/v1/auth/location-consent', { opt_in: optIn });
      const { data } = await api.get<{ data: AuthUser }>('/v1/auth/me');
      setUser(data.data);
    },
    onError: (caught) => setError(apiError(caught)),
    onSuccess: () => setError(null),
  });

  const handleExportVault = async () => {
    setExporting(true);
    setError(null);
    try {
      const resp = await api.get<{ data: any }>('/v1/tenant/export');
      const blob = new Blob([JSON.stringify(resp.data.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `household-vault-${active?.slug || 'backup'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setNotice('Household vault exported successfully! Check your downloads folder.');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setExporting(false);
    }
  };

  const quietHours = (tenant.data?.settings?.quiet_hours ?? null) as
    | { enabled?: boolean; start?: string; end?: string }
    | null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-4xl">
        <PageHeader
          title="Settings"
          description="Your personal profile, how family alerts reach you, and your shared household workspace."
          titleSize="headline"
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant/30 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'profile'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="person" className="text-[18px]" />
            Profile &amp; Security
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('alerts')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'alerts'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="notifications" className="text-[18px]" />
            Alerts &amp; Reachability
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('workspace')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-bold transition-all ${
              activeTab === 'workspace'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="cottage" className="text-[18px]" />
            Household Workspace &amp; Data Vault
          </button>
        </div>

        {/* TAB 1: PROFILE & SECURITY */}
        {activeTab === 'profile' && (
          <Card className="p-6">
            <div className="flex items-center gap-4 border-b border-outline-variant/20 pb-5">
              <Avatar name={user?.name ?? 'User'} size="lg" />
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate text-headline-sm text-on-surface">{user?.name}</h2>
                <span className="truncate text-body-sm text-muted">{user?.email}</span>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <SettingRow
                label="Email Address"
                value={user?.email ?? '—'}
                verified={user?.email_verified ?? false}
                verifiedLabel="Verified"
                unverifiedLabel="Not verified"
                action={
                  <Link to="/verify-email" className="text-body-md font-semibold text-secondary hover:underline">
                    Verify →
                  </Link>
                }
              />
              <SettingRow
                label="Phone Number"
                value={user?.phone ?? 'No number on file'}
                verified={user?.phone_verified ?? false}
                verifiedLabel="Verified"
                unverifiedLabel="Not verified"
                action={
                  <Link to="/verify-phone" className="text-body-md font-semibold text-secondary hover:underline">
                    {user?.phone_verified ? 'Change →' : 'Verify →'}
                  </Link>
                }
              />
            </div>
          </Card>
        )}

        {/* TAB 2: ALERTS & REACHABILITY */}
        {activeTab === 'alerts' && (
          <Card className="p-6">
            <h2 className="text-headline-sm text-on-surface">How the household reaches you</h2>
            <p className="mt-1 text-body-sm text-muted">
              Push reminders arrive on your paired devices once notifications are enabled.
            </p>

            <div className="mt-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3 rounded-2xl bg-canvas px-4 py-3.5 border border-outline-variant/20">
                <span className="flex flex-col">
                  <span className="text-body-md font-semibold text-on-surface">Voice escalation calls</span>
                  <span className="text-body-sm text-muted">
                    {user?.phone_verified
                      ? 'Automated voice calls for urgent overdue tasks, bounded by daily budget and quiet hours.'
                      : 'Verify your phone number first.'}
                  </span>
                </span>
                <label className="flex cursor-pointer items-center">
                  <span className="sr-only">Enable voice escalation</span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={user?.voice_opt_in ?? false}
                    disabled={voiceConsent.isPending || !user?.phone_verified}
                    onChange={(event) => voiceConsent.mutate(event.target.checked)}
                  />
                  <span className="relative block h-6 w-11 rounded-full bg-outline-variant/70 transition-colors peer-checked:bg-secondary peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="flex items-start justify-between gap-3 rounded-2xl bg-canvas px-4 py-3.5 border border-outline-variant/20">
                <span className="flex flex-col">
                  <span className="text-body-md font-semibold text-on-surface">
                    Store arrival notifications
                  </span>
                  <span className="text-body-sm text-muted">
                    Notified when you arrive at a saved store with errands waiting. Only checked while app is active; background location is never recorded.
                  </span>
                </span>
                <label className="flex cursor-pointer items-center">
                  <span className="sr-only">Enable arrival notifications</span>
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={user?.location_notifications_opt_in ?? false}
                    disabled={locationConsent.isPending}
                    onChange={(event) => locationConsent.mutate(event.target.checked)}
                  />
                  <span className="relative block h-6 w-11 rounded-full bg-outline-variant/70 transition-colors peer-checked:bg-secondary peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
                </label>
              </div>

              <div className="flex items-center justify-between rounded-2xl bg-canvas px-4 py-3.5 border border-outline-variant/20">
                <span className="flex flex-col">
                  <span className="text-body-md font-semibold text-on-surface">Household quiet hours</span>
                  <span className="text-body-sm text-muted">
                    {quietHours?.enabled
                      ? `${quietHours.start ?? '—'} to ${quietHours.end ?? '—'}`
                      : 'No quiet hours configured'}
                  </span>
                </span>
                <Badge tone={quietHours?.enabled ? 'success' : 'neutral'}>
                  {quietHours?.enabled ? 'Active' : 'Off'}
                </Badge>
              </div>
            </div>

            <p className="mt-4 text-body-sm text-muted">
              Configure quiet windows and daily call budget under{' '}
              <Link to="/requests/escalation" className="font-semibold text-secondary hover:underline">
                Escalation &amp; voice
              </Link>
              .
            </p>
          </Card>
        )}

        {/* TAB 3: WORKSPACE & DATA VAULT */}
        {activeTab === 'workspace' && (
          <div className="flex flex-col gap-6">
            <Card className="p-6">
              <h2 className="text-headline-sm text-on-surface">Household Workspace Overview</h2>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Detail label="Household" value={active?.name ?? '—'} />
                <Detail
                  label="Plan"
                  value={
                    quota.plan
                      ? `${quota.planLabel} · ${quota.plan.price} ${quota.plan.cadence}`
                      : quota.planLabel
                  }
                />
                <Detail
                  label="Members"
                  value={
                    quota.seatCap === null
                      ? `${quota.seatsUsed} seats used`
                      : `${quota.seatsUsed} of ${quota.seatCap} seats`
                  }
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-2.5">
                <Link to="/members/roles" className="inline-flex">
                  <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                    <Icon name="shield_person" className="text-[18px]" />
                    Roles &amp; permissions
                  </span>
                </Link>
                <Link to="/billing" className="inline-flex">
                  <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                    <Icon name="credit_card" className="text-[18px]" />
                    Billing &amp; plan
                  </span>
                </Link>
              </div>
            </Card>

            {/* Household Preferences & Global Currency */}
            <Card className="flex flex-col gap-5 p-6 border-outline-variant/30">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="tune" className="text-[20px]" />
                  </span>
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-surface">Household Localization & Currency</h3>
                    <p className="text-xs text-muted">Controls all currency markers, date formats, and task deadlines across the software.</p>
                  </div>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={saveSettingsMutation.isPending}
                  onClick={() => saveSettingsMutation.mutate()}
                >
                  <Icon name="save" className="text-[16px]" />
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Preferences'}
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-currency-select" className="text-label-sm font-bold text-on-surface">
                    Global Currency
                  </label>
                  <select
                    id="settings-currency-select"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="h-10 rounded-xl border border-outline-variant/40 bg-canvas px-3 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    <option value="BDT">৳ — BDT (Bangladeshi Taka)</option>
                    <option value="USD">$ — USD (US Dollar)</option>
                    <option value="EUR">€ — EUR (Euro)</option>
                    <option value="GBP">£ — GBP (British Pound)</option>
                    <option value="INR">₹ — INR (Indian Rupee)</option>
                    <option value="JPY">¥ — JPY (Japanese Yen)</option>
                    <option value="CNY">¥ — CNY (Chinese Yuan)</option>
                    <option value="KRW">₩ — KRW (South Korean Won)</option>
                    <option value="PHP">₱ — PHP (Philippine Peso)</option>
                    <option value="THB">฿ — THB (Thai Baht)</option>
                    <option value="VND">₫ — VND (Vietnamese Dong)</option>
                    <option value="ILS">₪ — ILS (Israeli Shekel)</option>
                    <option value="NGN">₦ — NGN (Nigerian Naira)</option>
                    <option value="TRY">₺ — TRY (Turkish Lira)</option>
                    <option value="UAH">₴ — UAH (Ukrainian Hryvnia)</option>
                    <option value="RUB">₽ — RUB (Russian Ruble)</option>
                    <option value="CAD">$ — CAD (Canadian Dollar)</option>
                    <option value="AUD">$ — AUD (Australian Dollar)</option>
                    <option value="SGD">$ — SGD (Singapore Dollar)</option>
                    <option value="NZD">$ — NZD (New Zealand Dollar)</option>
                    <option value="CHF">₣ — CHF (Swiss Franc)</option>
                    <option value="ZAR">R — ZAR (South African Rand)</option>
                    <option value="SAR">﷼ — SAR (Saudi Riyal)</option>
                    <option value="PKR">₨ — PKR (Pakistani Rupee)</option>
                    <option value="BRL">$ — BRL (Brazilian Real)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-date-format-select" className="text-label-sm font-bold text-on-surface">
                    Date Format
                  </label>
                  <select
                    id="settings-date-format-select"
                    value={selectedDateFormat}
                    onChange={(e) => setSelectedDateFormat(e.target.value)}
                    className="h-10 rounded-xl border border-outline-variant/40 bg-canvas px-3 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    <option value="YYYY-MM-DD">YYYY-MM-DD (2026-11-13)</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY (13/11/2026)</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY (11/13/2026)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-time-format-select" className="text-label-sm font-bold text-on-surface">
                    Time Format
                  </label>
                  <select
                    id="settings-time-format-select"
                    value={selectedTimeFormat}
                    onChange={(e) => setSelectedTimeFormat(e.target.value)}
                    className="h-10 rounded-xl border border-outline-variant/40 bg-canvas px-3 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    <option value="12h">12-hour (06:30 PM)</option>
                    <option value="24h">24-hour (18:30)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="settings-default-due-days-select" className="text-label-sm font-bold text-on-surface">
                    Default Task Due
                  </label>
                  <select
                    id="settings-default-due-days-select"
                    value={defaultDueDays}
                    onChange={(e) => setDefaultDueDays(Number(e.target.value))}
                    className="h-10 rounded-xl border border-outline-variant/40 bg-canvas px-3 text-sm text-on-surface focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                  >
                    <option value={1}>1 Day (Tomorrow)</option>
                    <option value={2}>2 Days</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Data Portability & GDPR Vault Export */}
            <Card className="flex flex-col gap-4 p-6 border-secondary/20 bg-forest-soft/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="lock_reset" className="text-[22px]" />
                  </span>
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-surface">
                      Household Data Portability (Vault Export)
                    </h3>
                    <p className="mt-1 text-xs text-muted max-w-xl">
                      Download a full machine-readable JSON archive of your household's entire vault: all requests, members, saved places, pantry essentials, and shared ledgers.
                    </p>
                  </div>
                </div>

                <Button
                  variant="primary"
                  disabled={exporting}
                  onClick={handleExportVault}
                  className="shrink-0"
                >
                  <Icon name="download" className="text-[18px]" />
                  {exporting ? 'Exporting...' : 'Export Vault (.json)'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function SettingRow({
  label,
  value,
  verified,
  verifiedLabel,
  unverifiedLabel,
  action,
}: {
  label: string;
  value: string;
  verified: boolean;
  verifiedLabel: string;
  unverifiedLabel: string;
  action: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-canvas px-4 py-3.5 border border-outline-variant/20">
      <span className="flex min-w-0 flex-col">
        <span className="text-body-md font-semibold text-on-surface">{label}</span>
        <span className="truncate text-body-sm text-muted">{value}</span>
        <span className={`text-body-sm font-semibold ${verified ? 'text-secondary' : 'text-error'}`}>
          {verified ? verifiedLabel : unverifiedLabel}
        </span>
      </span>
      {action}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex flex-col rounded-2xl bg-canvas px-4 py-3 border border-outline-variant/20">
      <span className="text-label-sm uppercase tracking-wider text-muted">{label}</span>
      <span className="text-body-md font-bold text-on-surface">{value}</span>
    </span>
  );
}
