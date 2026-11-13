import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { QueryError } from '@/components/ui/query-error';
import { SkeletonCard } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import type { FinancialOverview } from '@/types';

export function FinancesOverviewPage() {
  const overview = useQuery({
    queryKey: ['finances', 'overview'],
    queryFn: async () => (await api.get<{ data: FinancialOverview }>('/v1/finances/overview')).data.data,
  });

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Financial Health"
          description="Holistic tracking of household net worth, assets, mortgages, loans, goals, and upcoming taxes."
          titleSize="headline"
        />

        {overview.isError && (
          <QueryError
            error={overview.error}
            what="financial overview"
            onRetry={() => void overview.refetch()}
          />
        )}

        {overview.isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {overview.data && (
          <div className="flex flex-col gap-6">
            {/* Top Net Worth Hero Card */}
            <Card className="p-6 bg-gradient-to-br from-surface to-surface-container border border-outline-variant">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-label-sm font-semibold uppercase tracking-wider text-muted">
                    Total Household Net Worth
                  </span>
                  <h2
                    className={`text-headline-lg font-black tracking-tight mt-1 ${
                      overview.data.net_worth_minor >= 0 ? 'text-secondary' : 'text-tertiary'
                    }`}
                  >
                    {formatMoney(overview.data.net_worth_minor, overview.data.currency)}
                  </h2>
                  <p className="text-body-sm text-muted mt-1">
                    Calculated as Total Assets minus Total Liabilities (Mortgages & Loans).
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-muted">Currency</span>
                    <Badge tone="neutral" className="font-bold text-sm">
                      {overview.data.currency}
                    </Badge>
                  </div>
                </div>
              </div>
            </Card>

            {/* Assets & Liabilities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Assets Card */}
              <Card className="p-5 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
                        <Icon name="trending_up" className="text-[22px]" />
                      </div>
                      <div>
                        <h3 className="text-title-md font-bold text-on-surface">Assets & Investments</h3>
                        <p className="text-body-xs text-muted">Savings, portfolios, retirement & cash</p>
                      </div>
                    </div>
                    <Link
                      to="/finances/assets"
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </div>

                  <div className="text-title-lg font-black text-secondary mb-4">
                    {formatMoney(overview.data.total_assets_minor, overview.data.currency)}
                  </div>

                  <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-muted">High-Yield Savings & Cash</span>
                      <span className="font-semibold text-on-surface">
                        {formatMoney(overview.data.savings_minor, overview.data.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-muted">Investments & Portfolios</span>
                      <span className="font-semibold text-on-surface">
                        {formatMoney(overview.data.investments_minor, overview.data.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/40">
                  <Link
                    to="/finances/assets"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container transition-all"
                  >
                    <Icon name="add" className="text-[16px]" />
                    Add Savings or Investment
                  </Link>
                </div>
              </Card>

              {/* Liabilities Card */}
              <Card className="p-5 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">
                        <Icon name="real_estate_agent" className="text-[22px]" />
                      </div>
                      <div>
                        <h3 className="text-title-md font-bold text-on-surface">Liabilities & Debt</h3>
                        <p className="text-body-xs text-muted">Mortgages, auto loans, personal loans</p>
                      </div>
                    </div>
                    <Link
                      to="/finances/liabilities"
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      Manage
                    </Link>
                  </div>

                  <div className="text-title-lg font-black text-tertiary mb-4">
                    {formatMoney(overview.data.total_liabilities_minor, overview.data.currency)}
                  </div>

                  <div className="space-y-2 border-t border-outline-variant/60 pt-3">
                    <div className="flex justify-between text-body-sm">
                      <span className="text-muted">Mortgage Balance</span>
                      <span className="font-semibold text-on-surface">
                        {formatMoney(overview.data.mortgage_minor, overview.data.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between text-body-sm">
                      <span className="text-muted">Loans & Lines of Credit</span>
                      <span className="font-semibold text-on-surface">
                        {formatMoney(overview.data.loans_minor, overview.data.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/40">
                  <Link
                    to="/finances/liabilities"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container transition-all"
                  >
                    <Icon name="add" className="text-[16px]" />
                    Add Loan or Mortgage
                  </Link>
                </div>
              </Card>
            </div>

            {/* Goals & Taxes Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
              {/* Financial Goals Overview */}
              <Card className="p-5 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="flag" className="text-primary text-[20px]" />
                      <h3 className="text-title-sm font-bold text-on-surface">Financial Goals</h3>
                    </div>
                    <Link
                      to="/finances/goals"
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-canvas border border-outline-variant/40">
                      <span className="text-xs text-muted">Active Goals</span>
                      <p className="text-title-md font-bold text-on-surface">
                        {overview.data.goals.active_count}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-canvas border border-outline-variant/40">
                      <span className="text-xs text-muted">Achieved Goals</span>
                      <p className="text-title-md font-bold text-secondary">
                        {overview.data.goals.achieved_count}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-body-sm">
                    <div className="flex justify-between">
                      <span className="text-muted">Total Saved Toward Goals:</span>
                      <span className="font-semibold text-secondary">
                        {formatMoney(overview.data.goals.total_saved_minor, overview.data.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Total Target Value:</span>
                      <span className="font-semibold text-on-surface">
                        {formatMoney(overview.data.goals.total_target_minor, overview.data.currency)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/40">
                  <Link
                    to="/finances/goals"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container transition-all"
                  >
                    <Icon name="flag" className="text-[16px]" />
                    Set New Financial Goal
                  </Link>
                </div>
              </Card>

              {/* Taxes Overview */}
              <Card className="p-5 flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name="receipt_long" className="text-tertiary text-[20px]" />
                      <h3 className="text-title-sm font-bold text-on-surface">Upcoming Taxes</h3>
                    </div>
                    <Link
                      to="/finances/taxes"
                      className="text-label-sm font-semibold text-primary hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="p-4 rounded-xl bg-canvas border border-outline-variant/40 mb-4">
                    <span className="text-xs text-muted">Pending Taxes Due</span>
                    <p className="text-title-lg font-bold text-tertiary">
                      {formatMoney(overview.data.taxes.pending_minor, overview.data.currency)}
                    </p>
                    <span className="text-xs text-muted">
                      {overview.data.taxes.pending_count} pending tax assessments
                    </span>
                  </div>

                  <p className="text-body-xs text-muted">
                    Track property taxes, annual municipal levies, estimated income taxes, and deductions.
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-outline-variant/40">
                  <Link
                    to="/finances/taxes"
                    className="flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-outline-variant text-label-md font-semibold text-on-surface hover:bg-surface-container transition-all"
                  >
                    <Icon name="receipt_long" className="text-[16px]" />
                    View Tax Schedule
                  </Link>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
