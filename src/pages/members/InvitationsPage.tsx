import { useState } from 'react';
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
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { api, apiError } from '@/lib/api';
import { useQuota } from '@/hooks/useQuota';
import type { MemberRole, TenantInvitation, TenantMember, TenantRoleCatalogue } from '@/types';

/**
 * The Invitations module: issuing, tracking and revoking household invitations.
 * Split out of the members page, which was carrying six unrelated concerns.
 */
export function InvitationsPage() {
  const queryClient = useQueryClient();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const catalogue = useQuery({
    queryKey: ['tenant', 'roles'],
    queryFn: async () => (await api.get<TenantRoleCatalogue>('/v1/tenant/roles')).data,
  });

  const members = useQuery({
    queryKey: ['tenant', 'members'],
    queryFn: async () => (await api.get<{ data: TenantMember[] }>('/v1/tenant/members')).data.data,
  });

  const invitations = useQuery({
    queryKey: ['tenant', 'invitations'],
    queryFn: async () =>
      (await api.get<{ data: TenantInvitation[] }>('/v1/tenant/invitations')).data.data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tenant'] });
  };

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const send = useMutation({
    mutationFn: async () => api.post('/v1/tenant/invitations', { email, role }),
    onSuccess: async () => {
      setEmail('');
      setRole('member');
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

  const memberCount = members.data?.length ?? 0;
  const invitationList = invitations.data ?? [];
  const pending = invitationList.filter((invitation) => invitation.status === 'pending');
  // Label and cap come from the API, which is what refuses the next invitation.
  const quota = useQuota();
  const seatCap = quota.capFor('seats');
  const seatsUsed = memberCount + pending.length;
  const seatsLeft = seatCap === null ? null : Math.max(0, seatCap - seatsUsed);

  const grantable = (catalogue.data?.roles ?? []).filter((entry) => entry.can_be_granted);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Members', 'Invitations']}
          title="Invitations"
          description="Issue a magic link, and keep track of who has not accepted yet."
          titleSize="headline"
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {members.isError && (
          <QueryError error={members.error} what="the member list" onRetry={() => void members.refetch()} />
        )}
        {invitations.isError && (
          <QueryError
            error={invitations.error}
            what="the invitation list"
            onRetry={() => void invitations.refetch()}
          />
        )}

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Invite */}
          <Card className="flex flex-col gap-4 p-5 lg:col-span-2">
            <div>
              <h2 className="text-headline-sm text-on-surface">Invite a family member</h2>
              <p className="text-body-sm text-muted">
                They get a secure 7-day magic link. A seat is held until they accept or you revoke it.
              </p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                />
              </div>
              <Button
                size="lg"
                disabled={send.isPending || email.trim() === ''}
                onClick={() => send.mutate()}
              >
                <Icon name="person_add_alt" className="text-[18px]" />
                {send.isPending ? 'Sending…' : 'Send invitation'}
              </Button>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-label-lg text-on-surface">Household role</legend>
              {catalogue.isError && (
                <QueryError
                  error={catalogue.error}
                  what="the role list"
                  onRetry={() => void catalogue.refetch()}
                />
              )}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {grantable.map((option) => (
                  <label
                    key={option.key}
                    className={`flex cursor-pointer flex-col gap-0.5 rounded-xl p-3 transition-all ${
                      role === option.key ? 'bg-forest-soft/70 shadow-e1' : 'bg-canvas hover:bg-sage-soft/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="invite-role"
                      value={option.key}
                      checked={role === option.key}
                      onChange={() => setRole(option.key)}
                      className="sr-only"
                    />
                    <span className="text-label-lg text-on-surface">{option.label}</span>
                    <span className="text-body-sm text-muted">{option.detail}</span>
                  </label>
                ))}
              </div>
              {catalogue.data && !catalogue.data.can_manage_roles && (
                <p className="text-body-sm text-muted">
                  Admin roles are granted by the tenant admin only.
                </p>
              )}
            </fieldset>
          </Card>

          {/* Seats */}
          <Card className="flex flex-col gap-3 p-5">
            <h2 className="text-headline-sm text-on-surface">Seats</h2>
            <span className="flex items-baseline gap-1.5">
              <span className="text-display-lg font-bold text-on-surface">{seatsUsed}</span>
              <span className="text-body-md text-muted">
                {seatCap === null ? 'used' : `of ${seatCap} used`}
              </span>
            </span>
            {seatCap !== null && (
              <span className="block h-2 w-full overflow-hidden rounded-full bg-surface-container">
                <span
                  className="block h-2 rounded-full bg-secondary transition-all"
                  style={{ width: `${Math.min(100, (seatsUsed / seatCap) * 100)}%` }}
                />
              </span>
            )}
            <span className="text-body-sm text-muted">
              {seatsLeft === null
                ? 'The API has not reported the seat cap, so the remaining seats are unknown.'
                : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} available on the ${
                    quota.planLabel
                  } plan — the API refuses an invitation past this.`}
            </span>
            <span className="text-body-sm text-muted">
              {memberCount} active {memberCount === 1 ? 'member' : 'members'} · {pending.length} pending
            </span>
          </Card>
        </section>

        {/* Pending */}
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-container-low text-primary">
                <Icon name="mark_email_unread" className="text-[20px]" />
              </span>
              <div className="flex flex-col">
                <h2 className="text-headline-sm text-on-surface">Pending invitations</h2>
                <span className="text-body-sm text-muted">Awaiting acceptance.</span>
              </div>
            </div>
            <Badge tone={pending.length > 0 ? 'primary' : 'neutral'}>
              {pending.length} seat{pending.length === 1 ? '' : 's'} reserved
            </Badge>
          </div>

          {invitations.isSuccess && pending.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No invitations waiting"
                description="When you invite someone, their invitation appears here until they accept or you revoke it."
              />
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {pending.map((invitation) => (
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
                        {invitation.role === 'tenant_admin' ? 'Tenant admin' : invitation.role} ·
                        sent {new Date(invitation.created_at).toLocaleDateString()}
                      </span>
                    </span>
                  </span>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revoke.isPending}
                    onClick={() => revoke.mutate(invitation.id)}
                  >
                    Revoke
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* History */}
        {invitationList.length > pending.length && (
          <Card className="p-5">
            <h2 className="text-headline-sm text-on-surface">Past invitations</h2>
            <ul className="mt-4 flex flex-col gap-2">
              {invitationList
                .filter((invitation) => invitation.status !== 'pending')
                .map((invitation) => (
                  <li
                    key={invitation.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3"
                  >
                    <span className="text-body-md text-on-surface">
                      {invitation.email ?? invitation.phone}
                    </span>
                    <Badge tone="success">{invitation.status}</Badge>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
