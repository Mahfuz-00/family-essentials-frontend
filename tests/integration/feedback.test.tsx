import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { feedbackReport, sessionRoutes } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores, signIn } from '../support/session';
import { tenantAdmin } from '../support/fixtures';

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

describe('help & feedback', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
    installGetRoutes(apiMock, sessionRoutes());
  });

  it('sends a report with the screen it happened on', async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/feedback') {
        return jsonResponse({ data: feedbackReport() }, 201);
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/feedback');

    expect(await screen.findByRole('heading', { name: 'Help & feedback' })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText('What kind of report?'), 'bug');
    await userEvent.type(screen.getByLabelText('Subject'), 'Shopping list loses items');
    await userEvent.type(
      screen.getByLabelText('What happened?'),
      'Adding three items then reloading shows only two.',
    );

    await userEvent.click(screen.getByRole('button', { name: /send report/i }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        '/v1/feedback',
        expect.objectContaining({
          type: 'bug',
          subject: 'Shopping list loses items',
          context: expect.objectContaining({ platform: 'web', screen: '/feedback' }),
        }),
      ),
    );

    expect(await screen.findByText(/It is in the platform team’s queue/)).toBeInTheDocument();
  });

  it('will not send a report that has no detail in it', async () => {
    renderApp('/feedback');

    const send = await screen.findByRole('button', { name: /send report/i });

    expect(send).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Subject'), 'Short');
    await userEvent.type(screen.getByLabelText('What happened?'), 'tiny');

    // Too short to be actionable, so the button stays off.
    expect(send).toBeDisabled();

    await userEvent.type(
      screen.getByLabelText('What happened?'),
      ' but this is enough detail to act on.',
    );

    await waitFor(() => expect(send).toBeEnabled());
  });

  it('shows what happened to a report, including the note that closed it', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/feedback': {
        data: [
          feedbackReport({
            id: 1,
            status: 'in_progress',
            subject: 'Store list is empty',
          }),
          feedbackReport({
            id: 2,
            status: 'resolved',
            subject: 'Pantry reminder fired twice',
            resolution_note: 'Fixed in 1.4.1 — the dedupe key was wrong.',
            resolved_at: '2026-10-16T12:00:00.000Z',
          }),
        ],
        summary: { total: 2, open: 1, last_sent_at: '2026-10-16T12:00:00.000Z' },
      },
    });

    renderApp('/feedback');

    const panel = within(await screen.findByText('Your reports').then((n) => n.closest('div') as HTMLElement));

    expect(await panel.findByText('Store list is empty')).toBeInTheDocument();
    expect(panel.getByText('In progress')).toBeInTheDocument();
    expect(panel.getByText('Resolved')).toBeInTheDocument();
    // The household is told why, rather than just seeing "resolved".
    expect(panel.getByText(/the dedupe key was wrong/)).toBeInTheDocument();
    expect(panel.getByText(/1 of your reports is still open/)).toBeInTheDocument();
  });

  it('says so when nothing has been sent yet', async () => {
    renderApp('/feedback');

    expect(await screen.findByText('Nothing sent yet')).toBeInTheDocument();
  });
});
