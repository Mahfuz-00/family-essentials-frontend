import { create } from 'zustand';
import { api } from '@/lib/api';
import type { Membership, Tenant } from '@/types';

interface TenantState {
  memberships: Membership[];
  active: Tenant | null;
  loaded: boolean;
  load: () => Promise<void>;
  switchTo: (tenantId: number) => Promise<void>;
  clear: () => void;
}

export const useTenantStore = create<TenantState>((set, get) => ({
  memberships: [],
  active: null,
  loaded: false,
  load: async () => {
    const { data } = await api.get<{ data: Membership[] }>('/v1/auth/tenants');
    const memberships = data.data;

    set({
      memberships,
      active: memberships.find((membership) => membership.is_active)?.tenant ?? memberships[0]?.tenant ?? null,
      loaded: true,
    });
  },
  switchTo: async (tenantId) => {
    await api.post('/v1/auth/tenant/switch', { tenant_id: tenantId });
    await get().load();
  },
  clear: () => set({ memberships: [], active: null, loaded: false }),
}));
