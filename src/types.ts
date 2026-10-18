export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  is_platform_admin: boolean;
  voice_opt_in: boolean;
  location_notifications_opt_in?: boolean;
  active_tenant_id: number | null;
}

export type TenantStatus = 'trial' | 'active' | 'suspended';
export type MemberRole = 'tenant_admin' | 'co_admin' | 'member' | 'junior';

export interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: TenantStatus;
  subscription_tier: string;
  settings: Record<string, unknown>;
  member_count?: number;
  trial_ends_at?: string | null;
  suspended_at?: string | null;
  created_at: string;
}

export interface Membership {
  tenant: Tenant;
  role: MemberRole;
  status: string;
  is_active: boolean;
}

export interface MemberDevice {
  platform: string | null;
  last_used_at: string | null;
}

/** A row of the capability matrix, served by /v1/tenant/roles. */
export interface TenantCapability {
  key: string;
  label: string;
  detail: string;
  access: Record<string, boolean>;
}

export interface TenantRole {
  key: MemberRole;
  label: string;
  detail: string;
  member_count: number;
  /** False when the caller may not grant this role (a co-admin cannot grant admin). */
  can_be_granted: boolean;
}

export interface TenantRoleCatalogue {
  can_manage_roles: boolean;
  roles: TenantRole[];
  capabilities: TenantCapability[];
}

export interface TenantMember {
  id: number;
  user_id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: MemberRole;
  status: string;
  joined_at: string | null;
  devices?: MemberDevice[];
  open_assignments?: number;
}

export interface TenantInvitation {
  id: number;
  email: string | null;
  phone: string | null;
  role: MemberRole;
  status: 'pending' | 'accepted';
  expires_at: string | null;
  created_at: string;
}

export interface AuditMetrics {
  events_24h: number;
  critical_24h: number;
  warning_24h: number;
  denied_platform_access_24h: number;
  total: number;
  oldest: string | null;
}

export interface PlatformMetrics {
  total_tenants: number;
  by_status: Record<string, number>;
  by_tier: Record<string, number>;
  active_members: number;
  audit?: AuditMetrics;
}

export type AuditLevel = 'info' | 'warning' | 'critical';

export interface PlatformAuditEvent {
  id: number;
  trace_id: string;
  occurred_at: string;
  level: AuditLevel;
  action: string;
  tenant_id: number | null;
  tenant_name?: string | null;
  actor_user_id: number | null;
  actor_email: string | null;
  actor_role: string | null;
  source_ip: string | null;
  user_agent: string | null;
  http_status: number | null;
  payload: Record<string, unknown> | null;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface VoiceQuota {
  used_today: number;
  daily_budget: number;
  max_attempts_per_request: number;
  cooldown_minutes: number;
}

/* ------------------------------------------------------------------ ops --- */

export type OpsStatus = 'ok' | 'warn' | 'fail';

export interface OpsCheck {
  key: string;
  label: string;
  status: OpsStatus;
  message: string;
  value?: number;
  unit?: string;
  details?: Record<string, unknown>;
}

export interface OpsReport {
  status: OpsStatus;
  checked_at: string;
  checks: OpsCheck[];
}

export interface FailedJob {
  id: number;
  uuid: string;
  queue: string;
  failed_at: string;
  reason: string;
}

export type IncidentSeverity = 'minor' | 'major' | 'critical';
export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

export interface Incident {
  id: number;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  body: string | null;
  started_at: string;
  resolved_at: string | null;
  duration_minutes: number | null;
  author?: { id: number; name: string } | null;
}

export interface OpsHealth {
  report: OpsReport;
  history: {
    uptime_percent: number | null;
    samples: { checked_at: string; status: OpsStatus }[];
  };
  failed_jobs: FailedJob[];
  incidents: Incident[];
}

/* --------------------------------------------------------------- backups --- */

export type BackupStatus = 'running' | 'completed' | 'failed' | 'skipped';

export interface BackupRecord {
  id: number;
  filename: string;
  path: string;
  disk: string;
  driver: string;
  type: 'manual' | 'scheduled' | 'pre_restore';
  status: BackupStatus;
  size_bytes: number | null;
  checksum: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  error: string | null;
  verified_at: string | null;
  verify_error: string | null;
  /** Verified by re-checksumming the file, not merely created. */
  restorable: boolean;
  has_drifted: boolean;
  created_by?: { id: number; name: string } | null;
}

export interface BackupReadiness {
  ready: boolean;
  gaps: string[];
  driver: string;
  dumper_available: boolean;
  requirement: string;
  connection: string;
  connection_is_owner: boolean;
  disk: string;
  directory: string;
  destination_writable: boolean;
  retention_days: number;
  rpo_hours: number;
  rto_minutes: number;
  latest_backup: {
    id: number;
    filename: string;
    started_at: string | null;
    age_hours: number | null;
    size_bytes: number | null;
    restorable: boolean;
  } | null;
  completed_count: number;
}

export interface BackupRunbook {
  iaas: string;
  rpo_hours: number;
  rto_minutes: number;
  retention_days: number;
  steps: { label: string; command: string }[];
}

export interface BackupsPayload {
  readiness: BackupReadiness;
  backups: BackupRecord[];
  runbook: BackupRunbook;
}

/* -------------------------------------------------------------- feedback --- */

export type FeedbackType = 'bug' | 'feedback' | 'feature_request';
export type FeedbackPriority = 'low' | 'normal' | 'high' | 'critical';
export type FeedbackStatus = 'new' | 'triaged' | 'in_progress' | 'resolved' | 'wont_fix';

export interface FeedbackReport {
  id: number;
  type: FeedbackType;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  subject: string;
  body: string;
  context: Record<string, string> | null;
  resolution_note: string | null;
  resolved_at: string | null;
  reporter?: { id: number; name: string } | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface FeedbackPayload {
  data: FeedbackReport[];
  summary: {
    total: number;
    open: number;
    last_sent_at: string | null;
  };
}

export interface PlatformFeedbackReport extends FeedbackReport {
  age_hours: number | null;
  tenant?: {
    id: number;
    name: string;
    subscription_tier: string;
    status: TenantStatus;
  } | null;
  reporter?: { id: number; name: string; email: string } | null;
  resolver?: { id: number; name: string } | null;
}

export interface PlatformFeedbackPayload {
  data: PlatformFeedbackReport[];
  summary: {
    open: number;
    total: number;
    critical_open: number;
    unseen: number;
    oldest_open_at: string | null;
    by_status: Record<string, number>;
    by_type: Record<string, number>;
  };
}

/* ----------------------------------------------------------------- quotas --- */

export interface QuotaMeter {
  key: 'seats' | 'places' | 'requests' | 'voice';
  label: string;
  icon: string;
  used: number;
  cap: number;
  remaining: number;
  at_cap: boolean;
  percent: number;
  detail: Record<string, number>;
}

export interface QuotaReport {
  /** Limits the API enforces — not a presentation catalogue. */
  plan: {
    key: string;
    label: string;
    price: string;
    cadence: string;
    seat_cap: number;
    place_cap: number;
    monthly_requests: number;
  };
  enforced: boolean;
  usage: {
    members: number;
    seats_reserved: number;
    places: number;
    essentials: number;
    requests_this_month: number;
    voice_calls_today: number;
  };
  meters: QuotaMeter[];
  at_cap: string[];
  period: { requests_since: string; voice_since: string };
}

export type RequestStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'unavailable';

export type RequestPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Item {
  id: number;
  name: string;
  category: string | null;
  default_store: string | null;
  quantity_hint: string | null;
}

export interface UserRef {
  id: number;
  name: string | null;
}

export interface Assignment {
  id: number;
  action: string;
  note: string | null;
  assigned_to?: UserRef | null;
  assigned_by?: UserRef | null;
  created_at: string;
}

export interface ServiceRequest {
  id: number;
  title: string;
  quantity: string | null;
  notes: string | null;
  category: string | null;
  priority: RequestPriority;
  status: RequestStatus;
  store_name: string | null;
  due_at: string | null;
  snooze_until: string | null;
  completed_at: string | null;
  created_at: string;
  item_id: number | null;
  item?: Item;
  requested_by?: UserRef | null;
  assignee?: UserRef | null;
  history?: Assignment[];
}

export interface RequestBoard {
  counts: {
    total: number;
    open: number;
    overdue: number;
    due_today: number;
    assigned_to_me: number;
    backlog: number;
    completed_today: number;
  };
  overdue: ServiceRequest[];
  due_today: ServiceRequest[];
  assigned_to_me: ServiceRequest[];
  backlog: ServiceRequest[];
  completed_today: ServiceRequest[];
}

export interface Place {
  id: number;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  category: string | null;
  /** Notification-facing classification, derived from `category` by the API. */
  kind?: string | null;
  kind_label?: string | null;
  active_requests_count?: number;
  created_at: string;
}

export interface GeofenceEvent {
  id: number;
  event: 'enter' | 'exit';
  occurred_at: string;
  place?: { id: number; name: string } | null;
  user?: { id: number; name: string } | null;
}

export interface GeofenceEvaluation {
  transitions: { place_id: number; event: 'enter' | 'exit'; distance_meters: number }[];
  shopping_lists: { place: Place; requests: ServiceRequest[] }[];
  /** What the server decided on this report: one per entry, sent or refused. */
  location_notifications?: LocationArrival[];
}

/** One arrival decision: what was sent, or why nothing was. */
export interface LocationArrival {
  id: number;
  place_id: number;
  place_name: string | null;
  kind: 'home' | 'office' | 'store' | 'other';
  kind_label: string;
  status: 'queued' | 'sent' | 'skipped' | 'failed';
  reason: string | null;
  reason_message: string | null;
  title: string | null;
  body: string | null;
  task_count: number;
  tasks?: { id: number; title: string; quantity: string | null; status: string }[];
  notified_at: string | null;
}

export interface VoiceCall {
  id: number;
  status: string;
  reason: string | null;
  provider: string | null;
  provider_call_id: string | null;
  attempts: number;
  duration_seconds: number | null;
  error: string | null;
  initiated_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  created_at: string;
  request?: { id: number; title: string } | null;
}

/* ------------------------------------------------------- recurring rules --- */

export type RecurringCadence = 'daily' | 'weekly' | 'monthly';

/** Which side of a geofence fires the reminder: arriving or leaving. */
export type LocationTriggerDirection = 'enter' | 'exit';

export interface RecurringRule {
  id: number;
  title: string;
  quantity: string | null;
  notes: string | null;
  category: string | null;
  priority: RequestPriority;
  cadence: RecurringCadence;
  /**
   * ISO-8601 weekday used when `cadence` is `weekly`: 1 = Monday … 7 = Sunday.
   * The contract does not state the encoding; the client also tolerates `0` as
   * Sunday (the JavaScript habit) and renders "Every week" for anything else.
   */
  weekday: number | null;
  day_of_month: number | null;
  active: boolean;
  next_run_on: string | null;
  last_run_on: string | null;
  assignee: UserRef | null;
  place: { id: number; name: string } | null;
  location_trigger: {
    place_id: number;
    place_name: string;
    direction: LocationTriggerDirection;
  } | null;
  amount_minor: number | null;
  ledger_id: number | null;
}

/* --------------------------------------------------------------- ledgers --- */

/** What the caller may do with a ledger. `summary` sees totals, never entries. */
export type LedgerRole = 'owner' | 'manager' | 'summary';

export interface Ledger {
  id: number;
  name: string;
  currency: string;
  my_role: LedgerRole;
  member_count: number;
}

export interface LedgerCategoryTotal {
  label: string;
  expense_minor: number;
  /** Fraction of the period's expense, 0–1. */
  share: number;
}

export interface LedgerSummary {
  currency: string;
  from: string;
  to: string;
  expense_minor: number;
  income_minor: number;
  net_minor: number;
  entry_count: number;
  by_category: LedgerCategoryTotal[];
}

export type LedgerEntryDirection = 'expense' | 'income';

export interface LedgerEntry {
  id: number;
  amount_minor: number;
  direction: LedgerEntryDirection;
  category: string | null;
  description: string | null;
  occurred_on: string;
  source: string | null;
  paid_by: UserRef | null;
}

/** The roles an owner may grant through the members endpoint. */
export type LedgerGrantRole = 'manager' | 'summary';
