import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { sessionRoutes, tenantAdmin } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores } from '../support/session';
import { useAuthStore } from '@/stores/auth';

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

describe('sign-in', () => {
  beforeEach(() => resetStores());

  it('offers the email and password fields', async () => {
    renderApp('/login');

    expect(await screen.findByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('rejects a malformed email before calling the API', async () => {
    renderApp('/login');

    await userEvent.type(await screen.findByLabelText(/email/i), 'not-an-email');
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText(/valid email address/i)).toBeInTheDocument();
    expect(apiMock.post).not.toHaveBeenCalled();
  });

  it('signs in, stores the token and lands on the household dashboard', async () => {
    installGetRoutes(apiMock, sessionRoutes());
    apiMock.post.mockImplementation((url: string) => {
      if (url === '/v1/auth/login') {
        return jsonResponse({ user: tenantAdmin, token: 'fresh-token' });
      }

      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/login');

    await userEvent.type(await screen.findByLabelText(/email/i), tenantAdmin.email);
    await userEvent.type(screen.getByLabelText(/password/i), 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(useAuthStore.getState().token).toBe('fresh-token'));

    expect(apiMock.post).toHaveBeenCalledWith(
      '/v1/auth/login',
      expect.objectContaining({ email: tenantAdmin.email, device_name: 'web-dashboard' }),
    );

    expect(
      await screen.findByRole('heading', { name: "Today's Household Overview" }),
    ).toBeInTheDocument();
  });

  it('surfaces the API message when the credentials are rejected', async () => {
    apiMock.post.mockRejectedValue(new Error('These credentials do not match our records.'));

    renderApp('/login');

    await userEvent.type(await screen.findByLabelText(/email/i), tenantAdmin.email);
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(
      await screen.findByText('These credentials do not match our records.'),
    ).toBeInTheDocument();
    expect(useAuthStore.getState().token).toBeNull();
  });
});
