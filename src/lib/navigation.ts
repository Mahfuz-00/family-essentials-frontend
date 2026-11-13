/**
 * Sidebar navigation and route labels, shared by the layout and the
 * breadcrumb trail so the two can never disagree about a page's name.
 */

export type RoutePath =
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

export interface NavItem {
  to: RoutePath;
  label: string;
  icon: string;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export const householdSections: NavSection[] = [
  {
    title: 'Dashboard',
    items: [
      { to: '/dashboard', label: 'Household Overview', icon: 'dashboard', exact: true },
    ],
  },
  {
    title: 'Household Activities',
    items: [
      { to: '/app', label: 'Activities Hub', icon: 'cottage', exact: true },
      { to: '/requests', label: 'Tasks & Errands', icon: 'view_kanban', exact: true },
      { to: '/pantry', label: 'Pantry Inventory', icon: 'kitchen', exact: true },
      { to: '/requests/escalation', label: 'Voice Escalations', icon: 'ring_volume', exact: true },
      { to: '/recurring', label: 'Recurring Tasks', icon: 'autorenew', exact: true },
    ],
  },
  {
    title: 'Daily Finances',
    items: [
      { to: '/money', label: 'Expenses & Money', icon: 'account_balance_wallet', exact: false },
      { to: '/finances/recurring', label: 'Recurring Bills', icon: 'payments', exact: true },
      { to: '/finances/goals', label: 'Savings Goals', icon: 'flag', exact: true },
    ],
  },
  {
    title: 'Wealth & Assets',
    items: [
      { to: '/finances/overview', label: 'Financial Health', icon: 'query_stats', exact: true },
      { to: '/finances/assets', label: 'Assets & Funds', icon: 'trending_up', exact: true },
      { to: '/finances/liabilities', label: 'Loans & Mortgages', icon: 'real_estate_agent', exact: true },
      { to: '/finances/taxes', label: 'Taxes & Filings', icon: 'receipt_long', exact: true },
    ],
  },
  {
    title: 'People',
    items: [
      { to: '/members', label: 'Family Members', icon: 'group', exact: true },
      { to: '/members/roles', label: 'Roles & Access', icon: 'shield_person', exact: true },
      { to: '/members/invitations', label: 'Invitations', icon: 'mark_email_unread', exact: true },
    ],
  },
  {
    title: 'Household',
    items: [
      { to: '/places', label: 'Places & Geofences', icon: 'pin_drop', exact: false },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/billing', label: 'Billing & Plans', icon: 'credit_card', exact: true },
      { to: '/settings', label: 'Settings', icon: 'tune', exact: true },
      { to: '/feedback', label: 'Help & Feedback', icon: 'forum', exact: true },
    ],
  },
];

export const platformSections: NavSection[] = [
  {
    title: 'Platform Analytics',
    items: [
      { to: '/admin', label: 'Overview & MRR', icon: 'monitoring', exact: true },
      { to: '/admin/analytics', label: 'Platform Analytics', icon: 'analytics', exact: true },
      { to: '/admin/tenants', label: 'Workspaces', icon: 'apartment', exact: true },
    ],
  },
  {
    title: 'System & Finance',
    items: [
      { to: '/admin/settings', label: 'System Settings', icon: 'settings_suggest', exact: true },
      { to: '/admin/billing', label: 'Invoices', icon: 'receipt_long', exact: true },
      { to: '/admin/payment-gateways', label: 'Gateways', icon: 'payments', exact: true },
      { to: '/admin/refunds', label: 'Refunds', icon: 'currency_exchange', exact: true },
      { to: '/admin/email-config', label: 'Email Setup', icon: 'mail', exact: true },
      { to: '/admin/health', label: 'System Health', icon: 'monitor_heart', exact: true },
      { to: '/admin/backups', label: 'Backups', icon: 'cloud_sync', exact: true },
    ],
  },
  {
    title: 'Governance',
    items: [
      { to: '/admin/marketing', label: 'Marketing', icon: 'campaign', exact: true },
      { to: '/admin/profile', label: 'Admin Profile', icon: 'badge', exact: true },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'verified_user', exact: true },
      { to: '/admin/feedback', label: 'User Feedback', icon: 'forum', exact: true },
    ],
  },
];

export const routeLabels: Record<string, string> = {
  '/': 'Welcome',
  '/dashboard': 'Household Overview',
  '/app': 'Activities Hub',
  '/requests': 'Tasks & Errands',
  '/pantry': 'Pantry Inventory',
  '/requests/escalation': 'Voice Escalations',
  '/recurring': 'Recurring Tasks',
  '/places': 'Places & Geofences',
  '/places/console': 'Places & Geofences',
  '/members': 'Family Members',
  '/members/roles': 'Roles & Access',
  '/members/invitations': 'Invitations',
  '/money': 'Expenses & Money',
  '/finances/recurring': 'Recurring Bills',
  '/finances/overview': 'Financial Health',
  '/finances/goals': 'Savings Goals',
  '/finances/liabilities': 'Loans & Mortgages',
  '/finances/assets': 'Assets & Funds',
  '/finances/taxes': 'Taxes & Filings',
  '/billing': 'Billing & Plans',
  '/settings': 'Settings',
  '/feedback': 'Help & Feedback',
  '/admin': 'Overview & MRR',
  '/admin/analytics': 'Platform Analytics',
  '/admin/tenants': 'Workspaces',
  '/admin/billing': 'Invoices',
  '/admin/settings': 'System Settings',
  '/admin/profile': 'Admin Profile',
  '/admin/health': 'System Health',
  '/admin/backups': 'Backups',
  '/admin/feedback': 'User Feedback',
  '/admin/marketing': 'Marketing',
  '/admin/payment-gateways': 'Gateways',
  '/admin/email-config': 'Email Setup',
  '/admin/refunds': 'Refunds',
  '/admin/audit-logs': 'Audit Logs',
};

/**
 * Build a trail from the current path: root → nav section → page.
 * Unknown paths fall back to the nearest known label.
 */
export function breadcrumbForPath(pathname: string): string[] {
  const isPlatform = pathname.startsWith('/admin');
  const sections = isPlatform ? platformSections : householdSections;
  const rootLabel = isPlatform ? 'Platform' : 'Dashboard';
  const rootPath = isPlatform ? '/admin' : '/dashboard';

  const match = sections
    .flatMap((section) => section.items.map((item) => ({ ...item, section: section.title })))
    .filter((item) => item.to === pathname || pathname.startsWith(`${item.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0];

  if (match) {
    return match.to === rootPath
      ? [rootLabel, match.label]
      : [rootLabel, match.section, match.label];
  }

  const fallback =
    routeLabels[pathname] ??
    routeLabels[`/${pathname.split('/')[1] ?? ''}`] ??
    (isPlatform ? 'Platform Admin' : 'Household');

  return [rootLabel, fallback];
}
