import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AdminLoginPage } from '@/pages/AdminLoginPage';
import { BillingPage } from '@/pages/BillingPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { LoginPage } from '@/pages/LoginPage';
import { MembersPage } from '@/pages/MembersPage';
import { PlacesPage } from '@/pages/PlacesPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { RequestsPage } from '@/pages/RequestsPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { VerifyEmailPage } from '@/pages/VerifyEmailPage';
import { VerifyPhonePage } from '@/pages/VerifyPhonePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { InvitationsPage } from '@/pages/members/InvitationsPage';
import { RolesPage } from '@/pages/members/RolesPage';
import { GeofenceConsolePage } from '@/pages/places/GeofenceConsolePage';
import { EscalationPage } from '@/pages/requests/EscalationPage';
import { AdminOverviewPage } from '@/pages/admin/AdminOverviewPage';
import { AuditLogPage } from '@/pages/admin/AuditLogPage';
import { TenantsPage } from '@/pages/admin/TenantsPage';
import { requireAuth, requirePlatformAdmin, requireTenant } from '@/lib/guards';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: requireAuth,
  component: DashboardPage,
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
  beforeLoad: requireTenant,
  component: SettingsPage,
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

const adminAuditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/audit-logs',
  beforeLoad: requirePlatformAdmin,
  component: AuditLogPage,
});

// Exported so tests can build a router over the real tree (see tests/support/render.tsx).
export const routeTree = rootRoute.addChildren([
  indexRoute,
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
  requestsRoute,
  escalationRoute,
  placesRoute,
  geofenceConsoleRoute,
  billingRoute,
  adminLoginRoute,
  adminOverviewRoute,
  adminTenantsRoute,
  adminAuditRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
