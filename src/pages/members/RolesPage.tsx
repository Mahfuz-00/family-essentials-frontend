import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { Select } from '@/components/ui/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { MemberRole, TenantMember, TenantRoleCatalogue } from '@/types';

/**
 * The Roles & Permissions module.
 *
 * The matrix is fetched from /v1/tenant/roles, which is generated from the same
 * config/roles.php the policies read — so this screen cannot advertise an ability
 * the API does not enforce.
 */
export function RolesPage() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);

  const [pending, setPending] = useState<{ member: TenantMember; role: MemberRole } | null>(null);
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

  const onError = (caught: unknown) => {
    setError(apiError(caught));
    setNotice(null);
  };

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: MemberRole }) =>
      api.patch(`/v1/tenant/members/${userId}`, { role }),
    onSuccess: async () => {
      setPending(null);
      setError(null);
      setNotice('Role updated. The change is recorded in the audit ledger.');
      await queryClient.invalidateQueries({ queryKey: ['tenant'] });
    },
    onError,
  });

  const data = catalogue.data;
  const memberList = members.data ?? [];
  const canManage = data?.can_manage_roles === true;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Family Members', 'Roles & Permissions']}
          title="Roles & Permissions"
          description="What each household role may do, and who holds which role."
          titleSize="headline"
        />

        {error && <Alert>{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}
        {catalogue.isError && (
          <QueryError
            error={catalogue.error}
            what="the capability matrix"
            onRetry={() => void catalogue.refetch()}
          />
        )}
        {members.isError && (
          <QueryError
            error={members.error}
            what="the role assignment list"
            onRetry={() => void members.refetch()}
          />
        )}

        {!canManage && data && (
          <Alert tone="info">
            You can see the household's permissions, but only a tenant admin can change a role.
          </Alert>
        )}

        {/* Role catalogue */}
        <section
          aria-label="Role catalogue"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {(data?.roles ?? []).map((role) => (
            <Card key={role.key} className="flex flex-col gap-2 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-headline-sm text-on-surface">{role.label}</h2>
                <Badge tone={role.can_be_granted ? 'primary' : 'neutral'}>
                  {role.member_count} {role.member_count === 1 ? 'member' : 'members'}
                </Badge>
              </div>
              <p className="text-body-sm text-muted">{role.detail}</p>
              <span className="mt-auto text-label-sm font-mono text-muted">{role.key}</span>
            </Card>
          ))}
        </section>

        {/* Capability matrix, served by the API */}
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5">
            <div>
              <h2 className="text-headline-sm text-on-surface">Household Permissions & Safeguards Matrix</h2>
              <p className="text-body-sm text-muted">
                Served by the API from the same rules it enforces — not a static table.
              </p>
            </div>
            <Badge tone="primary">Row-level tenant isolation</Badge>
          </div>

          <Table className="min-w-[720px]">
            <THead>
              <TH>Capability</TH>
              {(data?.roles ?? []).map((role) => (
                <TH key={role.key} className="text-center">
                  {role.label}
                </TH>
              ))}
            </THead>
            <tbody>
              {(data?.capabilities ?? []).map((capability) => (
                <TR key={capability.key}>
                  <TD>
                    <span className="flex flex-col">
                      <span className="text-label-lg text-on-surface">{capability.label}</span>
                      <span className="text-body-sm text-muted">{capability.detail}</span>
                    </span>
                  </TD>
                  {(data?.roles ?? []).map((role) => (
                    <TD key={role.key} className="text-center">
                      {capability.access[role.key] ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-forest-soft text-secondary">
                          <Icon name="check" className="text-[16px]" />
                          <span className="sr-only">Allowed for {role.label}</span>
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </TD>
                  ))}
                </TR>
              ))}
            </tbody>
          </Table>
        </Card>

        {/* Who holds which role */}
        <Card className="p-5">
          <h2 className="text-headline-sm text-on-surface">Role assignment</h2>
          <p className="text-body-sm text-muted">
            {canManage
              ? 'You cannot change your own role, and a household always keeps at least one tenant admin.'
              : 'Read-only for your role.'}
          </p>

          <ul className="mt-4 flex flex-col gap-2">
            {memberList.map((member) => {
              const isSelf = member.user_id === currentUser?.id;
              const role = data?.roles.find((entry) => entry.key === member.role);

              return (
                <li
                  key={member.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-canvas px-4 py-3"
                >
                  <span className="flex items-center gap-3">
                    <Avatar name={member.name ?? 'Member'} />
                    <span className="flex flex-col">
                      <span className="text-label-lg text-on-surface">{member.name}</span>
                      <span className="text-body-sm text-muted">{role?.label ?? member.role}</span>
                    </span>
                    {isSelf && <Badge tone="neutral">You</Badge>}
                  </span>

                  {canManage && !isSelf ? (
                    <label className="flex items-center gap-2">
                      <span className="sr-only">Role for {member.name}</span>
                      <Select
                        className="h-10 w-auto text-body-sm"
                        value={member.role}
                        disabled={changeRole.isPending}
                        onChange={(event) =>
                          setPending({ member, role: event.target.value as MemberRole })
                        }
                      >
                        {(data?.roles ?? []).map((option) => (
                          <option key={option.key} value={option.key} disabled={!option.can_be_granted}>
                            {option.label}
                            {option.can_be_granted ? '' : ' (owner only)'}
                          </option>
                        ))}
                      </Select>
                    </label>
                  ) : (
                    <Badge tone="primary">{role?.label ?? member.role}</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      {/* A role change is consequential, so it is confirmed rather than applied on change. */}
      <Modal
        open={pending !== null}
        onClose={() => setPending(null)}
        title="Change this role?"
        description={
          pending
            ? `${pending.member.name} will become ${pending.role.replace('_', ' ')}. The change is audited.`
            : ''
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button
              disabled={changeRole.isPending}
              onClick={() =>
                pending &&
                changeRole.mutate({ userId: pending.member.user_id, role: pending.role })
              }
            >
              {changeRole.isPending ? 'Saving…' : 'Change role'}
            </Button>
          </>
        }
      />
    </AppLayout>
  );
}
