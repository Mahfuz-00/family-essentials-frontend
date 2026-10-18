import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { ledger, ledgerEntry, ledgerSummary, sessionRoutes, tenantAdmin } from '../support/fixtures';
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

/** Every URL the screen has asked for, so a request that must not happen is visible. */
function requestedUrls(): string[] {
  return apiMock.get.mock.calls.map((call) => String(call[0]));
}

describe('money', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
  });

  it('offers to set up a budget when the caller has no ledgers', async () => {
    installGetRoutes(apiMock, { ...sessionRoutes(), '/v1/ledgers': { data: [] } });
    apiMock.post.mockImplementation(() => jsonResponse({ data: ledger() }));

    renderApp('/money');

    expect(await screen.findByText('No ledger yet')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Set up a budget' }));
    await userEvent.type(await screen.findByLabelText('What is this budget for?'), 'Household spending');
    await userEvent.click(screen.getByRole('button', { name: 'Create ledger' }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith('/v1/ledgers', { name: 'Household spending' }),
    );
  });

  it('lists the caller’s ledgers with their role', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': {
        data: [
          ledger({ id: 7, name: 'Household spending', my_role: 'owner' }),
          ledger({ id: 8, name: 'School fund', my_role: 'summary', currency: 'GBP', member_count: 2 }),
        ],
      },
    });

    renderApp('/money');

    expect(await screen.findByRole('link', { name: 'Household spending' })).toHaveAttribute(
      'href',
      '/money/7',
    );
    expect(screen.getByRole('link', { name: 'School fund' })).toHaveAttribute('href', '/money/8');
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Totals only')).toBeInTheDocument();
  });

  it('gives an owner the totals, every entry, the form and the access panel', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': { data: [ledger({ id: 7, my_role: 'owner' })] },
      '/v1/ledgers/7/summary': { data: ledgerSummary() },
      '/v1/ledgers/7/entries': { data: [ledgerEntry()] },
    });

    renderApp('/money/7');

    // Totals, formatted from integer minor units.
    expect(await screen.findByText('$1,245.50')).toBeInTheDocument();
    expect(screen.getByText('$3,000.00')).toBeInTheDocument();

    // Entries, with the direction as a word and the amount signed.
    const table = await screen.findByRole('table');
    expect(within(table).getByText('Weekly shop')).toBeInTheDocument();
    expect(within(table).getByText('Expense')).toBeInTheDocument();
    expect(within(table).getByText('-$1,245.50')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Record an entry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Who can see this ledger' })).toBeInTheDocument();
  });

  it('sends the entry amount as integer minor units', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': { data: [ledger({ id: 7, my_role: 'manager' })] },
      '/v1/ledgers/7/summary': { data: ledgerSummary() },
      '/v1/ledgers/7/entries': { data: [] },
    });
    apiMock.post.mockImplementation(() => jsonResponse({ data: ledgerEntry() }));

    renderApp('/money/7');

    await userEvent.type(await screen.findByLabelText('Amount'), '12.50');
    await userEvent.type(screen.getByLabelText('Description'), 'Weekly shop');
    await userEvent.click(screen.getByRole('button', { name: /record entry/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalled());

    const [url, body] = apiMock.post.mock.calls[0];

    expect(url).toBe('/v1/ledgers/7/entries');
    expect(body.amount_minor).toBe(1250);
    expect(Number.isInteger(body.amount_minor)).toBe(true);
    expect(body).toMatchObject({ direction: 'expense', description: 'Weekly shop' });
  });

  it('refuses more than two decimals without calling the API', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': { data: [ledger({ id: 7, my_role: 'manager' })] },
      '/v1/ledgers/7/summary': { data: ledgerSummary() },
      '/v1/ledgers/7/entries': { data: [] },
    });

    renderApp('/money/7');

    await userEvent.type(await screen.findByLabelText('Amount'), '12.345');
    await userEvent.click(screen.getByRole('button', { name: /record entry/i }));

    expect(await screen.findByText(/at most two decimals/i)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('lets a summary member see the totals without ever asking for the entries', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': { data: [ledger({ id: 7, name: 'School fund', my_role: 'summary' })] },
      '/v1/ledgers/7/summary': { data: ledgerSummary({ currency: 'GBP' }) },
      // Deliberately unstubbed: `installGetRoutes` would reject this URL loudly.
    });

    renderApp('/money/7');

    expect(await screen.findByText('£1,245.50')).toBeInTheDocument();

    // One plain sentence explains what the role shows, and it is not a door.
    expect(
      await screen.findByText(/shows the totals only — the individual entries stay/i),
    ).toBeInTheDocument();

    // No rows, no form, no member panel.
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Record an entry' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Amount')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Who can see this ledger' })).not.toBeInTheDocument();

    // The nav item is where it always is: present, and not disabled.
    const moneyNav = screen.getByRole('link', { name: 'Money' });
    expect(moneyNav).toBeInTheDocument();
    expect(moneyNav).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('never fetches the entries endpoint for a summary member', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/ledgers': { data: [ledger({ id: 7, my_role: 'summary' })] },
      '/v1/ledgers/7/summary': { data: ledgerSummary() },
    });

    renderApp('/money/7');

    expect(await screen.findByText('This period')).toBeInTheDocument();

    await waitFor(() => expect(requestedUrls()).toContain('/v1/ledgers/7/summary'));

    // A 403 from the entries endpoint would be noise: the screen never asks.
    expect(requestedUrls().some((url) => url.includes('/entries'))).toBe(false);
  });
});
