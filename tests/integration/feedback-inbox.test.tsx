import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { landlord, platformFeedbackReport } from '../support/fixtures';
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

function inbox(overrides: Record<string, unknown> = {}) {
  return {
    data: [
      platformFeedbackReport(),
      platformFeedbackReport({
        id: 2,
        type: 'feature_request',
        priority: 'critical',
        status: 'triaged',
        subject: 'Let us export the shopping list',
        age_hours: 40,
        tenant: { id: 2, name: 'The Bradley Household', subscription_tier: 'standard', status: 'active' },
      }),
    ],
    summary: {
      open: 2,
      total: 5,
      critical_open: 1,
      unseen: 1,
      oldest_open_at: '2026-10-14T09:00:00.000Z',
      by_status: { new: 1, triaged: 1 },
      by_type: { bug: 1, feature_request: 1 },
    },
    ...overrides,
  };
}

describe('platform feedback inbox', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');
    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/feedback': inbox(),
    });
  });

  it('gathers reports from every household with what triage needs', async () => {
    renderApp('/admin/feedback');

    expect(await screen.findByRole('heading', { name: 'Feedback inbox' })).toBeInTheDocument();

    // Summary tiles.
    expect(screen.getByText('Critical open')).toBeInTheDocument();
    expect(screen.getByText('Ever received')).toBeInTheDocument();

    // Both households are visible in one queue, with age and priority.
    expect(await screen.findByText('The Tanvir Household')).toBeInTheDocument();
    expect(screen.getByText('The Bradley Household')).toBeInTheDocument();
    expect(screen.getByText('6 h old')).toBeInTheDocument();
    expect(screen.getByText('2 d old')).toBeInTheDocument();
  });

  it('shows the reported detail and the client context it arrived with', async () => {
    renderApp('/admin/feedback');

    expect(
      await screen.findByText('Adding three items then reloading shows only two of them.'),
    ).toBeInTheDocument();
    // The auto-captured context is what saves a round trip with the household.
    expect(screen.getByText('screen')).toBeInTheDocument();
    expect(screen.getByText('/requests')).toBeInTheDocument();
  });

  it('narrows the queue', async () => {
    renderApp('/admin/feedback');

    await screen.findByText('The Tanvir Household');

    apiMock.get.mockClear();

    await userEvent.selectOptions(screen.getByLabelText('Filter type'), 'bug');

    await waitFor(() =>
      expect(apiMock.get).toHaveBeenCalledWith(expect.stringContaining('/v1/platform/feedback?')),
    );
    expect(apiMock.get).toHaveBeenCalledWith(expect.stringContaining('type=bug'));
  });

  it('moves a report through triage and says the household will see it', async () => {
    apiMock.patch.mockImplementation((url: string) => {
      if (url === '/v1/platform/feedback/1') {
        return jsonResponse({ data: platformFeedbackReport({ status: 'triaged' }) });
      }

      return Promise.reject(new Error(`Unstubbed PATCH ${url}`));
    });

    renderApp('/admin/feedback');

    await screen.findByText('The Tanvir Household');

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'triaged');

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith(
        '/v1/platform/feedback/1',
        expect.objectContaining({ status: 'triaged' }),
      ),
    );

    expect(await screen.findByText(/household sees the new status/)).toBeInTheDocument();
  });

  it('leaves the household a note when closing a report', async () => {
    apiMock.patch.mockImplementation(() => jsonResponse({ data: platformFeedbackReport() }));

    renderApp('/admin/feedback');

    await screen.findByText('The Tanvir Household');

    await userEvent.type(
      screen.getByLabelText('Note for the household'),
      'Fixed in 1.4.1 — the list now survives a reload.',
    );
    await userEvent.click(screen.getByRole('button', { name: /save note/i }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/platform/feedback/1', {
        resolution_note: 'Fixed in 1.4.1 — the list now survives a reload.',
      }),
    );
  });

  it('says nothing is waiting when the queue is empty', async () => {
    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/feedback': inbox({ data: [] }),
    });

    renderApp('/admin/feedback');

    expect(await screen.findByText('Nothing waiting')).toBeInTheDocument();
    const queue = within(screen.getByText('Nothing waiting').closest('div') as HTMLElement);
    expect(queue.getByText(/Reports appear here the moment one is sent/)).toBeInTheDocument();
  });
});
