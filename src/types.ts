export interface AuthUser {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  is_platform_admin: boolean;
  voice_opt_in: boolean;
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
    overdue: number;
    due_today: number;
    assigned_to_me: number;
    completed_today: number;
  };
  overdue: ServiceRequest[];
  due_today: ServiceRequest[];
  assigned_to_me: ServiceRequest[];
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
