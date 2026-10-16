import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { backupsPayload, landlord } from '../support/fixtures';
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

function install(payload = backupsPayload()) {
  installGetRoutes(apiMock, {
    '/v1/auth/me': { data: landlord },
    '/v1/auth/tenants': { data: [] },
    '/v1/platform/backups': payload,
  });
}

describe('backups & recovery console', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');
    install();
  });

  it('leads with whether the platform is actually recoverable', async () => {
    renderApp('/admin/backups');

    expect(
      await screen.findByRole('heading', { name: 'Backups & disaster recovery' }),
    ).toBeInTheDocument();

    expect(await screen.findByText('Recoverable')).toBeInTheDocument();
    expect(screen.getByText(/within the 24 h objective/)).toBeInTheDocument();
    // The connection a dump is taken as is stated, because the runtime role would
    // export zero rows under row-level security.
    expect(screen.getByText('pgsql_admin')).toBeInTheDocument();
  });

  it('lists the gaps instead of claiming readiness', async () => {
    install(
      backupsPayload({
        readiness: {
          ...backupsPayload().readiness,
          ready: false,
          dumper_available: false,
          connection_is_owner: false,
          gaps: [
            'Install the PostgreSQL client tools so `pg_dump` is on PATH.',
            'The backup connection [pgsql] is the runtime role; row-level security would export zero rows.',
          ],
          latest_backup: null,
          completed_count: 0,
        },
      }),
    );

    renderApp('/admin/backups');

    expect(await screen.findByText('Not recoverable yet')).toBeInTheDocument();
    expect(screen.getByText(/would export zero rows/)).toBeInTheDocument();
    // Appears both as a gap and in the install hint, which is fine.
    expect(screen.getAllByText(/is on PATH/).length).toBeGreaterThan(0);
  });

  it('shows a skipped run as skipped rather than as a backup', async () => {
    renderApp('/admin/backups');

    const registry = within(await screen.findByRole('table'));

    expect(registry.getByText('family-essentials-scheduled-20261015-023000.dump')).toBeInTheDocument();
    expect(registry.getByText('skipped')).toBeInTheDocument();
    // Nothing is offered for a run that produced no file.
    expect(registry.getAllByRole('button', { name: 'Verify' })).toHaveLength(1);
  });

  it('takes a backup and reports that it was verified', async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/platform/backups') {
        return jsonResponse(
          {
            data: {
              ...backupsPayload().backups[0],
              id: 5,
              filename: 'family-essentials-manual-20261016-180000.dump',
            },
          },
          201,
        );
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/admin/backups');

    await userEvent.click(await screen.findByRole('button', { name: /take a backup now/i }));

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/backups'));
    expect(await screen.findByText(/Backup written and verified \(111 KB\)/)).toBeInTheDocument();
  });

  it('verifies and deletes an entry', async () => {
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/platform/backups/4/verify') {
        return jsonResponse({ data: backupsPayload().backups[0] });
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });
    apiMock.delete.mockImplementation(() => jsonResponse({ message: 'Backup deleted.' }));

    renderApp('/admin/backups');

    await userEvent.click(await screen.findByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/backups/4/verify'),
    );

    const registry = within(await screen.findByRole('table'));
    await userEvent.click(registry.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => expect(apiMock.delete).toHaveBeenCalled());
  });

  it('publishes the restore procedure and what it does not cover', async () => {
    renderApp('/admin/backups');

    expect(await screen.findByText('Restore procedure')).toBeInTheDocument();
    expect(screen.getByText(/pg_restore --list/)).toBeInTheDocument();
    expect(
      screen.getByText(/Uploaded files on the app disk are not in it/),
    ).toBeInTheDocument();
  });
});
