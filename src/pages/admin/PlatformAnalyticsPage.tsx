import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { PlatformAnalytics } from '@/types';

export function PlatformAnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ['platform', 'analytics'],
    queryFn: async () => (await api.get<PlatformAnalytics>('/v1/platform/analytics')).data,
  });

  const data = analyticsQuery.data;

  const exportReport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fairshare_platform_analytics_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <PageHeader
            breadcrumb={['Platform Admin', 'Intelligence & Telemetry']}
            title="Platform Analytics &amp; Operations"
            description="Macro trends across all tenant households: recurring revenue (MRR/ARR), errand completion velocity, and hardware geofencing throughput."
          />
          <Button variant="outline" onClick={exportReport} disabled={!data}>
            <Icon name="download" className="text-[18px]" />
            Export Telemetry
          </Button>
        </div>

        {analyticsQuery.isError && <Alert tone="error">{apiError(analyticsQuery.error)}</Alert>}
        {analyticsQuery.isLoading && <p className="text-body-md text-muted">Calculating cross-tenant analytics…</p>}

        {data && (
          <div className="flex flex-col gap-6">
            {/* Top Revenue & Velocity Strip */}
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <Card className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Monthly Recurring (MRR)</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="attach_money" className="text-[18px]" />
                  </span>
                </div>
                <span className="text-headline-lg font-extrabold text-on-surface">
                  ${data.overview.mrr_dollars.toLocaleString()}
                </span>
                <span className="text-body-xs text-muted">
                  Annualized Run Rate: ${data.overview.arr_dollars.toLocaleString()}
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Total Households</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-soft text-primary">
                    <Icon name="cottage" className="text-[18px]" />
                  </span>
                </div>
                <span className="text-headline-lg font-extrabold text-on-surface">
                  {data.overview.total_households}
                </span>
                <span className="text-body-xs text-muted">
                  {data.overview.active_households} active · {data.overview.trial_households} in trial
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Errand Completion Rate</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="task_alt" className="text-[18px]" />
                  </span>
                </div>
                <span className="text-headline-lg font-extrabold text-on-surface">
                  {data.errand_metrics.completion_rate_percent}%
                </span>
                <span className="text-body-xs text-muted">
                  {data.errand_metrics.completed_requests} of {data.errand_metrics.total_requests} fulfilled
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-5">
                <div className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Active Family Members</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-muted">
                    <Icon name="people" className="text-[18px]" />
                  </span>
                </div>
                <span className="text-headline-lg font-extrabold text-on-surface">
                  {data.overview.active_members}
                </span>
                <span className="text-body-xs text-muted">Across all tenant boundaries</span>
              </Card>
            </div>

            {/* Middle Section: Plan Tier Distribution & Hardware Infrastructure */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Subscription Breakdown */}
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-headline-sm font-bold text-on-surface">Subscription Tiers</h3>
                  <Badge tone="neutral">{Object.keys(data.by_tier).length} Active Tiers</Badge>
                </div>

                <div className="flex flex-col divide-y divide-surface-container">
                  {Object.entries(data.by_tier).map(([tier, count]) => {
                    const price =
                      tier === 'enterprise' ? 49 : tier === 'family' ? 19 : tier === 'plus' ? 9 : 0;
                    return (
                      <div key={tier} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-soft font-mono text-label-sm font-bold text-secondary">
                            {tier.slice(0, 2).toUpperCase()}
                          </span>
                          <div className="flex flex-col">
                            <span className="capitalize font-bold text-on-surface">{tier} Plan</span>
                            <span className="text-body-xs text-muted">${price}/month per household</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <span className="font-mono text-body-md font-bold text-on-surface">
                            {count} {count === 1 ? 'family' : 'families'}
                          </span>
                          <span className="w-16 text-right font-mono text-body-sm text-muted">
                            ${price * count}/mo
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Infrastructure & Real-Time Logistics */}
              <Card className="flex flex-col gap-4 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-headline-sm font-bold text-on-surface">Hardware &amp; Logistics Ops</h3>
                  <Badge tone="primary">Live Telemetry</Badge>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3.5">
                    <span className="text-label-sm text-muted">Saved Places (Stores/Gym/Office)</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.infrastructure.saved_places}
                    </span>
                    <span className="text-body-xs text-muted">Geofence boundaries</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3.5">
                    <span className="text-label-sm text-muted">Arrival &amp; Exit Triggers</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.infrastructure.geofence_triggers}
                    </span>
                    <span className="text-body-xs text-muted">Background GPS notifications</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3.5">
                    <span className="text-label-sm text-muted">Voice Priority Calls</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.infrastructure.voice_escalations}
                    </span>
                    <span className="text-body-xs text-muted">Dispatched for urgent errands</span>
                  </div>

                  <div className="flex flex-col gap-1 rounded-xl bg-surface-container-low p-3.5">
                    <span className="text-label-sm text-muted">Household Ledger Entries</span>
                    <span className="text-headline-md font-bold text-on-surface">
                      {data.infrastructure.ledger_entries}
                    </span>
                    <span className="text-body-xs text-muted">
                      ${(data.infrastructure.total_expenses_cents / 100).toFixed(2)} tracked
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Historical Timeseries Table */}
            <Card className="flex flex-col gap-4 p-6">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Historical Growth &amp; Fulfilment Velocity
                </h3>
                <p className="text-body-sm text-muted">
                  Monthly performance trends aggregating new onboardings, requests generated and fulfilled.
                </p>
              </div>

              <div className="overflow-x-auto">
                <Table className="min-w-full">
                  <THead>
                    <TH>Month</TH>
                    <TH>Household Signups</TH>
                    <TH>Errands Created</TH>
                    <TH>Errands Completed</TH>
                    <TH className="text-right">Projected MRR</TH>
                  </THead>
                  <tbody>
                    {data.timeseries.map((pt) => (
                      <TR key={pt.period}>
                        <TD>
                          <span className="font-bold text-on-surface">{pt.period}</span>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-md text-on-surface">+{pt.signups}</span>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-md text-on-surface">{pt.requests_created}</span>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-md text-secondary">
                            {pt.requests_completed}
                          </span>
                        </TD>
                        <TD className="text-right font-mono text-body-md font-bold text-on-surface">
                          ${pt.estimated_mrr.toLocaleString()}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
