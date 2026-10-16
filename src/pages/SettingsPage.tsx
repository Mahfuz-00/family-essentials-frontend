import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { api, apiError } from '@/lib/api';
import { useQuota } from '@/hooks/useQuota';
import { planFor } from '@/lib/plans';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { AuthUser, Tenant } from '@/types';

/**
 * Household settings: identity, verification and consent.
 *
 * Verification rows and the voice-escalation opt-in used to sit on the dashboard,
 * where they competed with the day's work. They are configuration, so they live
 * with the rest of the configuration.
 */
export function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const active = useTenantStore((state) => state.active);
  const plan = planFor(active?.subscription_tier);
  const quota = useQuota();
  const [error, setError] = useState<string | null>(null);

  const tenant = useQuery({
    queryKey: ['tenant'],
    queryFn: async () => (await api.get<{ data: Tenant }>('/v1/tenant')).data.data,
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

  const quietHours = (tenant.data?.settings?.quiet_hours ?? null) as
    | { enabled?: boolean; start?: string; end?: string }
    | null;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Settings']}
          title="Household settings"
          description="Your account, how the household reaches you, and the workspace itself."
          titleSize="headline"
        />

        {error && <Alert>{error}</Alert>}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Account */}
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name ?? 'User'} size="lg" />
              <div className="flex min-w-0 flex-col">
                <h2 className="truncate text-headline-sm text-on-surface">{user?.name}</h2>
                <span className="truncate text-body-sm text-muted">{user?.email}</span>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <SettingRow
                label="Email"
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
                label="Phone"
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

          {/* Reachability */}
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">How the household reaches you</h2>
            <p className="mt-1 text-body-sm text-muted">
              Push reminders arrive on this device once notifications are permitted.
            </p>

            <div className="mt-4 flex items-start justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
              <span className="flex flex-col">
                <span className="text-body-md font-semibold text-on-surface">Voice escalation</span>
                <span className="text-body-sm text-muted">
                  {user?.phone_verified
                    ? 'Automated calls for urgent overdue tasks, bounded by a daily budget and quiet hours.'
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

            <div className="mt-3 flex items-center justify-between rounded-xl bg-canvas px-4 py-3">
              <span className="flex flex-col">
                <span className="text-body-md font-semibold text-on-surface">Quiet hours</span>
                <span className="text-body-sm text-muted">
                  {quietHours?.enabled
                    ? `${quietHours.start ?? '—'} to ${quietHours.end ?? '—'}`
                    : 'No quiet hours configured'}
                </span>
              </span>
              <Badge tone={quietHours?.enabled ? 'success' : 'neutral'}>
                {quietHours?.enabled ? 'On' : 'Off'}
              </Badge>
            </div>

            <p className="mt-3 text-body-sm text-muted">
              Quiet hours and the daily call budget are set at the household level; see{' '}
              <Link to="/requests/escalation" className="font-semibold text-secondary hover:underline">
                Escalation & voice
              </Link>
              .
            </p>
          </Card>

          {/* Workspace */}
          <Card className="p-5 lg:col-span-2">
            <h2 className="text-headline-sm text-on-surface">Workspace</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Detail label="Household" value={active?.name ?? '—'} />
              <Detail label="Plan" value={`${plan.label} · ${plan.price}`} />
              <Detail label="Members" value={`${quota.seatsUsed} of ${quota.capFor('seats', plan.seatCap)} seats`} />
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link to="/members/roles" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                  <Icon name="shield_person" className="text-[18px]" />
                  Roles & permissions
                </span>
              </Link>
              <Link to="/billing" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                  <Icon name="credit_card" className="text-[18px]" />
                  Billing & plan
                </span>
              </Link>
            </div>
          </Card>
        </div>
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
    <div className="flex items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3">
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
    <span className="flex flex-col rounded-xl bg-canvas px-4 py-3">
      <span className="text-label-sm uppercase tracking-wider text-muted">{label}</span>
      <span className="text-body-md text-on-surface">{value}</span>
    </span>
  );
}
