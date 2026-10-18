import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { household, place, quotaReport, roleCatalogue, sessionRoutes, tenantAdmin } from '../support/fixtures';
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

describe('location notifications', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
  });

  it('turns arrival notifications on through the API', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant': { data: household },
    });

    apiMock.patch.mockImplementation((url: string) => {
      if (url === '/v1/auth/location-consent') {
        return jsonResponse({
          message: 'You will be told when you arrive somewhere with work waiting.',
          user: { ...tenantAdmin, location_notifications_opt_in: true },
        });
      }

      return Promise.reject(new Error(`Unstubbed PATCH ${url}`));
    });

    renderApp('/settings');

    const toggle = await screen.findByLabelText('Enable arrival notifications');

    expect(toggle).not.toBeChecked();

    await userEvent.click(toggle);

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/auth/location-consent', { opt_in: true }),
    );
  });

  it('shows a place’s location type and offers Office', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/places': {
        data: [
          place({
            id: 4,
            name: 'Downtown Office',
            category: 'office',
            kind: 'office',
            kind_label: 'Office',
          }),
        ],
      },
    });

    renderApp('/places');

    // The card shows the derived kind, not the raw category.
    expect(await screen.findByText('Office')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /add new place/i }));

    const category = await screen.findByLabelText('Category');
    expect(within(category).getByRole('option', { name: 'office' })).toBeInTheDocument();
  });

  it('labels a saved place with its kind in the request form', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/places': {
        data: [
          place({
            id: 5,
            name: 'Whole Foods',
            category: 'grocery',
            kind: 'store',
            kind_label: 'Store',
          }),
        ],
      },
    });

    renderApp('/requests');

    // The form lives in the create modal; the shell and the page both offer it.
    const addRequest = await screen.findAllByRole('button', { name: /add request/i });
    await userEvent.click(addRequest[0]);

    const places = await screen.findByLabelText('Saved place');

    // Linking a task to a Home or Office place is explicit, and the kind makes it
    // obvious which one is being chosen.
    expect(within(places).getByRole('option', { name: 'Whole Foods · Store' })).toBeInTheDocument();
  });

  it('keeps the quota-cap seat meter intact when planes of work change', async () => {
    // The seat meter lives on Billing now; the shell no longer carries one.
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport(),
      '/v1/tenant/roles': roleCatalogue(),
    });

    renderApp('/billing');

    const meter = (await screen.findByText('Family member seats')).closest('div');

    expect(meter?.textContent).toContain('2 of 5');
  });
});
