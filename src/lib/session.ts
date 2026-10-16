import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { AuthUser } from '@/types';

/**
 * Ensures the profile and the user's household memberships are loaded. Called
 * from route guards so data is present after a hard refresh.
 */
export async function ensureSession(): Promise<void> {
  const auth = useAuthStore.getState();

  if (!auth.token) {
    return;
  }

  const { data } = await api.get<{ data: AuthUser }>('/v1/auth/me');
  useAuthStore.getState().setUser(data.data);

  if (!useTenantStore.getState().loaded) {
    await useTenantStore.getState().load();
  }
}

export function resetSession(): void {
  useAuthStore.getState().logout();
  useTenantStore.getState().clear();
}
