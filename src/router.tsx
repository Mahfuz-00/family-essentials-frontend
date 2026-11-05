import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { BillingPage } from '@/pages/BillingPage';
import { DashboardPage } from '@/pages/DashboardPage';
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
import { MembersPage } from '@/pages/MembersPage';
import { MoneyPage } from '@/pages/MoneyPage';
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
import { GeofenceConsolePage } from '@/pages/places/GeofenceConsolePage';
import { EscalationPage } from '@/pages/requests/EscalationPage';
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
import { MarketingPage as AdminMarketingPage } from '@/pages/admin/MarketingPage';
import { requireAuth, requirePlatformAdmin, requireTenant } from '@/lib/guards';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

// The public marketing website is served at the root '/'
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: MarketingPage,
});

// The authenticated household dashboard is served at '/dashboard' (and aliased at '/app')
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: requireAuth,
  component: DashboardPage,
});

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
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
  getParentRoute: () => rootRoute,
  path: '/members',
  beforeLoad: requireTenant,
  component: MembersPage,
});

const membersRolesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members/roles',
  beforeLoad: requireTenant,
  component: RolesPage,
});

const membersInvitationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/members/invitations',
  beforeLoad: requireTenant,
  component: InvitationsPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: requireAuth,
  component: SettingsPage,
});

const feedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/feedback',
  beforeLoad: requireAuth,
  component: FeedbackPage,
});

const requestsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests',
  beforeLoad: requireTenant,
  component: RequestsPage,
});

const escalationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/requests/escalation',
  beforeLoad: requireTenant,
  component: EscalationPage,
});

const placesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/places',
  beforeLoad: requireTenant,
  component: PlacesPage,
});

const geofenceConsoleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/places/console',
  beforeLoad: requireTenant,
  component: GeofenceConsolePage,
});

const billingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/billing',
  beforeLoad: requireTenant,
  component: BillingPage,
});

const recurringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/recurring',
  beforeLoad: requireTenant,
  component: RecurringPage,
});

const moneyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/money',
  beforeLoad: requireTenant,
  component: MoneyPage,
});

const ledgerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/money/$ledgerId',
  beforeLoad: requireTenant,
  component: LedgerRoute,
});

/** The ledger screen reads its own parameter, so the page takes a plain number. */
function LedgerRoute() {
  const { ledgerId } = ledgerRoute.useParams();

  return <LedgerPage ledgerId={Number(ledgerId)} />;
}

const adminLoginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/login',
  component: AdminLoginPage,
});

const adminOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  beforeLoad: requirePlatformAdmin,
  component: AdminOverviewPage,
});

const adminTenantsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/tenants',
  beforeLoad: requirePlatformAdmin,
  component: TenantsPage,
});

const adminHealthRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/health',
  beforeLoad: requirePlatformAdmin,
  component: HealthPage,
});

const adminBackupsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/backups',
  beforeLoad: requirePlatformAdmin,
  component: BackupsPage,
});

const adminFeedbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/feedback',
  beforeLoad: requirePlatformAdmin,
  component: PlatformFeedbackPage,
});

const adminAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/audit-logs',
  beforeLoad: requirePlatformAdmin,
  component: AuditLogPage,
});

const adminAnalyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/analytics',
  beforeLoad: requirePlatformAdmin,
  component: PlatformAnalyticsPage,
});

const adminPaymentGatewayRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/payment-gateways',
  beforeLoad: requirePlatformAdmin,
  component: PaymentGatewayConfigPage,
});

const adminEmailConfigRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/email-config',
  beforeLoad: requirePlatformAdmin,
  component: EmailConfigPage,
});

const adminRefundsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/refunds',
  beforeLoad: requirePlatformAdmin,
  component: RefundPolicyPage,
});

const adminMarketingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/marketing',
  beforeLoad: requirePlatformAdmin,
  component: AdminMarketingPage,
});

// Exported so tests can build a router over the real tree (see tests/support/render.tsx).
export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  appRoute,
  marketingRoute,
  welcomeRoute,
  featuresHubRoute,
  featureDetailRoute,
  solutionsHubRoute,
  solutionDetailRoute,
  pricingMarketingRoute,
  aboutRoute,
  faqRoute,
  contactRoute,
  loginRoute,
  registerRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  verifyEmailRoute,
  verifyPhoneRoute,
  membersRoute,
  membersRolesRoute,
  membersInvitationsRoute,
  settingsRoute,
  feedbackRoute,
  requestsRoute,
  escalationRoute,
  placesRoute,
  geofenceConsoleRoute,
  billingRoute,
  recurringRoute,
  moneyRoute,
  ledgerRoute,
  adminLoginRoute,
  adminOverviewRoute,
  adminAnalyticsRoute,
  adminTenantsRoute,
  adminPaymentGatewayRoute,
  adminEmailConfigRoute,
  adminRefundsRoute,
  adminMarketingRoute,
  adminHealthRoute,
  adminBackupsRoute,
  adminFeedbackRoute,
  adminAuditRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
