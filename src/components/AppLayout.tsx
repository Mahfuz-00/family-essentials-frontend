import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from '@tanstack/react-router';

export const AppLayoutContext = createContext<boolean>(false);
import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { api } from '@/lib/api';
import { resetSession } from '@/lib/session';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useUiStore } from '@/stores/ui';
import type { PlatformNotificationsResponse } from '@/types';

type RoutePath =
  | '/'
  | '/dashboard'
  | '/app'
  | '/requests'
  | '/requests/escalation'
  | '/recurring'
  | '/pantry'
  | '/places'
  | '/places/console'
  | '/members'
  | '/members/roles'
  | '/members/invitations'
  | '/money'
  | '/finances/overview'
  | '/finances/goals'
  | '/finances/liabilities'
  | '/finances/assets'
  | '/finances/taxes'
  | '/finances/recurring'
  | '/billing'
  | '/settings'
  | '/feedback'
  | '/admin'
  | '/admin/analytics'
  | '/admin/tenants'
  | '/admin/billing'
  | '/admin/payment-gateways'
  | '/admin/email-config'
  | '/admin/refunds'
  | '/admin/health'
  | '/admin/backups'
  | '/admin/marketing'
  | '/admin/settings'
  | '/admin/profile'
  | '/admin/feedback'
  | '/admin/audit-logs';

interface NavItem {
  to: RoutePath;
  label: string;
  icon: string;
  exact?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const householdSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { to: '/dashboard', label: 'Summary & Overview', icon: 'dashboard', exact: true },
    ],
  },
  {
    title: 'Household Activities',
    items: [
      { to: '/app', label: 'Activities Hub', icon: 'cottage', exact: true },
      { to: '/requests', label: 'Requests & Errands', icon: 'view_kanban', exact: true },
      { to: '/pantry', label: 'Pantry & Grocery', icon: 'kitchen', exact: true },
      { to: '/requests/escalation', label: 'Escalation & Voice', icon: 'ring_volume', exact: true },
      { to: '/recurring', label: 'Recurring Tasks & Chores', icon: 'autorenew', exact: true },
    ],
  },
  {
    title: 'Finances & Budget',
    items: [
      { to: '/money', label: 'Household Expense Overview', icon: 'account_balance_wallet', exact: false },
      { to: '/finances/overview', label: 'Household Financial Overview', icon: 'query_stats', exact: true },
      { to: '/finances/recurring', label: 'Recurring Expenses & Subscriptions', icon: 'payments', exact: true },
      { to: '/finances/goals', label: 'Financial Goals', icon: 'flag', exact: true },
      { to: '/finances/liabilities', label: 'Loans & Mortgages', icon: 'real_estate_agent', exact: true },
      { to: '/finances/assets', label: 'Savings & Investments', icon: 'trending_up', exact: true },
      { to: '/finances/taxes', label: 'Taxes & Deductions', icon: 'receipt_long', exact: true },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/members', label: 'Family Members', icon: 'group', exact: true },
      { to: '/members/roles', label: 'Roles & Permissions', icon: 'shield_person', exact: true },
      { to: '/members/invitations', label: 'Invitations', icon: 'mark_email_unread', exact: true },
    ],
  },
  {
    title: 'Household',
    items: [
      { to: '/places', label: 'Saved Places & Geofencing', icon: 'pin_drop', exact: false },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/billing', label: 'Billing & Invoices', icon: 'credit_card', exact: true },
      { to: '/settings', label: 'Settings', icon: 'tune', exact: true },
      { to: '/feedback', label: 'Help & Feedback', icon: 'forum', exact: true },
    ],
  },
];

const platformSections: NavSection[] = [
  {
    title: 'Platform Analytics & Households',
    items: [
      { to: '/admin', label: 'Overview & MRR', icon: 'monitoring', exact: true },
      { to: '/admin/analytics', label: 'Platform Analytics', icon: 'analytics', exact: true },
      { to: '/admin/tenants', label: 'Household Workspaces', icon: 'apartment', exact: true },
    ],
  },
  {
    title: 'System & Finance Controls',
    items: [
      { to: '/admin/settings', label: 'System Settings', icon: 'settings_suggest', exact: true },
      { to: '/admin/billing', label: 'Invoices & Settlements', icon: 'receipt_long', exact: true },
      { to: '/admin/payment-gateways', label: 'Payment Gateways', icon: 'payments', exact: true },
      { to: '/admin/refunds', label: 'Refund Policy & Requests', icon: 'currency_exchange', exact: true },
      { to: '/admin/email-config', label: 'Email Configuration', icon: 'mail', exact: true },
      { to: '/admin/health', label: 'System Health & Ops', icon: 'monitor_heart', exact: true },
      { to: '/admin/backups', label: 'Backups & Recovery', icon: 'cloud_sync', exact: true },
    ],
  },
  {
    title: 'Growth & Governance',
    items: [
      { to: '/admin/marketing', label: 'Marketing & Campaigns', icon: 'campaign', exact: true },
      { to: '/admin/profile', label: 'Admin Profile', icon: 'badge', exact: true },
      { to: '/admin/audit-logs', label: 'Audit & Security Logs', icon: 'verified_user', exact: true },
      { to: '/admin/feedback', label: 'Household Feedback', icon: 'forum', exact: true },
    ],
  },
];

const routeLabels: Record<string, string> = {
  '/': 'Welcome',
  '/dashboard': 'Dashboard',
  '/app': 'Dashboard',
  '/requests': 'Requests & Errands',
  '/pantry': 'Pantry & Grocery',
  '/requests/escalation': 'Escalation & Voice',
  '/recurring': 'Recurring',
  '/places': 'Saved Places',
  '/places/console': 'Geofence Console',
  '/members': 'Family Members',
  '/members/roles': 'Roles & Permissions',
  '/members/invitations': 'Invitations',
  '/money': 'Household Expense Overview',
  '/finances/overview': 'Household Financial Overview',
  '/finances/goals': 'Financial Goals',
  '/finances/liabilities': 'Loans & Mortgages',
  '/finances/assets': 'Savings & Investments',
  '/finances/taxes': 'Taxes & Deductions',
  '/billing': 'Billing & Subscription',
  '/settings': 'Settings',
  '/feedback': 'Help & Feedback',
  '/admin': 'Global Analytics Overview',
  '/admin/analytics': 'Platform Analytics',
  '/admin/tenants': 'Tenant Workspaces & Client Families',
  '/admin/billing': 'Invoices & Cash Settlements',
  '/admin/settings': 'System & Platform Settings',
  '/admin/profile': 'Admin Profile Management',
  '/admin/health': 'System Health',
  '/admin/backups': 'Backups & Disaster Recovery',
  '/admin/feedback': 'Feedback Inbox',
  '/admin/marketing': 'Marketing & Campaigns',
  '/admin/payment-gateways': 'Payment Gateways',
  '/admin/email-config': 'Email Configuration',
  '/admin/refunds': 'Refund Policy & Requests',
  '/admin/audit-logs': 'Global Audit & Security Log',
};

export function AppLayout({ children }: { children?: ReactNode }) {
  const isNested = useContext(AppLayoutContext);
  if (isNested) {
    return <>{children ?? <Outlet />}</>;
  }

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const memberships = useTenantStore((state) => state.memberships);
  const openAddRequest = useUiStore((state) => state.openAddRequest);
  const active = useTenantStore((state) => state.active);
  const switchTo = useTenantStore((state) => state.switchTo);

  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  const isPlatformAdmin = user?.is_platform_admin === true;

  const notificationsQuery = useQuery({
    queryKey: ['platform', 'notifications'],
    queryFn: async () => (await api.get<PlatformNotificationsResponse>('/v1/platform/notifications')).data,
    enabled: isPlatformAdmin,
    refetchInterval: 15000,
  });

  const pendingNotifCount = notificationsQuery.data?.total_pending ?? 0;
  const pendingCashCount = notificationsQuery.data?.pending_cash_count ?? 0;

  const location = useLocation();
  const path = location.pathname;
  const routeLabel =
    routeLabels[path] ??
    routeLabels[`/${path.split('/')[1] ?? ''}`] ??
    (path.startsWith('/admin') ? 'Platform Admin' : 'Household');

  const activeTenant = useTenantStore((state) => state.active);
  const isSubscriptionLocked =
    !isPlatformAdmin &&
    ((activeTenant?.status as string) === 'cancelled' || activeTenant?.status === 'suspended') &&
    path !== '/billing';

  // Keyboard close for mobile drawer and click outside for dropdowns
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
        setNotifDropdownOpen(false);
      }
    };

    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onClickOutside);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onClickOutside);
    };
  }, []);

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

  const sections = isPlatformAdmin ? platformSections : householdSections;

  return (
    <AppLayoutContext.Provider value={true}>
      <div className="min-h-full bg-canvas text-on-surface">
      {/* ------------------------------- Desktop Sidebar ------------------------------- */}
      <aside
        className={`fixed left-0 top-0 z-50 hidden h-full flex-col border-r border-outline-variant/30 bg-surface shadow-e1 transition-all duration-300 lg:flex ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Sticky Sidebar Header with Branding & Collapse Toggle */}
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-between border-b border-outline-variant/20 bg-surface px-4 py-3.5">
          {sidebarCollapsed ? (
            <div className="mx-auto flex flex-col items-center gap-2">
              <BrandLogo isPlatformAdmin={isPlatformAdmin} iconOnly />
              <button
                type="button"
                onClick={toggleSidebar}
                title="Expand sidebar"
                aria-label="Expand sidebar"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface active:scale-95"
              >
                <Icon name="chevron_right" className="text-[18px]" />
              </button>
            </div>
          ) : (
            <>
              <BrandLogo isPlatformAdmin={isPlatformAdmin} />
              <button
                type="button"
                onClick={toggleSidebar}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface active:scale-95"
              >
                <Icon name="chevron_left" className="text-[20px]" />
              </button>
            </>
          )}
        </div>

        {/* Scrollable Navigation Body */}
        <div className="flex-1 overflow-y-auto px-3 py-3">
          {sections.map((section) => (
            <nav key={section.title} className="flex flex-col gap-1 py-1">
              {!sidebarCollapsed && (
                <span className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  {section.title}
                </span>
              )}
              {sidebarCollapsed && <div className="my-1.5 border-t border-outline-variant/20" />}
              {section.items.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  title={sidebarCollapsed ? item.label : undefined}
                  activeOptions={{ exact: item.exact ?? false }}
                  className={`flex items-center rounded-xl transition-all hover:bg-sage-soft hover:text-on-surface ${
                    sidebarCollapsed
                      ? 'h-11 w-full justify-center text-on-surface-variant'
                      : 'gap-3 px-3.5 py-2 text-sm font-medium text-on-surface-variant'
                  }`}
                  activeProps={{
                    className: `flex items-center rounded-xl bg-primary-container text-on-primary-container shadow-xs font-bold ${
                      sidebarCollapsed
                        ? 'h-11 w-full justify-center'
                        : 'gap-3 px-3.5 py-2 text-sm'
                    }`,
                  }}
                >
                  <Icon name={item.icon} className="text-[20px] shrink-0" />
                  {!sidebarCollapsed && <span className="truncate flex-1">{item.label}</span>}
                  {!sidebarCollapsed && item.to === '/admin/billing' && pendingCashCount > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-xs">
                      {pendingCashCount}
                    </span>
                  )}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        {/* Sticky Sidebar Footer with Profile & Sign Out */}
        <div className="sticky bottom-0 z-20 flex shrink-0 flex-col border-t border-outline-variant/20 bg-surface p-3">
          {sidebarCollapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Avatar name={user?.name ?? 'User'} />
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-danger active:scale-95"
              >
                <Icon name="logout" className="text-[18px]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-2.5">
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary shadow-xs">
                  <Icon name="person" className="text-[18px]" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-label-lg font-semibold leading-snug text-on-surface">
                    {user?.name}
                  </span>
                  <span className="truncate text-label-sm leading-tight text-muted">
                    {isPlatformAdmin ? 'Platform Admin' : 'Household member'}
                  </span>
                </span>
              </span>
              <button
                type="button"
                onClick={signOut}
                title="Sign out"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-danger active:scale-95"
              >
                <Icon name="logout" className="text-[18px]" />
                <span className="sr-only">Sign out</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ------------------------------- Mobile Drawer ------------------------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div
            className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="relative z-50 flex h-full w-72 max-w-[85vw] flex-col justify-between border-r border-outline-variant/30 bg-surface shadow-e4">
            <div className="sticky top-0 z-20 flex items-center justify-between border-b border-outline-variant/20 bg-surface px-5 py-4">
              <BrandLogo isPlatformAdmin={isPlatformAdmin} />
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-on-surface-variant hover:bg-sage-soft"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3">
              {sections.map((section) => (
                <nav key={section.title} className="flex flex-col gap-1 py-1.5">
                  <span className="px-3 py-1 text-label-sm font-bold uppercase tracking-wider text-muted">
                    {section.title}
                  </span>
                  {section.items.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      activeOptions={{ exact: item.exact ?? false }}
                      className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-on-surface-variant transition-all hover:bg-sage-soft hover:text-on-surface"
                      activeProps={{
                        className:
                          'flex items-center gap-3 rounded-xl bg-primary-container px-3.5 py-2.5 text-sm font-bold text-on-primary-container',
                      }}
                    >
                      <Icon name={item.icon} className="text-[20px]" />
                      <span className="flex-1">{item.label}</span>
                      {item.to === '/admin/billing' && pendingCashCount > 0 && (
                        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white shadow-xs">
                          {pendingCashCount}
                        </span>
                      )}
                    </Link>
                  ))}
                </nav>
              ))}
            </div>

            <div className="sticky bottom-0 z-20 flex flex-col border-t border-outline-variant/30 bg-surface p-4">
              <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-container-low p-2.5">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary">
                    <Icon name="person" className="text-[18px]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold leading-snug text-on-surface">
                      {user?.name}
                    </span>
                    <span className="truncate text-xs text-muted">
                      {isPlatformAdmin ? 'Platform Admin' : 'Household member'}
                    </span>
                  </span>
                </span>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-sage-soft"
                >
                  <Icon name="logout" className="text-[18px]" />
                  <span className="sr-only">Sign out</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------- Header & Main ------------------------------- */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
        <header className="sticky top-0 z-40 flex h-16 sm:h-18 items-center justify-between gap-4 border-b border-outline-variant/20 bg-surface/90 px-4 shadow-e1 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-surface-container-low text-on-surface-variant transition-colors hover:bg-sage-soft hover:text-on-surface active:scale-95 lg:hidden"
            >
              <Icon name="menu" className="text-[20px]" />
            </button>

            <div className="flex min-w-0 flex-col justify-center">
              <div className="flex items-center gap-1.5 text-xs text-muted leading-tight">
                <Link to={isPlatformAdmin ? '/admin' : '/dashboard'} className="transition-colors hover:text-on-surface">
                  {isPlatformAdmin ? 'Platform' : 'Pages'}
                </Link>
                <span>/</span>
                <span className="font-medium text-on-surface">{routeLabel}</span>
              </div>
              <span className="truncate text-base sm:text-lg font-bold leading-tight text-on-surface">
                {routeLabel}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            {/* Household switcher */}
            {!isPlatformAdmin && memberships.length > 1 && (
              <label className="flex items-center">
                <span className="sr-only">Active household</span>
                <select
                  value={active?.id ?? ''}
                  onChange={onSwitch}
                  className="h-9 cursor-pointer rounded-xl border border-outline-variant/40 bg-canvas px-3 text-label-md text-on-surface outline-none transition-colors hover:border-outline focus:ring-2 focus:ring-primary/40"
                >
                  {memberships.map((membership) => (
                    <option key={membership.tenant.id} value={membership.tenant.id}>
                      {membership.tenant.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {!isPlatformAdmin && (
              <button
                type="button"
                onClick={startAddRequest}
                className="sr-only"
                aria-label="Add Request"
              >
                Add Request
              </button>
            )}

            {/* Platform Admin Notification Bell */}
            {isPlatformAdmin && (
              <div className="relative" ref={notifDropdownRef}>
                <button
                  type="button"
                  onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                  aria-label="Platform Notifications"
                  aria-expanded={notifDropdownOpen}
                  className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface text-on-surface transition-colors hover:bg-sage-soft active:scale-95"
                >
                  <Icon name="notifications" className="text-[20px]" />
                  {pendingNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white shadow-xs">
                      {pendingNotifCount}
                    </span>
                  )}
                </button>

                {notifDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-outline-variant/30 bg-surface p-3 shadow-e3 z-50">
                    <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Icon name="notifications_active" className="text-[18px] text-secondary" />
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                          Admin Action Items
                        </span>
                      </div>
                      <Badge tone={pendingNotifCount > 0 ? 'warning' : 'neutral'}>
                        {pendingNotifCount} Pending
                      </Badge>
                    </div>

                    <div className="flex flex-col gap-2 max-h-72 overflow-y-auto">
                      {/* Cash Settlements */}
                      {(notificationsQuery.data?.cash_settlements ?? []).map((cs) => (
                        <div
                          key={`cs-${cs.id}`}
                          className="flex flex-col gap-1.5 rounded-xl border border-amber-300 bg-amber-50/70 dark:border-amber-900/40 dark:bg-amber-950/30 p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface flex items-center gap-1">
                              <Icon name="payments" className="text-[14px] text-amber-600" />
                              {cs.tenant?.name ?? `Household #${cs.tenant_id}`}
                            </span>
                            <Badge tone="warning">Pending Cash</Badge>
                          </div>
                          <p className="text-[11px] text-muted">
                            Requested <strong>{cs.tier}</strong> plan (${(cs.amount_cents / 100).toFixed(2)}). Awaiting in-person cash collection.
                          </p>
                          <div className="flex justify-end pt-1">
                            <Link
                              to="/admin/billing"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="inline-flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1 text-[11px] font-semibold text-on-secondary hover:bg-primary transition-colors"
                            >
                              <Icon name="check_circle" className="text-[12px]" />
                              Review &amp; Approve
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* Refund Requests */}
                      {(notificationsQuery.data?.refund_requests ?? []).map((rr) => (
                        <div
                          key={`rr-${rr.id}`}
                          className="flex flex-col gap-1.5 rounded-xl border border-outline-variant/40 bg-surface-container-low p-2.5 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-on-surface">{rr.tenant_name}</span>
                            <Badge tone="neutral">Refund Request</Badge>
                          </div>
                          <p className="text-[11px] text-muted">
                            ${(rr.amount_cents / 100).toFixed(2)} refund requested: &ldquo;{rr.reason}&rdquo;
                          </p>
                          <div className="flex justify-end pt-1">
                            <Link
                              to="/admin/refunds"
                              onClick={() => setNotifDropdownOpen(false)}
                              className="text-[11px] font-semibold text-secondary hover:underline"
                            >
                              Review Refund &rarr;
                            </Link>
                          </div>
                        </div>
                      ))}

                      {pendingNotifCount === 0 && (
                        <div className="py-6 text-center text-muted">
                          <Icon name="done_all" className="mx-auto text-[24px] text-secondary opacity-60 mb-1" />
                          <p className="text-xs font-medium">All caught up!</p>
                          <p className="text-[11px]">No pending cash settlements or refund requests.</p>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-outline-variant/20 pt-2 mt-2 text-center">
                      <Link
                        to="/admin/billing"
                        onClick={() => setNotifDropdownOpen(false)}
                        className="text-xs font-semibold text-secondary hover:underline"
                      >
                        View Full Cash Settlement Queue &rarr;
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Top Bar Profile Dropdown */}
            <div className="relative border-l border-outline-variant/30 pl-2.5 sm:pl-3" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-expanded={profileDropdownOpen}
                aria-haspopup="true"
                className="flex items-center gap-2 rounded-xl p-1 transition-colors hover:bg-sage-soft active:scale-95"
              >
                <Avatar name={user?.name ?? 'User'} />
                <span className="hidden text-body-sm font-medium text-on-surface xl:inline max-w-[120px] truncate">
                  {user?.name}
                </span>
                <Icon
                  name="expand_more"
                  className={`text-[18px] text-muted transition-transform duration-200 ${
                    profileDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-outline-variant/30 bg-surface p-2 shadow-e3 z-50">
                  <div className="flex flex-col px-3 py-2 border-b border-outline-variant/20">
                    <span className="truncate text-sm font-bold text-on-surface">{user?.name}</span>
                    <span className="truncate text-xs text-muted">{user?.email}</span>
                    <div className="mt-1.5">
                      <Badge tone={isPlatformAdmin ? 'primary' : 'neutral'}>
                        {isPlatformAdmin ? 'Platform Admin' : 'Household Member'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 py-1.5">
                    {isPlatformAdmin ? (
                      <>
                        <Link
                          to="/admin/profile"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                        >
                          <Icon name="badge" className="text-[18px] text-secondary" />
                          <span>Admin Profile</span>
                        </Link>
                        <Link
                          to="/admin/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                        >
                          <Icon name="settings_suggest" className="text-[18px] text-secondary" />
                          <span>System Settings</span>
                        </Link>
                        <Link
                          to="/admin/analytics"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                        >
                          <Icon name="analytics" className="text-[18px] text-secondary" />
                          <span>Analytics Console</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/settings"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                        >
                          <Icon name="person" className="text-[18px] text-secondary" />
                          <span>Profile &amp; Settings</span>
                        </Link>
                        <Link
                          to="/billing"
                          onClick={() => setProfileDropdownOpen(false)}
                          className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                        >
                          <Icon name="credit_card" className="text-[18px] text-secondary" />
                          <span>Billing &amp; Invoices</span>
                        </Link>
                      </>
                    )}

                    <Link
                      to={isPlatformAdmin ? '/admin/feedback' : '/feedback'}
                      onClick={() => setProfileDropdownOpen(false)}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-on-surface transition-colors hover:bg-sage-soft"
                    >
                      <Icon name="forum" className="text-[18px] text-secondary" />
                      <span>Support &amp; Feedback</span>
                    </Link>
                  </div>

                  <div className="border-t border-outline-variant/20 pt-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        void signOut();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <Icon name="logout" className="text-[18px]" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="w-full px-4 py-6 sm:px-6">{children ?? <Outlet />}</main>
      </div>

      {/* Subscription Lockout Modal (Point 23) */}
      <Modal
        open={isSubscriptionLocked}
        onClose={() => {}}
        title="Active Subscription Required"
        description="Your household subscription has expired or was cancelled."
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="outline" onClick={signOut}>
              Sign Out
            </Button>
            <Button
              variant="primary"
              onClick={() => void navigate({ to: '/billing' })}
            >
              Go to Billing &amp; Subscriptions
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3 p-1 text-xs">
          <p className="text-on-surface">
            All household features, activity tracking, budget tools, and members access are locked until an active subscription plan is chosen.
          </p>
          <div className="rounded-xl bg-forest-soft p-3 text-secondary font-semibold border border-secondary/20">
            Please reactivate or select a plan on the Billing page to restore full household access.
          </div>
        </div>
      </Modal>
    </div>
    </AppLayoutContext.Provider>
  );
}
