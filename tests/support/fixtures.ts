import type {
  AuthUser,
  Membership,
  PlatformAuditEvent,
  RequestBoard,
  ServiceRequest,
  Tenant,
  TenantMember,
  TenantRoleCatalogue,
} from '@/types';

export const household: Tenant = {
  id: 1,
  name: 'The Tanvir Household',
  slug: 'the-tanvir-household',
  status: 'active',
  subscription_tier: 'pilot',
  settings: {},
  member_count: 2,
  created_at: '2026-01-05T09:00:00.000Z',
};

export const membership: Membership = {
  tenant: household,
  role: 'tenant_admin',
  status: 'active',
  is_active: true,
};

export const tenantAdmin: AuthUser = {
  id: 1,
  name: 'Tanvir Rahman',
  email: 'tanvir@familyessentials.app',
  phone: '+15550000002',
  email_verified: true,
  phone_verified: true,
  is_platform_admin: false,
  voice_opt_in: false,
  active_tenant_id: 1,
};

export const landlord: AuthUser = {
  id: 9,
  name: 'Alex Thorne',
  email: 'platform@familyessentials.app',
  phone: '+15550000001',
  email_verified: true,
  phone_verified: true,
  is_platform_admin: true,
  voice_opt_in: false,
  active_tenant_id: null,
};

export function serviceRequest(overrides: Partial<ServiceRequest> = {}): ServiceRequest {
  return {
    id: 1,
    title: 'Organic Whole Milk',
    quantity: '2 litres',
    notes: null,
    category: 'grocery',
    priority: 'high',
    status: 'pending',
    store_name: 'Whole Foods',
    due_at: '2026-10-16T18:00:00.000Z',
    snooze_until: null,
    completed_at: null,
    created_at: '2026-10-15T09:00:00.000Z',
    item_id: null,
    assignee: { id: 1, name: 'Tanvir Rahman' },
    ...overrides,
  };
}

export function board(overrides: Partial<RequestBoard> = {}): RequestBoard {
  return {
    counts: {
      total: 4,
      open: 4,
      overdue: 1,
      due_today: 1,
      assigned_to_me: 1,
      backlog: 1,
      completed_today: 0,
    },
    overdue: [serviceRequest({ id: 1, title: 'Organic Whole Milk' })],
    // Assigned to someone else, so an assignee filter has something to exclude.
    due_today: [
      serviceRequest({
        id: 2,
        title: 'Nappies',
        priority: 'normal',
        assignee: { id: 2, name: 'Sarah Rahman' },
      }),
    ],
    assigned_to_me: [serviceRequest({ id: 3, title: 'Coffee beans', priority: 'urgent' })],
    // Open, undated, unassigned: the case that used to appear in no column at all.
    backlog: [
      serviceRequest({
        id: 4,
        title: 'Bin bags',
        priority: 'low',
        assignee: null,
        due_at: null,
      }),
    ],
    completed_today: [],
    ...overrides,
  };
}

export function member(overrides: Partial<TenantMember> = {}): TenantMember {
  return {
    id: 1,
    user_id: 1,
    name: 'Tanvir Rahman',
    email: 'tanvir@familyessentials.app',
    phone: '+15550000002',
    role: 'tenant_admin',
    status: 'active',
    joined_at: '2026-01-05T09:00:00.000Z',
    devices: [],
    open_assignments: 0,
    ...overrides,
  };
}

export function auditEvent(overrides: Partial<PlatformAuditEvent> = {}): PlatformAuditEvent {
  return {
    id: 1,
    trace_id: '01HZZZZZZZZZZZZZZZZZZZZZAA',
    occurred_at: '2026-10-16T12:00:00.000Z',
    level: 'warning',
    action: 'tenant.suspended',
    tenant_id: 1,
    tenant_name: 'The Tanvir Household',
    actor_user_id: 9,
    actor_email: 'platform@familyessentials.app',
    actor_role: 'platform_admin',
    source_ip: '127.0.0.1',
    user_agent: 'phpunit',
    http_status: 200,
    payload: { tenant: 'The Tanvir Household' },
    ...overrides,
  };
}

export function roleCatalogue(overrides: Partial<TenantRoleCatalogue> = {}): TenantRoleCatalogue {
  return {
    can_manage_roles: true,
    roles: [
      { key: 'tenant_admin', label: 'Tenant admin', detail: 'Full control', member_count: 1, can_be_granted: true },
      { key: 'co_admin', label: 'Co-admin', detail: 'Runs the household', member_count: 0, can_be_granted: true },
      { key: 'member', label: 'Household member', detail: 'Creates and completes', member_count: 1, can_be_granted: true },
      { key: 'junior', label: 'Junior', detail: 'Own requests only', member_count: 0, can_be_granted: true },
    ],
    capabilities: [
      {
        key: 'manage_roles',
        label: 'Change roles / remove members',
        detail: 'Household administration',
        access: { tenant_admin: true, co_admin: false, member: false, junior: false },
      },
      {
        key: 'dispatch_requests',
        label: 'Create & assign requests',
        detail: 'Dispatch work to another member',
        access: { tenant_admin: true, co_admin: true, member: true, junior: false },
      },
    ],
    ...overrides,
  };
}

/** The GET routes the dashboard needs once signed in. */
export function sessionRoutes() {
  return {
    '/v1/auth/me': { data: tenantAdmin },
    '/v1/auth/tenants': { data: [membership] },
    '/v1/requests/board': board(),
    '/v1/tenant/members': {
      data: [
        member(),
        member({ id: 2, user_id: 2, name: 'Sarah Rahman', email: 'sarah@familyessentials.app', role: 'member' }),
      ],
    },
    '/v1/tenant/roles': roleCatalogue(),
    '/v1/places': { data: [] },
    '/v1/voice-calls/quota': {
      used_today: 0,
      daily_budget: 10,
      max_attempts_per_request: 2,
      cooldown_minutes: 30,
    },
  };
}
