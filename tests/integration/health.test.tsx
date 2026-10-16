import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { landlord, opsHealth } from '../support/fixtures';
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

describe('system health console', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');

    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/health': opsHealth(),
    });
  });

  it('reports the overall status and every measured check', async () => {
    renderApp('/admin/health');

    expect(await screen.findByRole('heading', { name: 'System health' })).toBeInTheDocument();

    // The worst check wins: this fixture has a failing database check.
    expect(await screen.findByText('Failing')).toBeInTheDocument();

    // Scoped: "Runtime" is both a check label and the detail card heading.
    const checks = within(await screen.findByRole('region', { name: 'Health checks' }));

    for (const label of ['Database', 'Queue', 'Scheduler', 'Cache', 'Storage', 'Runtime']) {
      expect(await checks.findByText(label)).toBeInTheDocument();
    }

    // The check carries its measurement, not just a colour.
    expect(checks.getByText('1200')).toBeInTheDocument();
    expect(checks.getByText('ms')).toBeInTheDocument();
  });

  it('shows uptime from the samples rather than inventing one', async () => {
    renderApp('/admin/health');

    expect(
      await screen.findByText(/75% of samples healthy in the last 24h/),
    ).toBeInTheDocument();
  });

  it('lists a failed job with its reason and offers a requeue', async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/platform/health/failed-jobs/7/retry') {
        return jsonResponse({ message: 'Job requeued.' });
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/admin/health');

    const panel = within(
      (await screen.findByText('Failed jobs')).closest('div') as HTMLElement,
    );

    expect(await panel.findByText(/Too many attempts/)).toBeInTheDocument();

    await userEvent.click(panel.getByRole('button', { name: /requeue/i }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/health/failed-jobs/7/retry'),
    );
  });

  it('opens an incident and resolves it', async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/platform/incidents') {
        return jsonResponse({ data: {} });
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });
    apiMock.patch.mockImplementation((url: string) => {
      if (url === '/v1/platform/incidents/1') {
        return jsonResponse({ data: {} });
      }

      return Promise.reject(new Error(`Unstubbed PATCH ${url}`));
    });

    renderApp('/admin/health');

    await screen.findByText('Queue worker restarted');

    await userEvent.type(screen.getByLabelText('What happened?'), 'Redis unreachable');
    await userEvent.click(screen.getByRole('button', { name: 'Open incident' }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith(
        '/v1/platform/incidents',
        expect.objectContaining({ title: 'Redis unreachable', severity: 'minor' }),
      ),
    );

    await userEvent.click(screen.getByRole('button', { name: 'Resolve' }));

    await waitFor(() =>
      expect(apiMock.patch).toHaveBeenCalledWith('/v1/platform/incidents/1', { status: 'resolved' }),
    );
  });

  it('says plainly that the incident log is operator-written', async () => {
    renderApp('/admin/health');

    expect(
      await screen.findByText(/Written by an operator, not detected automatically/i),
    ).toBeInTheDocument();
  });
});
