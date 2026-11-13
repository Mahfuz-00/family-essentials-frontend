import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { AuthUser } from '@/types';

let sessionHydrated = false;

/**
 * Ensures the profile and the user's household memberships are loaded once per
 * session. Subsequent route transitions resolve immediately from the stores so
 * clicking a sidebar module switches to the target page and its loading
 * skeleton on the very next frame instead of lingering on the previous screen.
 */
export async function ensureSession(): Promise<void> {
  const auth = useAuthStore.getState();

  if (!auth.token) {
    return;
  }

  if (!sessionHydrated || !auth.user) {
    const { data } = await api.get<{ data: AuthUser }>('/v1/auth/me');
    useAuthStore.getState().setUser(data.data);
    sessionHydrated = true;
  }

  if (!useTenantStore.getState().loaded) {
    await useTenantStore.getState().load();
  }
}

export function resetSession(): void {
  sessionHydrated = false;
  useAuthStore.getState().logout();
  useTenantStore.getState().clear();
}
