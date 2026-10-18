import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes } from '../support/api';
import { quotaReport, sessionRoutes, tenantAdmin } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores, signIn } from '../support/session';

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

describe('plan limits', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
  });

  /**
   * The seat meter lives on Billing, and it is one span with the count split
   * across two nodes ("2" + " of 3"), so the card's own text is read.
   */
  async function seatMeter(): Promise<string> {
    const label = await screen.findByText('Family member seats');

    return label.closest('div')?.textContent ?? '';
  }

  it('shows the cap the API enforces, not the catalogue copy', async () => {
    // The tenant's tier is `pilot`, whose catalogue says five seats. The server
    // says three, and the server is the one that refuses the fourth member.
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport({
        plan: { ...quotaReport().plan, seat_cap: 3 },
        meters: quotaReport().meters.map((meter) =>
          meter.key === 'seats' ? { ...meter, cap: 3, remaining: 1, percent: 67 } : meter,
        ),
      }),
    });

    renderApp('/billing');

    const meter = await seatMeter();

    expect(meter).toContain('2 of 3');
    expect(meter).not.toContain('2 of 5');
  });

  it('flags a meter that has reached its plan limit', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport({
        at_cap: ['requests'],
        usage: { ...quotaReport().usage, requests_this_month: 300 },
        meters: quotaReport().meters.map((meter) =>
          meter.key === 'requests'
            ? { ...meter, used: 300, remaining: 0, at_cap: true, percent: 100 }
            : meter,
        ),
      }),
    });

    renderApp('/billing');

    expect(
      await screen.findByText(/At the plan limit — the API refuses the next one/),
    ).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
  });

  it('counts seats held by pending invitations as used', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport({
        usage: { ...quotaReport().usage, members: 2, seats_reserved: 2 },
        meters: quotaReport().meters.map((meter) =>
          meter.key === 'seats'
            ? { ...meter, used: 4, remaining: 1, percent: 80, detail: { members: 2, reserved_by_invitations: 2 } }
            : meter,
        ),
      }),
    });

    renderApp('/billing');

    expect(await screen.findByText(/2 held by invitations/)).toBeInTheDocument();
  });

  it('does not invent a plan limit while the quota call is outstanding', async () => {
    // No /v1/tenant/quotas stub at all: the meter may show what it knows — how
    // many members there are — but must never print a cap the API never sent.
    const routes = sessionRoutes();
    installGetRoutes(apiMock, {
      '/v1/auth/me': routes['/v1/auth/me'],
      '/v1/auth/tenants': routes['/v1/auth/tenants'],
      '/v1/tenant/members': routes['/v1/tenant/members'],
      '/v1/places': routes['/v1/places'],
    });

    renderApp('/billing');

    const meter = await seatMeter();
    expect(meter).toContain('2');
    expect(meter).not.toContain('of 5');
    expect(meter).toContain('the API has not reported the plan limit');
  });
});
