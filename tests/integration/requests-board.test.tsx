import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes } from '../support/api';
import { sessionRoutes, tenantAdmin } from '../support/fixtures';
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

/** Waits until the board query has resolved and the columns are on screen. */
async function openBoard() {
  renderApp('/requests');

  expect(
    await screen.findByRole('heading', { name: 'Household Kanban & Errand Hub' }),
  ).toBeInTheDocument();

  await screen.findByRole('heading', { name: 'Overdue' });
}

describe('household kanban', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, sessionRoutes());
  });

  it('renders every board column once the board loads', async () => {
    await openBoard();

    for (const column of ['Overdue', 'Due Today', 'Assigned to Me', 'Backlog', 'Completed Today']) {
      expect(screen.getByRole('heading', { name: column })).toBeInTheDocument();
    }
  });

  it('opens the create form from the shell header', async () => {
    renderApp('/requests');

    await screen.findByRole('heading', { name: 'Household Kanban & Errand Hub' });

    // This button used to be a link to /requests — a no-op from /requests itself.
    await userEvent.click(screen.getByRole('button', { name: 'Add Request' }));

    expect(await screen.findByRole('dialog', { name: 'Add a request' })).toBeInTheDocument();
  });

  it('shows an undated, unassigned request in the backlog rather than nowhere', async () => {
    await openBoard();

    expect(screen.getByRole('heading', { name: 'Bin bags' })).toBeInTheDocument();
  });

  it('raises an overdue banner for the item that needs attention', async () => {
    renderApp('/requests');

    expect(await screen.findByText('Overdue Attention Required (1 Item)')).toBeInTheDocument();
    // The banner names the real item, not a placeholder.
    expect(screen.getAllByText('Organic Whole Milk').length).toBeGreaterThan(0);
  });

  it('places each request in its column', async () => {
    await openBoard();

    expect(screen.getByRole('heading', { name: 'Organic Whole Milk' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nappies' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Coffee beans' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Bin bags' })).toBeInTheDocument();
  });

  it('switches between the kanban and list views', async () => {
    await openBoard();

    expect(screen.queryByRole('columnheader', { name: 'Item' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /list/i }));

    expect(await screen.findByRole('columnheader', { name: 'Item' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Assignee' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /kanban/i }));

    await waitFor(() =>
      expect(screen.queryByRole('columnheader', { name: 'Item' })).not.toBeInTheDocument(),
    );
  });

  it('filters the board down to the signed-in member', async () => {
    await openBoard();

    expect(screen.getByRole('heading', { name: 'Nappies' })).toBeInTheDocument();

    // 'Tanvir' both filters to that member and matches the card assignee label,
    // so target the filter control by its group.
    const filter = screen.getByRole('group', { name: 'Filter by assignee' });
    await userEvent.click(within(filter).getByRole('button', { name: 'Tanvir' }));

    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Nappies' })).not.toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Organic Whole Milk' })).toBeInTheDocument();
  });
});
