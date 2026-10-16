import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { AuthUser } from '@/types';

/**
 * Returns the app to a signed-out, household-less state.
 *
 * Imported from test files (not from the setup file) so the stores resolve
 * against the test's mocked `@/lib/api`.
 */
export function resetStores(): void {
  localStorage.clear();

  useAuthStore.setState({ token: null, user: null });
  useTenantStore.setState({ memberships: [], active: null, loaded: false });
}

/** Seeds a signed-in session without going through the login form. */
export function signIn(user: AuthUser, token = 'test-token'): void {
  useAuthStore.setState({ token, user });
}
