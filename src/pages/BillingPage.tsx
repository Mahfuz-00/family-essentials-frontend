import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api, apiError } from '@/lib/api';
import { useQuota } from '@/hooks/useQuota';
import { plans } from '@/lib/plans';
import { useTenantStore } from '@/stores/tenant';
import type { Place, UserRef } from '@/types';

export function BillingPage() {
  const active = useTenantStore((state) => state.active);

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: UserRef[] }>('/v1/tenant/members')).data.data,
  });

  const places = useQuery({
    queryKey: ['places'],
    queryFn: async () => (await api.get<{ data: Place[] }>('/v1/places')).data.data,
  });

  // Label, price, cadence and caps are the API's — the same numbers it
  // enforces. Nothing about the household's own plan is hardcoded here.
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

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Billing & Subscription']}
          title="Billing & Subscription Portal"
          description="Your household plan, seat allocation and usage across the workspace."
        />

        {members.isError && <Alert>{apiError(members.error)}</Alert>}

        <Alert tone="info">
          Your plan's label, price and limits are the API's own record of what it enforces. This build
          has no payment provider or invoice store connected, so no charge can be made from this screen.
        </Alert>

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
                  <Link to="/members" className="inline-flex">
                    <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sage-soft px-3.5 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                      <Icon name="group" className="text-[16px]" />
                      Manage seats
                    </span>
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
            <h2 className="text-headline-md text-on-surface">Compare plans</h2>
            <p className="text-body-sm text-muted">
              What each tier is for. The prices and limits above are the ones the API enforces for your
              own household; it does not publish a price list for the others.
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
                      isCurrent ? 'border-2 border-secondary shadow-e3' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-0.5">
                        <h3 className="text-headline-sm text-on-surface">{tier.label}</h3>
                        <span className="text-body-sm text-muted">{tier.tagline}</span>
                      </div>
                      {isCurrent && <Badge tone="primary">Current plan</Badge>}
                    </div>

                    <Button
                      variant={isCurrent ? 'soft' : 'outline'}
                      disabled
                      className="mt-auto w-full"
                      title="No billing provider is connected in this build"
                    >
                      {isCurrent ? 'Currently active' : 'Contact billing concierge'}
                    </Button>
                  </Card>
                );
              })}
          </div>
        </section>

        {/* ------------------------- not-yet-implemented areas ----------------------- */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-muted">
                <Icon name="payment" className="text-[20px]" />
              </span>
              <div className="flex flex-col">
                <h2 className="text-headline-sm text-on-surface">Payment methods</h2>
                <span className="text-body-sm text-muted">Not yet available</span>
              </div>
            </div>
            <p className="mt-3 text-body-md text-muted">
              No payment provider is wired up, so no card can be stored or charged. Adding one means a
              Stripe (or equivalent) integration on the API plus a webhook to reconcile status.
            </p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container-low text-muted">
                <Icon name="receipt_long" className="text-[20px]" />
              </span>
              <div className="flex flex-col">
                <h2 className="text-headline-sm text-on-surface">Invoices & receipts</h2>
                <span className="text-body-sm text-muted">Not yet available</span>
              </div>
            </div>
            <p className="mt-3 text-body-md text-muted">
              There is no invoice table in the database, so this list would be fabricated. It appears
              once subscriptions are recorded server-side.
            </p>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
