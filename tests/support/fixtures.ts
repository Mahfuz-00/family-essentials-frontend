import type {
  AuthUser,
  BackupsPayload,
  FeedbackReport,
  Membership,
  OpsHealth,
  Place,
  PlatformAuditEvent,
  PlatformFeedbackReport,
  QuotaReport,
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

export function opsHealth(overrides: Partial<OpsHealth> = {}): OpsHealth {
  return {
    report: {
      status: 'fail',
      checked_at: '2026-10-16T12:00:00.000Z',
      checks: [
        {
          key: 'database',
          label: 'Database',
          status: 'fail',
          message: 'Round trip 1200 ms',
          value: 1200,
          unit: 'ms',
        },
        {
          key: 'migrations',
          label: 'Schema',
          status: 'ok',
          message: 'All migrations applied',
          value: 0,
          unit: 'pending',
        },
        {
          key: 'queue',
          label: 'Queue',
          status: 'warn',
          message: '3 queued · 2 failed (database driver)',
          value: 3,
          unit: 'queued',
        },
        {
          key: 'scheduler',
          label: 'Scheduler',
          status: 'ok',
          message: 'Heartbeat just now',
          value: 0,
          unit: 'min',
        },
        {
          key: 'cache',
          label: 'Cache',
          status: 'ok',
          message: 'database store read and wrote in one round trip',
        },
        {
          key: 'storage',
          label: 'Storage',
          status: 'ok',
          message: '42% free (100 GB of 240 GB)',
          value: 42,
          unit: '% free',
        },
        {
          key: 'runtime',
          label: 'Runtime',
          status: 'warn',
          message: 'PHP 8.4.0 · Laravel 13.0.0',
          details: { php: '8.4.0', laravel: '13.0.0', environment: 'local' },
        },
      ],
    },
    history: {
      uptime_percent: 75,
      samples: [
        { checked_at: '2026-10-16T10:00:00.000Z', status: 'ok' },
        { checked_at: '2026-10-16T10:05:00.000Z', status: 'ok' },
        { checked_at: '2026-10-16T10:10:00.000Z', status: 'ok' },
        { checked_at: '2026-10-16T10:15:00.000Z', status: 'fail' },
      ],
    },
    failed_jobs: [
      {
        id: 7,
        uuid: 'a1b2c3',
        queue: 'default',
        failed_at: '2026-10-16T11:00:00.000Z',
        reason: 'Too many attempts',
      },
    ],
    incidents: [
      {
        id: 1,
        title: 'Queue worker restarted',
        severity: 'major',
        status: 'investigating',
        body: 'Redis connection dropped for 3 minutes.',
        started_at: '2026-10-16T11:30:00.000Z',
        resolved_at: null,
        duration_minutes: 12,
        author: { id: 9, name: 'Alex Thorne' },
      },
    ],
    ...overrides,
  };
}

export function backupsPayload(overrides: Partial<BackupsPayload> = {}): BackupsPayload {
  return {
    readiness: {
      ready: true,
      gaps: [],
      driver: 'pg_dump',
      dumper_available: true,
      requirement: 'Install the PostgreSQL client tools…',
      connection: 'pgsql_admin',
      connection_is_owner: true,
      disk: 'local',
      directory: 'backups',
      destination_writable: true,
      retention_days: 30,
      rpo_hours: 24,
      rto_minutes: 120,
      latest_backup: {
        id: 4,
        filename: 'backups/family-essentials-manual-20261016-171327.dump',
        started_at: '2026-10-16T17:13:27.000Z',
        age_hours: 0,
        size_bytes: 113_669,
        restorable: true,
      },
      completed_count: 1,
    },
    backups: [
      {
        id: 4,
        filename: 'family-essentials-manual-20261016-171327.dump',
        path: 'backups/family-essentials-manual-20261016-171327.dump',
        disk: 'local',
        driver: 'pg_dump',
        type: 'manual',
        status: 'completed',
        size_bytes: 113_669,
        checksum: 'a'.repeat(64),
        started_at: '2026-10-16T17:13:27.000Z',
        finished_at: '2026-10-16T17:13:28.000Z',
        duration_seconds: 1,
        error: null,
        verified_at: '2026-10-16T17:13:28.000Z',
        verify_error: null,
        restorable: true,
        has_drifted: false,
        created_by: { id: 9, name: 'Alex Thorne' },
      },
      {
        id: 3,
        filename: 'family-essentials-scheduled-20261015-023000.dump',
        path: 'backups/family-essentials-scheduled-20261015-023000.dump',
        disk: 'local',
        driver: 'pg_dump',
        type: 'scheduled',
        status: 'skipped',
        size_bytes: null,
        checksum: null,
        started_at: '2026-10-15T02:30:00.000Z',
        finished_at: '2026-10-15T02:30:00.000Z',
        duration_seconds: 0,
        error: 'Install the PostgreSQL client tools so `pg_dump` is on PATH.',
        verified_at: null,
        verify_error: null,
        restorable: false,
        has_drifted: false,
      },
    ],
    runbook: {
      iaas: 'The dump is a logical backup of the database only. Uploaded files on the app disk are not in it.',
      rpo_hours: 24,
      rto_minutes: 120,
      retention_days: 30,
      steps: [
        { label: 'Inspect the dump without restoring it', command: 'pg_restore --list backups/<file>.dump' },
        {
          label: 'Restore into a scratch database first',
          command: 'createdb family_essentials_restore && pg_restore --dbname=family_essentials_restore …',
        },
      ],
    },
    ...overrides,
  };
}

export function place(overrides: Partial<Place> = {}): Place {
  return {
    id: 1,
    name: 'Whole Foods',
    address: '12 Main Street',
    latitude: 23.8103,
    longitude: 90.4125,
    radius_meters: 300,
    category: 'grocery',
    // Derived by the API from `category` — the client only displays it.
    kind: 'store',
    kind_label: 'Store',
    active_requests_count: 0,
    created_at: '2026-10-16T09:00:00.000Z',
    ...overrides,
  };
}

export function quotaReport(overrides: Partial<QuotaReport> = {}): QuotaReport {
  return {
    plan: {
      key: 'pilot',
      label: 'Pilot Family Tier',
      price: '$14.99',
      cadence: 'per month',
      seat_cap: 5,
      place_cap: 10,
      monthly_requests: 300,
    },
    enforced: true,
    usage: {
      members: 2,
      seats_reserved: 0,
      places: 0,
      essentials: 0,
      requests_this_month: 3,
      voice_calls_today: 0,
    },
    meters: [
      {
        key: 'seats',
        label: 'Family member seats',
        icon: 'group',
        used: 2,
        cap: 5,
        remaining: 3,
        at_cap: false,
        percent: 40,
        detail: { members: 2, reserved_by_invitations: 0 },
      },
      {
        key: 'places',
        label: 'Saved places',
        icon: 'pin_drop',
        used: 0,
        cap: 10,
        remaining: 10,
        at_cap: false,
        percent: 0,
        detail: {},
      },
      {
        key: 'requests',
        label: 'Requests this month',
        icon: 'shopping_bag',
        used: 3,
        cap: 300,
        remaining: 297,
        at_cap: false,
        percent: 1,
        detail: {},
      },
      {
        key: 'voice',
        label: 'Voice calls today',
        icon: 'ring_volume',
        used: 0,
        cap: 10,
        remaining: 10,
        at_cap: false,
        percent: 0,
        detail: {},
      },
    ],
    at_cap: [],
    period: {
      requests_since: '2026-10-01T00:00:00.000Z',
      voice_since: '2026-10-16T00:00:00.000Z',
    },
    ...overrides,
  };
}

export function feedbackReport(overrides: Partial<FeedbackReport> = {}): FeedbackReport {
  return {
    id: 1,
    type: 'bug',
    priority: 'high',
    status: 'new',
    subject: 'Shopping list loses items',
    body: 'Adding three items then reloading shows only two of them.',
    context: { platform: 'web', screen: '/requests' },
    resolution_note: null,
    resolved_at: null,
    reporter: { id: 9, name: 'Tanvir Ahmed' },
    created_at: '2026-10-16T09:00:00.000Z',
    updated_at: '2026-10-16T09:00:00.000Z',
    ...overrides,
  };
}

export function platformFeedbackReport(
  overrides: Partial<PlatformFeedbackReport> = {},
): PlatformFeedbackReport {
  return {
    ...feedbackReport(),
    age_hours: 6,
    tenant: { id: 1, name: 'The Tanvir Household', subscription_tier: 'pilot', status: 'active' },
    reporter: { id: 9, name: 'Tanvir Ahmed', email: 'tanvir@familyessentials.app' },
    resolver: null,
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
    // AppLayout reads the seat cap from here on every page.
    '/v1/tenant/quotas': quotaReport(),
    '/v1/feedback': { data: [], summary: { total: 0, open: 0, last_sent_at: null } },
    '/v1/places': { data: [] },
    '/v1/voice-calls/quota': {
      used_today: 0,
      daily_budget: 10,
      max_attempts_per_request: 2,
      cooldown_minutes: 30,
    },
  };
}
