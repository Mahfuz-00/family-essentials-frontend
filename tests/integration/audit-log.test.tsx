import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes } from '../support/api';
import { auditEvent, landlord } from '../support/fixtures';
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

/** The action filter lists the same action strings as the table rows, so scope to the grid. */
async function ledger() {
  return within(await screen.findByRole('table'));
}

describe('audit log explorer', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');

    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/audit-logs': {
        data: [
          auditEvent(),
          auditEvent({
            id: 2,
            action: 'auth.platform_access_denied',
            level: 'critical',
            actor_email: 'sarah@familyessentials.app',
            actor_role: 'member',
            http_status: 403,
            payload: { path: 'api/v1/platform/tenants' },
          }),
        ],
        meta: { current_page: 1, last_page: 2, per_page: 25, total: 30 },
      },
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
    });
  });

  it('summarises the ledger from real counts', async () => {
    renderApp('/admin/audit-logs');

    const eventKpi = (await screen.findByText('Security events (24h)')).closest('div');
    expect(eventKpi?.textContent).toContain('7');

    expect(screen.getByText('Critical (24h)').closest('div')?.textContent).toContain('1');
    expect(screen.getByText('Denied platform access (24h)').closest('div')?.textContent).toContain('1');
  });

  it('lists each event with its severity and actor', async () => {
    renderApp('/admin/audit-logs');

    const grid = await ledger();

    const suspendedRow = grid.getByText('tenant.suspended').closest('tr');
    expect(suspendedRow?.textContent).toContain('warning');
    expect(suspendedRow?.textContent).toContain('platform@familyessentials.app');
    expect(suspendedRow?.textContent).toContain('200');

    const deniedRow = grid.getByText('auth.platform_access_denied').closest('tr');
    expect(deniedRow?.textContent).toContain('critical');
    expect(deniedRow?.textContent).toContain('sarah@familyessentials.app');
    expect(deniedRow?.textContent).toContain('403');
  });

  it('reveals the event payload on demand', async () => {
    renderApp('/admin/audit-logs');

    const row = (await ledger()).getByText('tenant.suspended').closest('tr') as HTMLElement;

    // Collapsed by default.
    expect(screen.queryByText(/"tenant": "The Tanvir Household"/)).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Payload' }));

    expect(await screen.findByText(/"tenant": "The Tanvir Household"/)).toBeInTheDocument();
  });

  it('reports how many events the ledger holds in total', async () => {
    renderApp('/admin/audit-logs');

    expect(await screen.findByText(/30 events/)).toBeInTheDocument();
  });
});
