import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { planFor } from '@/lib/plans';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type {
  MemberRole,
  RequestBoard,
  TenantInvitation,
  TenantMember,
} from '@/types';

type Access = 'full' | 'limited' | 'none';

// Mirrors the server-side rules: TenantUser::isAdmin/canManageMembers/isJunior
// plus ServiceRequestPolicy::assign and PlacePolicy.
const matrixRoles: { role: MemberRole; label: string }[] = [
  { role: 'tenant_admin', label: 'Tenant admin' },
  { role: 'co_admin', label: 'Co-admin' },
  { role: 'member', label: 'Member' },
  { role: 'junior', label: 'Junior' },
];

const capabilities: { label: string; detail: string; access: Record<MemberRole, Access> }[] = [
  {
    label: 'Manage billing & seats',
    detail: 'Invoices and seat licences',
    access: { tenant_admin: 'full', co_admin: 'full', member: 'none', junior: 'none' },
  },
  {
    label: 'Change roles / remove members',
    detail: 'Household administration',
    access: { tenant_admin: 'full', co_admin: 'none', member: 'none', junior: 'none' },
  },
  {
    label: 'Add saved places & geofences',
    detail: 'Grocery stores, school, home',
    access: { tenant_admin: 'full', co_admin: 'full', member: 'full', junior: 'none' },
  },
  {
    label: 'Create & assign requests',
    detail: 'Dispatch work to other members',
    access: { tenant_admin: 'full', co_admin: 'full', member: 'full', junior: 'limited' },
  },
  {
    label: 'Complete own requests',
    detail: 'Accept, start and finish assigned items',
    access: { tenant_admin: 'full', co_admin: 'full', member: 'full', junior: 'full' },
  },
  {
    label: 'Voice escalation target',
    detail: 'Automated calls for urgent items',
    access: { tenant_admin: 'full', co_admin: 'full', member: 'none', junior: 'none' },
  },
];

const accessCell: Record<Access, { label: string; className: string } | null> = {
  full: { label: 'Allowed', className: 'bg-forest-soft text-secondary' },
  limited: { label: 'Own only', className: 'bg-coral-soft text-tertiary' },
  none: null,
};

const roleOptions: { value: MemberRole; title: string; detail: string }[] = [
  { value: 'tenant_admin', title: 'Tenant admin', detail: 'Full control, including roles and billing' },
  { value: 'co_admin', title: 'Co-admin', detail: 'Runs the household, cannot change roles' },
  { value: 'member', title: 'Household member', detail: 'Creates, claims and completes requests' },
  { value: 'junior', title: 'Junior', detail: 'Raises requests, completes their own only' },
];

export function MembersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const memberships = useTenantStore((state) => state.memberships);
  const active = useTenantStore((state) => state.active);

  const [filter, setFilter] = useState<'all' | 'admin' | 'member' | 'pending'>('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ email: '', role: 'member' as MemberRole });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const activeMembership = memberships.find((membership) => membership.is_active) ?? memberships[0];
  const isAdmin = activeMembership?.role === 'tenant_admin';
  const plan = planFor(active?.subscription_tier);

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
  });

  const invitations = useQuery({
    queryKey: ['tenant', 'invitations'],
    queryFn: async () => (await api.get<{ data: TenantInvitation[] }>('/v1/tenant/invitations')).data.data,
    enabled: isAdmin,
  });

  // Live workload per member, derived from the same board the kanban renders.
  const board = useQuery({
    queryKey: ['requests', 'board'],
    queryFn: async () => (await api.get<RequestBoard>('/v1/requests/board')).data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenant'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const sendInvite = useMutation({
    mutationFn: async () => api.post('/v1/tenant/invitations', invite),
    onSuccess: async () => {
      setInvite({ email: '', role: 'member' });
      setInviteOpen(false);
      setError(null);
      setNotice('Invitation sent. We will email a secure 7-day magic link.');
      await refresh();
    },
    onError,
  });

  const revoke = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/tenant/invitations/${id}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Invitation revoked. The seat is free again.');
      await refresh();
    },
    onError,
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: MemberRole }) =>
      api.patch(`/v1/tenant/members/${userId}`, { role }),
    onSuccess: async () => {
      setError(null);
      setNotice('Role updated.');
      await refresh();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: async (userId: number) => api.delete(`/v1/tenant/members/${userId}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Member removed from the household.');
      await refresh();
    },
    onError,
  });

  const busy = sendInvite.isPending || revoke.isPending || changeRole.isPending || remove.isPending;

  const memberList = members.data ?? [];
  const invitationList = invitations.data ?? [];

  const openAssignments = useMemo(() => {
    const totals = new Map<number, number>();

    if (!board.data) {
      return totals;
    }

    for (const request of [
      ...board.data.overdue,
      ...board.data.due_today,
      ...board.data.assigned_to_me,
    ]) {
      if (request.assignee?.id) {
        totals.set(request.assignee.id, (totals.get(request.assignee.id) ?? 0) + 1);
      }
    }

    return totals;
  }, [board.data]);

  const visible = useMemo(() => {
    if (filter === 'all') {
      return memberList;
    }

    return memberList.filter((member) => member.role === filter);
  }, [memberList, filter]);

  const seatsUsed = memberList.length + invitationList.length;
  const seatsLeft = Math.max(0, plan.seatCap - seatsUsed);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Family Members & Roles']}
          title="Family Members & Roles"
          titleSize="headline"
          description="Control access, geofence pairing and urgent voice escalation for your household circle."
          actions={
            isAdmin && (
              <>
                <a href="#permissions-matrix" className="inline-flex">
                  <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[rgba(43,45,66,0.06)] bg-surface px-4 text-label-lg font-semibold text-on-surface shadow-e1 transition-all hover:bg-sage-soft active:scale-[0.97]">
                    <Icon name="shield_person" className="text-[19px] text-primary" />
                    Permissions Matrix
                  </span>
                </a>
                <Button size="lg" onClick={() => setInviteOpen(true)}>
                  <Icon name="person_add_alt" className="text-[18px]" />
                  Invite family member
                </Button>
              </>
            )
          }
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* Seat + telemetry banner */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="flex flex-col justify-between gap-3 rounded-2xl bg-forest-soft p-4 md:col-span-4">
            <span className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-label-md font-bold text-secondary">
                <Icon name="chair" className="text-[18px]" />
                Household seats
              </span>
              <span className="text-label-sm text-on-surface">
                {seatsUsed} of {plan.seatCap} used
              </span>
            </span>
            <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <span
                className="block h-2 rounded-full bg-secondary transition-all"
                style={{ width: `${Math.min(100, (seatsUsed / plan.seatCap) * 100)}%` }}
              />
            </span>
            <span className="flex items-center justify-between">
              <span className="text-label-sm text-muted">
                {seatsLeft} seat{seatsLeft === 1 ? '' : 's'} available in {plan.label}
              </span>
              <span className="text-label-sm text-muted">{plan.price}/mo catalogue</span>
            </span>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-sage-soft p-4 md:col-span-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface text-secondary shadow-e1">
              <Icon name="sensors" filled className="text-[20px]" />
            </span>
            <span className="flex flex-col">
              <span className="flex items-center gap-2 text-label-md font-bold text-on-surface">
                Telemetry & device health
                <span className="h-2 w-2 animate-pulse rounded-full bg-success" />
              </span>
              <span className="text-body-sm text-on-surface-variant">
                {memberList.length} paired {memberList.length === 1 ? 'device' : 'devices'} synced via push
                and geofence
              </span>
            </span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-coral-soft p-4 md:col-span-3">
            <span className="flex items-center gap-2">
              <Icon name="ring_volume" className="text-[20px] text-error" />
              <span className="flex flex-col">
                <span className="text-label-sm font-bold text-on-surface">Voice escalation</span>
                <span className="text-label-sm text-muted">
                  {memberList.filter((member) => member.role === 'tenant_admin').length} primary admins
                </span>
              </span>
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-label-sm font-bold text-error">
              Armed
            </span>
          </div>
        </section>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter members">
          <FilterPill active={filter === 'all'} onClick={() => setFilter('all')}>
            All Members ({memberList.length})
          </FilterPill>
          <FilterPill active={filter === 'admin'} onClick={() => setFilter('admin')}>
            Tenant Admins ({memberList.filter((m) => m.role === 'tenant_admin').length})
          </FilterPill>
          <FilterPill active={filter === 'member'} onClick={() => setFilter('member')}>
            Household Members ({memberList.filter((m) => m.role === 'member').length})
          </FilterPill>
          {isAdmin && (
            <FilterPill active={filter === 'pending'} onClick={() => setFilter('pending')}>
              Pending Invites ({invitationList.length})
            </FilterPill>
          )}
        </div>

        {members.isLoading && <p className="text-body-md text-muted">Loading members…</p>}

        {filter !== 'pending' && (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visible.map((member) => {
              const assigned = member.open_assignments ?? openAssignments.get(member.user_id) ?? 0;
              const isSelf = member.user_id === currentUser?.id;
              const devices = member.devices ?? [];

              return (
                <Card key={member.id} className="flex flex-col gap-4 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex items-center gap-3">
                      <span className="relative inline-flex">
                        <Avatar name={member.name ?? 'Member'} size="lg" />
                        <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-success ring-2 ring-surface" />
                      </span>
                      <span className="flex flex-col">
                        <span className="flex flex-wrap items-center gap-2">
                          <h3 className="text-headline-sm text-on-surface">{member.name}</h3>
                          {member.role === 'tenant_admin' && (
                            <Badge tone="primary">Primary organizer</Badge>
                          )}
                          {isSelf && <Badge tone="neutral">You</Badge>}
                        </span>
                        <span className="text-body-sm text-muted">
                          {member.role === 'tenant_admin'
                            ? 'Tenant administrator · Workspace owner'
                            : 'Household member'}
                        </span>
                      </span>
                    </span>

                    {isAdmin && !isSelf && (
                      <label className="flex items-center">
                        <span className="sr-only">Role for {member.name}</span>
                        <Select
                          className="h-10 w-auto text-body-sm"
                          value={member.role}
                          disabled={busy}
                          onChange={(event) =>
                            changeRole.mutate({
                              userId: member.user_id,
                              role: event.target.value as MemberRole,
                            })
                          }
                        >
                          <option value="tenant_admin">Tenant admin</option>
                          <option value="co_admin">Co-admin</option>
                          <option value="member">Member</option>
                          <option value="junior">Junior</option>
                        </Select>
                      </label>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <span className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                      <Icon name="mail" className="text-[18px] text-primary" />
                      <span className="truncate text-body-sm text-on-surface">{member.email ?? '—'}</span>
                    </span>
                    <span className="flex items-center gap-2 rounded-xl bg-surface-container-low p-2.5">
                      <Icon name="phone_iphone" className="text-[18px] text-primary" />
                      <span className="truncate text-body-sm text-on-surface">{member.phone ?? '—'}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {member.role === 'tenant_admin' || member.role === 'co_admin' ? (
                      <>
                        <Badge tone="danger">Voice escalation target</Badge>
                        <Badge tone="primary">Full billing</Badge>
                        <Badge tone="primary">Geofence admin</Badge>
                      </>
                    ) : member.role === 'junior' ? (
                      <>
                        <Badge tone="primary">Geofence sync</Badge>
                        <Badge tone="warning">Own requests only</Badge>
                      </>
                    ) : (
                      <>
                        <Badge tone="primary">Geofence sync</Badge>
                        <Badge tone="neutral">Can dispatch</Badge>
                      </>
                    )}
                    {member.status !== 'active' && <Badge tone="warning">{member.status}</Badge>}
                  </div>

                  {/* Real paired devices, read from the device_tokens table. */}
                  {devices.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {devices.map((device, index) => (
                        <span
                          key={`${device.platform}-${index}`}
                          className="flex items-center gap-1.5 rounded-full bg-sage-soft/70 px-2.5 py-1 text-label-sm text-on-surface-variant"
                        >
                          <Icon
                            name={device.platform === 'android' ? 'android' : 'phone_iphone'}
                            className="text-[14px]"
                          />
                          {device.platform ?? 'device'}
                          {device.last_used_at && (
                            <span className="text-muted">
                              · {new Date(device.last_used_at).toLocaleDateString()}
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-low px-3 py-2">
                    <span className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
                      <Icon name="checklist" className="text-[16px] text-primary" />
                      {assigned} assigned {assigned === 1 ? 'task' : 'tasks'} today
                    </span>

                    {isAdmin && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => remove.mutate(member.user_id)}
                        className="text-error hover:bg-coral-soft"
                      >
                        Revoke access
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}

            {visible.length === 0 && members.isSuccess && (
              <div className="xl:col-span-2">
                <EmptyState
                  title="No members in this filter"
                  description="Switch the filter, or invite someone to your household workspace."
                  action={
                    isAdmin ? (
                      <Button size="lg" onClick={() => setInviteOpen(true)}>
                        Invite family member
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </section>
        )}

        {/* Pending invitations */}
        {isAdmin && (filter === 'all' || filter === 'pending') && invitationList.length > 0 && (
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                  <Icon name="mark_email_unread" className="text-[20px]" />
                </span>
                <div className="flex flex-col">
                  <h2 className="text-headline-sm text-on-surface">Pending Invitations</h2>
                  <span className="text-body-sm text-muted">
                    A seat is held until the invite is accepted or revoked.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="primary">
                  {invitationList.length} Seat{invitationList.length === 1 ? '' : 's'} Reserved
                </Badge>
                <Button variant="soft" onClick={() => setInviteOpen(true)}>
                  Send another invite
                </Button>
              </div>
            </div>

            <ul className="mt-4 flex flex-col gap-2">
              {invitationList.map((invitation) => (
                <li
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas p-4"
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={invitation.email ?? invitation.phone ?? 'Invite'} />
                    <span className="flex flex-col">
                      <span className="text-label-lg text-on-surface">
                        {invitation.email ?? invitation.phone}
                      </span>
                      <span className="text-body-sm text-muted">
                        {invitation.role === 'tenant_admin' ? 'Tenant admin' : 'Member'} ·{' '}
                        {invitation.status}
                      </span>
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    <Badge tone="neutral">{invitation.status}</Badge>
                    {invitation.status === 'pending' && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => revoke.mutate(invitation.id)}
                      >
                        Revoke
                      </Button>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {/* Permissions matrix */}
        <Card id="permissions-matrix" className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5">
            <div>
              <h2 className="text-headline-sm text-on-surface">Household Permissions & Safeguards Matrix</h2>
              <p className="text-body-sm text-muted">
                Authorization boundaries across tracking, alerts and workspace administration.
              </p>
            </div>
            <Badge tone="primary">Row-level tenant isolation</Badge>
          </div>

          <Table className="min-w-[820px]">
            <THead>
              <TH>Capability</TH>
              {matrixRoles.map((entry) => (
                <TH key={entry.role} className="text-center">
                  {entry.label}
                </TH>
              ))}
            </THead>
            <tbody>
              {capabilities.map((capability) => (
                <TR key={capability.label}>
                  <TD>
                    <span className="flex flex-col">
                      <span className="text-label-lg text-on-surface">{capability.label}</span>
                      <span className="text-body-sm text-muted">{capability.detail}</span>
                    </span>
                  </TD>
                  {matrixRoles.map((entry) => {
                    const cell = accessCell[capability.access[entry.role]];

                    return (
                      <TD key={entry.role} className="text-center">
                        {cell ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-label-sm ${cell.className}`}
                          >
                            {capability.access[entry.role] === 'full' && (
                              <Icon name="check" className="text-[14px]" />
                            )}
                            {cell.label}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>
                    );
                  })}
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>
      </div>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a family member"
        description={`We'll email a secure 7-day magic link. ${seatsLeft} seat${
          seatsLeft === 1 ? '' : 's'
        } remaining on the ${plan.label} catalogue plan.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="lg"
              disabled={busy || invite.email.trim() === ''}
              onClick={() => sendInvite.mutate()}
            >
              {sendInvite.isPending ? 'Sending…' : 'Send invitation'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              autoFocus
              value={invite.email}
              onChange={(event) => setInvite({ ...invite, email: event.target.value })}
              placeholder="name@example.com"
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-label-lg text-on-surface">Household role</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {roleOptions.map((option) => (
                <RoleOption
                  key={option.value}
                  value={option.value}
                  current={invite.role}
                  onSelect={(role) => setInvite({ ...invite, role })}
                  title={option.title}
                  detail={option.detail}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </Modal>
    </AppLayout>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`cursor-pointer rounded-full px-3.5 py-1.5 text-label-md transition-all ${
        active
          ? 'bg-secondary font-semibold text-on-secondary shadow-e1'
          : 'bg-surface text-on-surface-variant shadow-e1 hover:bg-sage-soft'
      }`}
    >
      {children}
    </button>
  );
}

function RoleOption({
  value,
  current,
  onSelect,
  title,
  detail,
}: {
  value: MemberRole;
  current: MemberRole;
  onSelect: (role: MemberRole) => void;
  title: string;
  detail: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-0.5 rounded-xl p-3 transition-all ${
        current === value ? 'bg-forest-soft/70 shadow-e1' : 'bg-canvas hover:bg-sage-soft/60'
      }`}
    >
      <input
        type="radio"
        name="invite-role"
        value={value}
        checked={current === value}
        onChange={() => onSelect(value)}
        className="sr-only"
      />
      <span className="text-label-lg text-on-surface">{title}</span>
      <span className="text-body-sm text-muted">{detail}</span>
    </label>
  );
}
