import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { resetSession } from '@/lib/session';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import { useUiStore } from '@/stores/ui';

type RoutePath =
  | '/'
  | '/dashboard'
  | '/app'
  | '/requests'
  | '/requests/escalation'
  | '/recurring'
  | '/places'
  | '/places/console'
  | '/members'
  | '/members/roles'
  | '/members/invitations'
  | '/money'
  | '/billing'
  | '/settings'
  | '/feedback'
  | '/admin'
  | '/admin/analytics'
  | '/admin/tenants'
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
    title: 'Today',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'cottage', exact: true },
      { to: '/requests', label: 'Requests & Errands', icon: 'view_kanban', exact: true },
      { to: '/requests/escalation', label: 'Escalation & Voice', icon: 'ring_volume', exact: true },
      { to: '/recurring', label: 'Recurring', icon: 'event_repeat', exact: true },
    ],
  },
  {
    title: 'Household',
    items: [
      { to: '/places', label: 'Saved Places', icon: 'pin_drop', exact: true },
      { to: '/places/console', label: 'Geofence Console', icon: 'map', exact: true },
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
    title: 'Account',
    items: [
      { to: '/money', label: 'Money', icon: 'account_balance_wallet', exact: true },
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
  '/requests/escalation': 'Escalation & Voice',
  '/recurring': 'Recurring',
  '/places': 'Saved Places',
  '/places/console': 'Geofence Console',
  '/members': 'Family Members',
  '/members/roles': 'Roles & Permissions',
  '/members/invitations': 'Invitations',
  '/money': 'Money',
  '/billing': 'Billing & Subscription',
  '/settings': 'Settings',
  '/feedback': 'Help & Feedback',
  '/admin': 'Global Analytics Overview',
  '/admin/analytics': 'Platform Analytics',
  '/admin/tenants': 'Tenant Workspaces & Client Families',
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

export function AppLayout({ children }: { children: ReactNode }) {
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isPlatformAdmin = user?.is_platform_admin === true;

  const location = useLocation();
  const path = location.pathname;
  const routeLabel =
    routeLabels[path] ??
    routeLabels[`/${path.split('/')[1] ?? ''}`] ??
    (path.startsWith('/admin') ? 'Platform Admin' : 'Household');

  // Keyboard close for mobile drawer and click outside for profile dropdown
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setProfileDropdownOpen(false);
      }
    };

    const onClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
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
          {/* Scope indicator */}
          <div className="mb-2">
            {sidebarCollapsed ? (
              <div
                title={isPlatformAdmin ? 'Scope: All tenants' : `Active: ${active?.name ?? 'None'}`}
                className="flex h-10 w-full items-center justify-center rounded-xl bg-surface-container-low transition-colors hover:bg-sage-soft"
              >
                <span className="h-2.5 w-2.5 rounded-full bg-secondary" />
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-3.5 py-2 transition-colors hover:bg-sage-soft/70">
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
                      {isPlatformAdmin ? 'Scope' : 'Active Household'}
                    </span>
                    <span className="truncate text-label-sm font-semibold text-on-surface">
                      {isPlatformAdmin ? 'All tenants' : (active?.name ?? 'None selected')}
                    </span>
                  </span>
                </span>
                {!isPlatformAdmin && (
                  <Icon name="unfold_more" className="text-[16px] text-on-surface-variant" />
                )}
              </div>
            )}
          </div>

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
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
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
              <div className="mb-2">
                <div className="flex items-center justify-between rounded-xl bg-surface-container-low px-4 py-2.5">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-secondary" />
                    <span className="flex min-w-0 flex-col">
                      <span className="text-label-sm uppercase tracking-wider text-muted">
                        {isPlatformAdmin ? 'Scope' : 'Active Household'}
                      </span>
                      <span className="truncate text-label-lg font-semibold text-on-surface">
                        {isPlatformAdmin ? 'All tenants' : (active?.name ?? 'None selected')}
                      </span>
                    </span>
                  </span>
                </div>
              </div>

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
                      <span>{item.label}</span>
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
            {/* Search Bar */}
            <div className="relative hidden md:flex items-center">
              <span className="pointer-events-none absolute left-3 flex items-center text-muted">
                <Icon name="search" className="text-[18px]" />
              </span>
              <input
                type="text"
                placeholder="Type here..."
                aria-label="Search"
                className="h-9 w-44 lg:w-56 rounded-xl border border-outline-variant/40 bg-canvas pl-9 pr-3 text-xs sm:text-sm text-on-surface placeholder:text-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 transition-all"
              />
            </div>

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
                className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-secondary px-3.5 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary active:scale-[0.97] sm:px-4"
              >
                <Icon name="add" className="text-[18px]" />
                <span className="inline">Add Request</span>
              </button>
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

        <main className="w-full px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
