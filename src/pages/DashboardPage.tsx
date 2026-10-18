import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { SkeletonCard } from '@/components/ui/skeleton';
import { useQuota } from '@/hooks/useQuota';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useTenantStore } from '@/stores/tenant';
import type { RequestBoard } from '@/types';

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const active = useTenantStore((state) => state.active);

  // The plan label is the server's word for the household's tier, not a
  // presentation constant — and a platform admin has no household to ask about.
  const quota = useQuota({ enabled: user?.is_platform_admin !== true });

  const board = useQuery({
    queryKey: ['requests', 'board'],
    queryFn: async () => (await api.get<RequestBoard>('/v1/requests/board')).data,
  });

  const counts = board.data?.counts;

  const tiles = [
    { key: 'overdue', label: 'Overdue', icon: 'warning', tone: 'danger' as const },
    { key: 'due_today', label: 'Due today', icon: 'schedule', tone: 'warning' as const },
    { key: 'assigned_to_me', label: 'Assigned to me', icon: 'assignment_ind', tone: 'primary' as const },
    { key: 'completed_today', label: 'Completed today', icon: 'task_alt', tone: 'success' as const },
  ];

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          eyebrow={
            <>
              <span className="flex h-2.5 w-2.5 rounded-full bg-secondary" />
              Today · Household logistics
            </>
          }
          title="Today's Household Overview"
          description={
            active
              ? `${quota.planLabel} · ${active.member_count ?? 0} members`
              : 'No active household yet.'
          }
          actions={
            <>
              <Link to="/requests" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[14px] bg-secondary px-4 text-label-lg font-semibold text-on-secondary shadow-e1 transition-all hover:bg-primary active:scale-[0.97]">
                  <Icon name="view_kanban" className="text-[18px]" />
                  Open kanban
                </span>
              </Link>
              <Link to="/members" className="inline-flex">
                <span className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[14px] bg-sage-soft px-4 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft active:scale-[0.97]">
                  <Icon name="group" className="text-[18px]" />
                  Members
                </span>
              </Link>
            </>
          }
        />

        {board.isError && (
          <QueryError
            error={board.error}
            what="today's numbers"
            onRetry={() => void board.refetch()}
          />
        )}

        {/* Today's numbers */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {board.isLoading && tiles.map((tile) => <SkeletonCard key={tile.key} />)}

          {counts &&
            tiles.map((tile) => (
              <Link key={tile.key} to="/requests" className="inline-flex">
                <StatTile
                  label={tile.label}
                  icon={tile.icon}
                  tone={tile.tone}
                  value={counts[tile.key as keyof RequestBoard['counts']]}
                />
              </Link>
            ))}
        </section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          {/* Household */}
          <Card className="xl:col-span-2">
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                    <Icon name="cottage" className="text-[22px]" />
                  </span>
                  {/* The plan and the member count are in the header; repeating
                      them here printed the same two facts twice. */}
                  <h2 className="text-headline-sm text-on-surface">{active?.name ?? 'No household'}</h2>
                </div>
                {active && (
                  <Badge tone={active.status === 'suspended' ? 'danger' : 'success'}>{active.status}</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Link
                  to="/places"
                  className="flex items-center gap-3 rounded-xl bg-canvas p-4 transition-colors hover:bg-sage-soft"
                >
                  <Icon name="pin_drop" className="text-[20px] text-primary" />
                  <span className="flex flex-col">
                    <span className="text-label-lg text-on-surface">Saved places</span>
                    <span className="text-body-sm text-muted">Geofenced stores and home</span>
                  </span>
                </Link>

                <Link
                  to="/members"
                  className="flex items-center gap-3 rounded-xl bg-canvas p-4 transition-colors hover:bg-sage-soft"
                >
                  <Icon name="manage_accounts" className="text-[20px] text-primary" />
                  <span className="flex flex-col">
                    <span className="text-label-lg text-on-surface">Household roles</span>
                    <span className="text-body-sm text-muted">Invite and set permissions</span>
                  </span>
                </Link>
              </div>
            </div>
          </Card>

          {/* Account */}
          <Card>
            <div className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-3">
                <Avatar name={user?.name ?? 'User'} size="lg" />
                <div className="flex min-w-0 flex-col">
                  <h2 className="truncate text-headline-sm text-on-surface">{user?.name}</h2>
                  <span className="truncate text-body-sm text-muted">{user?.email}</span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={user?.email_verified ? 'success' : 'danger'}>
                    {user?.email_verified ? 'Email verified' : 'Email unverified'}
                  </Badge>
                  <Badge tone={user?.phone_verified ? 'success' : 'danger'}>
                    {user?.phone_verified ? 'Phone verified' : 'Phone unverified'}
                  </Badge>
                  <Badge tone={user?.voice_opt_in ? 'success' : 'neutral'}>
                    Voice escalation {user?.voice_opt_in ? 'on' : 'off'}
                  </Badge>
                </div>

                {/* Configuration moved to Settings; the dashboard is for the day's work. */}
                <Link to="/settings" className="inline-flex">
                  <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-sage-soft px-3.5 text-label-lg font-semibold text-secondary transition-all hover:bg-forest-soft">
                    <Icon name="tune" className="text-[16px]" />
                    Manage in settings
                  </span>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function StatTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: string;
  tone: 'danger' | 'warning' | 'primary' | 'success';
}) {
  const tones = {
    danger: 'bg-coral-soft text-error',
    warning: 'bg-sage-soft text-primary',
    primary: 'bg-forest-soft text-secondary',
    success: 'bg-forest-soft text-secondary',
  } as const;

  return (
    <Card className="flex w-full flex-col gap-3 p-5 transition-shadow hover:shadow-e2">
      <div className="flex items-center justify-between">
        <span className="text-label-sm uppercase tracking-wider text-muted">{label}</span>
        <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <span className="text-display-lg font-bold text-on-surface">{value}</span>
    </Card>
  );
}
