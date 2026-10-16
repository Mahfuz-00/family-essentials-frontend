import { redirect } from '@tanstack/react-router';
import { ensureSession, resetSession } from '@/lib/session';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';

export async function requireAuth(): Promise<void> {
  if (!useAuthStore.getState().token) {
    throw redirect({ to: '/login' });
  }

  try {
    await ensureSession();
  } catch {
    resetSession();
    throw redirect({ to: '/login' });
  }
}

export async function requirePlatformAdmin(): Promise<void> {
  await requireAuth();

  if (!useAuthStore.getState().user?.is_platform_admin) {
    throw redirect({ to: '/' });
  }
}

export async function requireTenant(): Promise<void> {
  await requireAuth();

  if (!useTenantStore.getState().active) {
    throw redirect({ to: '/' });
  }
}
