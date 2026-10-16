import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { roleCatalogue, sessionRoutes, tenantAdmin } from '../support/fixtures';
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

describe('roles & permissions module', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, sessionRoutes());
  });

  it('renders the capability matrix served by the API', async () => {
    renderApp('/members/roles');

    expect(
      await screen.findByRole('heading', { name: 'Roles & Permissions' }),
    ).toBeInTheDocument();

    // Comes from /v1/tenant/roles, not a hardcoded table in the component.
    const grid = within(await screen.findByRole('table'));
    expect(grid.getByText('Change roles / remove members')).toBeInTheDocument();
    expect(grid.getByText('Create & assign requests')).toBeInTheDocument();
  });

  it('shows each role with how many members hold it', async () => {
    renderApp('/members/roles');

    // Scoped: role labels also appear in the assignment list below. Await the
    // first card: the region renders before the catalogue query resolves.
    const catalogue = within(await screen.findByRole('region', { name: 'Role catalogue' }));

    expect(await catalogue.findByText('Tenant admin')).toBeInTheDocument();
    expect(catalogue.getByText('Household member')).toBeInTheDocument();
    expect(catalogue.getByText('Co-admin')).toBeInTheDocument();
    expect(catalogue.getByText('Junior')).toBeInTheDocument();
    expect(catalogue.getAllByText('1 member').length).toBe(2);
    expect(catalogue.getAllByText('0 members').length).toBe(2);
  });

  it('asks for confirmation before changing a role', async () => {
    apiMock.patch.mockImplementation((url: string) => {
      if (url === '/v1/tenant/members/2') {
        return jsonResponse({ data: {} });
      }

      return Promise.reject(new Error(`Unstubbed PATCH ${url}`));
    });

    renderApp('/members/roles');

    const assignment = await screen.findByText('Role assignment');
    expect(assignment).toBeInTheDocument();

    // Sarah is not the caller, so her role is editable.
    const select = await screen.findByLabelText('Role for Sarah Rahman');
    await userEvent.selectOptions(select, 'co_admin');

    // Nothing is sent until the change is confirmed.
    expect(apiMock.patch).not.toHaveBeenCalled();
    expect(await screen.findByRole('dialog', { name: 'Change this role?' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Change role' }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/tenant/members/2', { role: 'co_admin' }),
    );
  });

  it('offers no role control to somebody who cannot manage roles', async () => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');

    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/roles': roleCatalogue({
        can_manage_roles: false,
        roles: roleCatalogue().roles.map((role) => ({
          ...role,
          can_be_granted: role.key !== 'tenant_admin' && role.key !== 'co_admin',
        })),
      }),
    });

    renderApp('/members/roles');

    expect(await screen.findByText(/only a tenant admin can change a role/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Role for Sarah Rahman')).not.toBeInTheDocument();
  });
});
