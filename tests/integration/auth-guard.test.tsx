import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes } from '../support/api';
import { landlord, sessionRoutes, tenantAdmin } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores, signIn } from '../support/session';
import { useTenantStore } from '@/stores/tenant';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: apiMock,
  apiError: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

describe('route guards', () => {
  beforeEach(() => resetStores());

  it('sends a signed-out visitor to the login page', async () => {
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('sends a signed-out visitor to login even when they ask for a household screen', async () => {
    renderApp('/requests');

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('lets a signed-in tenant admin reach the household dashboard', async () => {
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, sessionRoutes());

    renderApp('/');

    expect(
      await screen.findByRole('heading', { name: "Today's Household Overview" }),
    ).toBeInTheDocument();
  });

  it('bounces a household user away from the landlord console', async () => {
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, sessionRoutes());

    renderApp('/admin');

    // requirePlatformAdmin redirects to '/', which resolves to the household dashboard.
    expect(
      await screen.findByRole('heading', { name: "Today's Household Overview" }),
    ).toBeInTheDocument();
  });

  it('lets a platform admin into the landlord console', async () => {
    signIn(landlord, 'landlord-token');
    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/metrics': {
        total_tenants: 2,
        by_status: { active: 2 },
        by_tier: { pilot: 2 },
        active_members: 4,
        audit: {
          events_24h: 7,
          critical_24h: 1,
          warning_24h: 3,
          denied_platform_access_24h: 1,
          total: 40,
          oldest: '2026-10-01T00:00:00.000Z',
        },
      },
      '/v1/platform/tenants': {
        data: [],
        meta: { current_page: 1, last_page: 1, per_page: 20, total: 0 },
      },
    });

    renderApp('/admin');

    expect(
      await screen.findByRole('heading', { name: 'Platform Analytics & Global Operations' }),
    ).toBeInTheDocument();
  });

  it('bounces a tenant user without an active household to the dashboard', async () => {
    // Signed in, but no household resolved: requireTenant redirects.
    signIn(tenantAdmin, 'dashboard-token');
    useTenantStore.setState({ memberships: [], active: null, loaded: true });
    installGetRoutes(apiMock, sessionRoutes());

    const { router } = renderApp('/requests');

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
