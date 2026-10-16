import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { api, apiError } from '@/lib/api';
import { useQuota } from '@/hooks/useQuota';
import { planFor } from '@/lib/plans';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { MemberRole, TenantMember, TenantRoleCatalogue } from '@/types';

/**
 * The household roster: who is in the circle, what they can reach, and what they
 * are carrying. Roles and invitations are their own modules — this page used to
 * carry six concerns, which made all of them harder to find.
 */
export function MembersPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const active = useTenantStore((state) => state.active);
  const plan = planFor(active?.subscription_tier);

  const [filter, setFilter] = useState<'all' | MemberRole>('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
  });

  const catalogue = useQuery({
    queryKey: ['tenant', 'roles'],
    queryFn: async () => (await api.get<TenantRoleCatalogue>('/v1/tenant/roles')).data,
  });

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const remove = useMutation({
    mutationFn: async (userId: number) => api.delete(`/v1/tenant/members/${userId}`),
    onSuccess: async () => {
      setError(null);
      setNotice('Member removed from the household.');
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
    onError,
  });

  const memberList = members.data ?? [];
  const canManage = catalogue.data?.can_manage_roles === true;

  const visible = useMemo(() => {
    if (filter === 'all') {
      return memberList;
    }

    return memberList.filter((member) => member.role === filter);
  }, [memberList, filter]);

  const roleLabel = (role: MemberRole) =>
    catalogue.data?.roles.find((entry) => entry.key === role)?.label ?? role;

  const seatsUsed = memberList.length;
  // The cap comes from the API, which is also what refuses the next invitation.
  const quota = useQuota();
  const seatCap = quota.capFor('seats', plan.seatCap);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Workspace', 'Family Members']}
          title="Family Members"
          description="Who is in the household circle, and what they are carrying this week."
          titleSize="headline"
          actions={
            <>
              <Link to="/members/roles" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[rgba(43,45,66,0.06)] bg-surface px-4 text-label-lg font-semibold text-on-surface shadow-e1 transition-all hover:bg-sage-soft active:scale-[0.97]">
                  <Icon name="shield_person" className="text-[19px] text-primary" />
                  Roles & permissions
                </span>
              </Link>
              <Link to="/members/invitations" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary active:scale-[0.97]">
                  <Icon name="person_add_alt" className="text-[18px]" />
                  Invitations
                </span>
              </Link>
            </>
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
                {seatsUsed} of {seatCap} used
              </span>
            </span>
            <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-container">
              <span
                className="block h-2 rounded-full bg-secondary transition-all"
                style={{ width: `${Math.min(100, (seatsUsed / seatCap) * 100)}%` }}
              />
            </span>
            <span className="flex items-center justify-between">
              <span className="text-label-sm text-muted">
                {Math.max(0, seatCap - seatsUsed)} seat
                {seatCap - seatsUsed === 1 ? '' : 's'} available in {plan.label}
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
                {memberList.reduce((total, member) => total + (member.devices?.length ?? 0), 0)} paired
                devices synced via push and geofence
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
            All members ({memberList.length})
          </FilterPill>
          {(catalogue.data?.roles ?? []).map((role) => {
            const total = memberList.filter((member) => member.role === role.key).length;

            return (
              <FilterPill
                key={role.key}
                active={filter === role.key}
                onClick={() => setFilter(role.key)}
              >
                {role.label} ({total})
              </FilterPill>
            );
          })}
        </div>

        {members.isLoading && <p className="text-body-md text-muted">Loading members…</p>}

        {visible.length === 0 && members.isSuccess ? (
          <EmptyState
            title={filter === 'all' ? 'No members yet' : 'Nobody holds this role'}
            description={
              filter === 'all'
                ? 'Invite your household so requests have someone to land with.'
                : 'Pick another role, or change who holds this one from Roles & permissions.'
            }
            action={
              <Link to="/members/invitations" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-xl bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary">
                  <Icon name="person_add_alt" className="text-[18px]" />
                  Invite a family member
                </span>
              </Link>
            }
          />
        ) : (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {visible.map((member) => {
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
                          <h2 className="text-headline-sm text-on-surface">{member.name}</h2>
                          {isSelf && <Badge tone="neutral">You</Badge>}
                        </span>
                        <span className="text-body-sm text-muted">{roleLabel(member.role)}</span>
                      </span>
                    </span>
                    {member.status !== 'active' && <Badge tone="warning">{member.status}</Badge>}
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
                      {member.open_assignments ?? 0} assigned{' '}
                      {(member.open_assignments ?? 0) === 1 ? 'task' : 'tasks'} today
                    </span>

                    {canManage && !isSelf && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
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
          </section>
        )}
      </div>
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
