import { Outlet, createRootRoute, createRoute, createRouter, redirect } from '@tanstack/react-router';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { BillingPage } from '@/pages/BillingPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { HomeOverviewPage } from '@/pages/HomeOverviewPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { MarketingPage } from '@/pages/MarketingPage';
import { AboutPage } from '@/pages/marketing/AboutPage';
import { ContactPage } from '@/pages/marketing/ContactPage';
import { FaqPage } from '@/pages/marketing/FaqPage';
import { FeatureDetailPage } from '@/pages/marketing/FeatureDetailPage';
import { FeaturesHubPage } from '@/pages/marketing/FeaturesHubPage';
import { PricingPage } from '@/pages/marketing/PricingPage';
import { SolutionDetailPage } from '@/pages/marketing/SolutionDetailPage';
import { SolutionsHubPage } from '@/pages/marketing/SolutionsHubPage';
import { PublicRefundPolicyPage } from '@/pages/marketing/PublicRefundPolicyPage';
import { MembersPage } from '@/pages/MembersPage';
import { MoneyPage } from '@/pages/MoneyPage';
import { PantryPage } from '@/pages/PantryPage';
import { PlacesPage } from '@/pages/PlacesPage';
import { RecurringPage } from '@/pages/RecurringPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RequestsPage } from '@/pages/RequestsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { VerifyPhonePage } from '@/pages/VerifyPhonePage';
import { InvitationsPage } from '@/pages/members/InvitationsPage';
import { RolesPage } from '@/pages/members/RolesPage';
import { LedgerPage } from '@/pages/money/LedgerPage';
import { FinancesOverviewPage } from '@/pages/finances/FinancesOverviewPage';
import { GoalsPage } from '@/pages/finances/GoalsPage';
import { LiabilitiesPage } from '@/pages/finances/LiabilitiesPage';
import { AssetsPage } from '@/pages/finances/AssetsPage';
import { TaxesPage } from '@/pages/finances/TaxesPage';
import { RecurringExpensesPage } from '@/pages/finances/RecurringExpensesPage';
import { EscalationPage } from '@/pages/requests/EscalationPage';
import { AdminBillingPage } from '@/pages/admin/AdminBillingPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { BackupsPage } from '@/pages/admin/BackupsPage';
import { EmailConfigPage } from '@/pages/admin/EmailConfigPage';
import { PlatformFeedbackPage } from '@/pages/admin/FeedbackInboxPage';
import { HealthPage } from '@/pages/admin/HealthPage';
import { PaymentGatewayConfigPage } from '@/pages/admin/PaymentGatewayConfigPage';
import { PlatformAnalyticsPage } from '@/pages/admin/PlatformAnalyticsPage';
import { RefundPolicyPage } from '@/pages/admin/RefundPolicyPage';
import { TenantsPage } from '@/pages/admin/TenantsPage';
import { TenantDetailPage } from '@/pages/admin/TenantDetailPage';
import { MarketingPage as AdminMarketingPage } from '@/pages/admin/MarketingPage';
import { AdminProfilePage } from '@/pages/admin/AdminProfilePage';
import { AdminSystemSettingsPage } from '@/pages/admin/AdminSystemSettingsPage';
import { requireAuth, requirePlatformAdmin, requireTenant } from '@/lib/guards';
import { AppLayout } from '@/components/AppLayout';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

/**
 * Pathless shell for every authenticated screen. AppLayout (sidebar + top bar)
 * mounts here once and persists across navigation; only the body swaps. Pages
 * still wrap themselves in <AppLayout>, which passes straight through when
 * nested inside this shell.
 */
const appShellRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app-shell',
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

// The public marketing website is served at the root '/'
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MarketingPage,
});

// The authenticated household dashboard is served at '/dashboard' (and aliased at '/app')
const dashboardRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/dashboard',
  beforeLoad: requireAuth,
  component: HomeOverviewPage,
});

const appRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/app',
  beforeLoad: requireAuth,
  component: DashboardPage,
});

const marketingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/landing',
  component: MarketingPage,
});

const welcomeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/welcome',
  component: MarketingPage,
});

const featuresHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features',
  component: FeaturesHubPage,
});

const featureDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/features/$slug',
  component: FeatureDetailPage,
});

const solutionsHubRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solutions',
  component: SolutionsHubPage,
});

const solutionDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/solutions/$slug',
  component: SolutionDetailPage,
});

const pricingMarketingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pricing',
  component: PricingPage,
});

const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});

const refundPolicyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/refund-policy',
  component: PublicRefundPolicyPage,
});

const faqRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/faq',
  component: FaqPage,
});

const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: ContactPage,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

const forgotPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/forgot-password',
  component: ForgotPasswordPage,
});

const resetPasswordRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reset-password',
  component: ResetPasswordPage,
});

const verifyEmailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-email',
  beforeLoad: requireAuth,
  component: VerifyEmailPage,
});

const verifyPhoneRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/verify-phone',
  beforeLoad: requireAuth,
  component: VerifyPhonePage,
});

const membersRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/members',
  beforeLoad: requireTenant,
  component: MembersPage,
});

const membersRolesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/members/roles',
  beforeLoad: requireTenant,
  component: RolesPage,
});

const membersInvitationsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/members/invitations',
  beforeLoad: requireTenant,
  component: InvitationsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage,
});

const feedbackRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/feedback',
  beforeLoad: requireAuth,
  component: FeedbackPage,
});

const requestsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/requests',
  beforeLoad: requireTenant,
  component: RequestsPage,
});

const escalationRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/requests/escalation',
  beforeLoad: requireTenant,
  component: EscalationPage,
});

const placesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/places',
  beforeLoad: requireTenant,
  component: PlacesPage,
});

const geofenceConsoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/places/console',
  beforeLoad: () => {
    throw redirect({ to: '/places' });
  },
  component: PlacesPage,
});

const billingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/billing',
  beforeLoad: requireTenant,
  component: BillingPage,
});

const recurringRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/recurring',
  beforeLoad: requireTenant,
  component: RecurringPage,
});

const pantryRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/pantry',
  beforeLoad: requireTenant,
  component: PantryPage,
});

const moneyRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/money',
  beforeLoad: requireTenant,
  component: MoneyPage,
});

const ledgerRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/money/$ledgerId',
  beforeLoad: requireTenant,
  component: LedgerRoute,
});

/** The ledger screen reads its own parameter, so the page takes a plain number. */
function LedgerRoute() {
  const { ledgerId } = ledgerRoute.useParams();

  return <LedgerPage ledgerId={Number(ledgerId)} />;
}

const financesOverviewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/overview',
  beforeLoad: requireTenant,
  component: FinancesOverviewPage,
});

const financesGoalsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/goals',
  beforeLoad: requireTenant,
  component: GoalsPage,
});

const financesLiabilitiesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/liabilities',
  beforeLoad: requireTenant,
  component: LiabilitiesPage,
});

const financesAssetsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/assets',
  beforeLoad: requireTenant,
  component: AssetsPage,
});

const financesTaxesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/taxes',
  beforeLoad: requireTenant,
  component: TaxesPage,
});

const recurringExpensesRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/finances/recurring',
  beforeLoad: requireTenant,
  component: RecurringExpensesPage,
});

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: AdminLoginPage,
});

const adminOverviewRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin',
  beforeLoad: requirePlatformAdmin,
  component: AdminOverviewPage,
});

const adminTenantsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/tenants',
  beforeLoad: requirePlatformAdmin,
  component: TenantsPage,
});

const adminTenantDetailRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/tenants/$tenantId',
  beforeLoad: requirePlatformAdmin,
  component: AdminTenantDetailRoute,
});

function AdminTenantDetailRoute() {
  const { tenantId } = adminTenantDetailRoute.useParams();
  return <TenantDetailPage tenantId={tenantId} />;
}

const adminHealthRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/health',
  beforeLoad: requirePlatformAdmin,
  component: HealthPage,
});

const adminBackupsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/backups',
  beforeLoad: requirePlatformAdmin,
  component: BackupsPage,
});

const adminFeedbackRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/feedback',
  beforeLoad: requirePlatformAdmin,
  component: PlatformFeedbackPage,
});

const adminAuditRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/audit-logs',
  beforeLoad: requirePlatformAdmin,
  component: AuditLogPage,
});

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/analytics',
  beforeLoad: requirePlatformAdmin,
  component: PlatformAnalyticsPage,
});

const adminBillingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/billing',
  beforeLoad: requirePlatformAdmin,
  component: AdminBillingPage,
});

const adminPaymentGatewayRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/payment-gateways',
  beforeLoad: requirePlatformAdmin,
  component: PaymentGatewayConfigPage,
});

const adminEmailConfigRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/email-config',
  beforeLoad: requirePlatformAdmin,
  component: EmailConfigPage,
});

const adminRefundsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/refunds',
  beforeLoad: requirePlatformAdmin,
  component: RefundPolicyPage,
});

const adminMarketingRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/marketing',
  beforeLoad: requirePlatformAdmin,
  component: AdminMarketingPage,
});

const adminSettingsRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/settings',
  beforeLoad: requirePlatformAdmin,
  component: AdminSystemSettingsPage,
});

const adminProfileRoute = createRoute({
  getParentRoute: () => appShellRoute,
  path: '/admin/profile',
  beforeLoad: requirePlatformAdmin,
  component: AdminProfilePage,
});

// Exported so tests can build a router over the real tree (see tests/support/render.tsx).
export const routeTree = rootRoute.addChildren([
  appShellRoute.addChildren([
    dashboardRoute,
    appRoute,
    membersRoute,
    membersRolesRoute,
    membersInvitationsRoute,
    settingsRoute,
    feedbackRoute,
    requestsRoute,
    escalationRoute,
    placesRoute,
    billingRoute,
    recurringRoute,
    pantryRoute,
    moneyRoute,
    ledgerRoute,
    financesOverviewRoute,
    financesGoalsRoute,
    financesLiabilitiesRoute,
    financesAssetsRoute,
    financesTaxesRoute,
    recurringExpensesRoute,
    adminOverviewRoute,
    adminAnalyticsRoute,
    adminTenantsRoute,
    adminTenantDetailRoute,
    adminBillingRoute,
    adminPaymentGatewayRoute,
    adminEmailConfigRoute,
    adminRefundsRoute,
    adminMarketingRoute,
    adminSettingsRoute,
    adminProfileRoute,
    adminHealthRoute,
    adminBackupsRoute,
    adminFeedbackRoute,
    adminAuditRoute,
  ]),
  indexRoute,
  marketingRoute,
  welcomeRoute,
  featuresHubRoute,
  featureDetailRoute,
  solutionsHubRoute,
  solutionDetailRoute,
  pricingMarketingRoute,
  aboutRoute,
  refundPolicyRoute,
  faqRoute,
  contactRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  verifyPhoneRoute,
  geofenceConsoleRoute,
  adminLoginRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
