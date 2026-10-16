import type { ReactNode } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { planFor } from '@/lib/plans';
import { resetSession } from '@/lib/session';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useUiStore } from '@/stores/ui';

interface NavItem {
  to: '/' | '/requests' | '/places' | '/members' | '/billing' | '/admin' | '/admin/tenants' | '/admin/audit-logs';
  label: string;
  icon: string;
  exact?: boolean;
}

const householdNav: NavItem[] = [
  { to: '/', label: 'Dashboard / Kanban', icon: 'view_kanban', exact: true },
  { to: '/requests', label: 'Requests & Errands', icon: 'shopping_bag' },
  { to: '/places', label: 'Saved Places & Geofences', icon: 'pin_drop' },
  { to: '/members', label: 'Family Members', icon: 'group' },
  { to: '/billing', label: 'Billing & Subscription', icon: 'credit_card' },
];

const platformNav: NavItem[] = [
  { to: '/admin', label: 'Overview / Analytics', icon: 'analytics', exact: true },
  { to: '/admin/tenants', label: 'Tenants & Workspaces', icon: 'apartment' },
  { to: '/admin/audit-logs', label: 'Audit & Security Logs', icon: 'verified_user' },
];

const routeLabels: Record<string, string> = {
  '/': 'Household Kanban Overview',
  '/requests': 'Requests & Errands',
  '/places': 'Saved Places & Geofences',
  '/members': 'Family Members & Roles',
  '/billing': 'Billing & Subscription',
  '/admin': 'Global Analytics Overview',
  '/admin/tenants': 'Tenant Workspaces & Client Families',
  '/admin/audit-logs': 'Global Audit & Security Log',
};

function greeting(): string {
  const hour = new Date().getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 18) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const memberships = useTenantStore((state) => state.memberships);
  const openAddRequest = useUiStore((state) => state.openAddRequest);
  const active = useTenantStore((state) => state.active);
  const switchTo = useTenantStore((state) => state.switchTo);

  const isPlatformAdmin = user?.is_platform_admin === true;
  const plan = planFor(active?.subscription_tier);
  const seatsUsed = active?.member_count ?? 0;

  const path = window.location.pathname;
  const routeLabel = routeLabels[path] ?? (path.startsWith('/admin') ? 'Platform Admin' : 'Household');

  /**
   * The create modal lives on the requests page, so record the intent then make
   * sure we are there. As a plain link this was a no-op when clicked from
   * /requests itself, which is why "Add Request" appeared to do nothing.
   */
  const startAddRequest = () => {
    openAddRequest();

    if (path !== '/requests') {
      void navigate({ to: '/requests' });
    }
  };

  const signOut = async () => {
    try {
      await api.post('/v1/auth/logout');
    } catch {
      // Token may already be invalid; the local session is cleared regardless.
    }

    resetSession();
    await navigate({ to: '/login' });
  };

  const onSwitch = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    await switchTo(Number(event.target.value));
  };

  return (
    <div className="min-h-full bg-canvas">
      {/* ------------------------------- sidebar ------------------------------- */}
      <aside className="fixed left-0 top-0 z-50 hidden h-full w-72 flex-col justify-between bg-surface shadow-e1 lg:flex">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sage-soft text-primary">
              <Icon name={isPlatformAdmin ? 'shield' : 'cottage'} className="text-[20px]" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-headline-sm font-bold leading-tight text-on-surface">
                Family Essentials
              </span>
              <span className="truncate text-label-sm text-muted">
                {isPlatformAdmin ? 'Landlord Platform' : 'Household Logistics'}
              </span>
            </span>
          </div>

          {/* Active household selector — supplanted by the header dropdown. */}
          <div className="px-4 pb-2">
            <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-label-sm leading-none text-muted">
                    {isPlatformAdmin ? 'Landlord scope' : 'Active Household'}
                  </span>
                  <span className="truncate text-label-lg leading-snug text-on-surface">
                    {isPlatformAdmin ? 'All tenants' : (active?.name ?? 'None selected')}
                  </span>
                </span>
              </span>
              <Icon name="unfold_more" className="text-[18px] text-on-surface-variant" />
            </div>
          </div>

          <nav className="flex flex-col gap-1 px-4 py-1">
            {(isPlatformAdmin ? platformNav : householdNav).map((item) => (
              <Link
                key={item.label}
                to={item.to}
                activeOptions={{ exact: item.exact ?? false }}
                className="flex items-center gap-4 rounded-xl px-4 py-2 text-body-md text-on-surface-variant transition-all hover:bg-sage-soft hover:text-on-surface"
                activeProps={{
                  className:
                    'flex items-center gap-4 rounded-xl bg-primary-container px-4 py-2 text-headline-sm font-bold text-on-primary-container',
                }}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 p-4">
          {isPlatformAdmin ? (
            <div className="rounded-xl bg-forest-soft/60 p-4">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success" />
                <span className="text-label-md font-bold text-secondary">Isolation enforced</span>
              </span>
              <p className="mt-1.5 text-label-sm text-on-surface-variant">
                Row-level security active across every tenant schema.
              </p>
            </div>
          ) : (
            active && (
              <div className="rounded-xl bg-forest-soft p-4">
                <span className="mb-1 flex items-center justify-between">
                  <span className="text-label-sm font-bold text-secondary">{plan.label}</span>
                  <span className="text-label-sm text-on-surface-variant">
                    {seatsUsed}/{plan.seatCap} Members
                  </span>
                </span>
                <span className="block h-1.5 w-full overflow-hidden rounded-full bg-surface-container">
                  <span
                    className="block h-1.5 rounded-full bg-secondary transition-all"
                    style={{ width: `${Math.min(100, (seatsUsed / plan.seatCap) * 100)}%` }}
                  />
                </span>
              </div>
            )
          )}

          <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-2">
            <span className="flex min-w-0 items-center gap-2">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                <Icon name="person" className="text-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-label-lg leading-snug text-on-surface">{user?.name}</span>
                <span className="truncate text-label-sm leading-tight text-muted">
                  {isPlatformAdmin ? 'Platform Admin' : 'Tenant Admin'}
                </span>
              </span>
            </span>
            <button
              type="button"
              onClick={signOut}
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface"
            >
              <Icon name="logout" className="text-[18px]" />
              <span className="sr-only">Sign out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* -------------------------------- header ------------------------------- */}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 bg-surface/80 px-6 shadow-e1 backdrop-blur-xl">
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-headline-sm font-semibold leading-tight text-on-surface">
              {greeting()}, {user?.name?.split(' ')[0]}
            </span>
            <span className="truncate text-label-sm text-muted">
              {isPlatformAdmin ? 'Platform Admin' : 'Family Workspace'} · {routeLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {active && !isPlatformAdmin && <Badge tone="success">{active.status}</Badge>}

            {memberships.length > 1 && (
              <label className="flex items-center">
                <span className="sr-only">Active household</span>
                <select
                  value={active?.id ?? ''}
                  onChange={onSwitch}
                  className="h-9 cursor-pointer rounded-xl bg-canvas px-3 text-label-md text-on-surface outline-none shadow-inner focus:ring-2 focus:ring-primary/40"
                >
                  {memberships.map((membership) => (
                    <option key={membership.tenant.id} value={membership.tenant.id}>
                      {membership.tenant.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <span className="hidden items-center gap-1.5 rounded-full bg-sage-soft px-2 py-1 text-label-sm text-secondary md:inline-flex">
              <Icon name="palette" className="text-[14px]" />
              Warm Sage
            </span>

            {!isPlatformAdmin && (
              <button
                type="button"
                onClick={startAddRequest}
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary active:scale-[0.97]"
              >
                <Icon name="add" className="text-[18px]" />
                Add Request
              </button>
            )}

            <span className="flex items-center gap-2">
              <span className="hidden text-body-sm text-muted xl:inline">{user?.email}</span>
              <Avatar name={user?.name ?? 'User'} />
            </span>
          </div>
        </header>

        <main className="w-full px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
