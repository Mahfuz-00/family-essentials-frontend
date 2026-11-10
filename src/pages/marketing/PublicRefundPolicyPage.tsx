import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { RefundPolicy } from '@/types';
import { MarketingLayout } from './MarketingLayout';

export function PublicRefundPolicyPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const policyQuery = useQuery({
    queryKey: ['public', 'refund-policy'],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: RefundPolicy }>('/v1/auth/refund-policy');
        return res.data.data;
      } catch {
        return null;
      }
    },
    staleTime: 1000 * 60 * 10,
  });

  const policy = policyQuery.data;

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <Icon name="verified_user" className="text-[16px]" />
            <span>Guaranteed Household Satisfaction</span>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface">
            Subscription &amp; Refund Policy
          </h1>

          <p className="mt-4 text-sm sm:text-base text-on-surface-variant leading-relaxed">
            We believe in honest, transparent software pricing. If Family Essentials does not noticeably simplify your household coordination, we honor straightforward money-back guarantees without runarounds.
          </p>
        </div>

        {/* 3 Core Guarantee Highlights */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          <Card className="flex flex-col gap-3 p-6 border-l-4 border-secondary bg-surface">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
              <Icon name="calendar_today" className="text-[22px]" />
            </div>
            <h3 className="text-label-lg font-bold text-on-surface">7-Day Guarantee (Monthly)</h3>
            <p className="text-body-xs text-muted leading-relaxed">
              New and renewing monthly subscriptions are eligible for a <strong>100% full refund</strong> within 7 calendar days of your invoice date. After 7 days, charges are non-refundable.
            </p>
          </Card>

          <Card className="flex flex-col gap-3 p-6 border-l-4 border-amber-500 bg-surface">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <Icon name="workspace_premium" className="text-[22px]" />
            </div>
            <h3 className="text-label-lg font-bold text-on-surface">First-Month 80% (Annual)</h3>
            <p className="text-body-xs text-muted leading-relaxed">
              Annual plan commitments can be refunded at <strong>80% of the annual price</strong> within the first 30 days (first month). 20% is retained for account setup and payment gateway fees.
            </p>
          </Card>

          <Card className="flex flex-col gap-3 p-6 border-l-4 border-teal-500 bg-surface">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
              <Icon name="swap_horiz" className="text-[22px]" />
            </div>
            <h3 className="text-label-lg font-bold text-on-surface">Plan Modifications</h3>
            <p className="text-body-xs text-muted leading-relaxed">
              Monthly plans may be upgraded or modified between <strong>Days 4 and 20</strong> with a 50% mid-cycle adjustment credit. Annual plans can be reconfigured within the first 3 months.
            </p>
          </Card>
        </div>

        {/* Detailed Policy Breakdown */}
        <section className="mt-12 rounded-3xl border border-outline-variant/30 bg-surface p-6 sm:p-10 flex flex-col gap-8">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface">Detailed Terms &amp; Conditions</h2>
            <p className="mt-1 text-body-sm text-muted">
              Effective Date: {new Date().getFullYear()} · Applies to all Family Essentials household subscriptions.
            </p>
          </div>

          <div className="space-y-6 text-body-sm text-on-surface-variant leading-relaxed">
            <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/20">
              <h3 className="text-label-lg font-bold text-on-surface mb-2">1. Monthly Subscription Refunds</h3>
              <p>
                Every monthly household subscription comes with a <strong>{policy?.monthly_refund_window_days ?? 7}-day money-back guarantee</strong>. If you are not satisfied with the platform, simply submit a refund request from your household Billing portal or contact support within 7 days of invoice issuance. Your subscription will revert to the trial/free tier and your payment method will be credited {policy?.monthly_refund_percent ?? 100}%. After 7 days, monthly billing cycles are non-refundable.
              </p>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/20">
              <h3 className="text-label-lg font-bold text-on-surface mb-2">2. Annual Subscription Refunds</h3>
              <p>
                Annual subscriptions offer significant savings over month-to-month billing. If you need to cancel an annual plan, you may request an <strong>{policy?.annual_refund_percent ?? 80}% refund within the first {policy?.annual_refund_window_days ?? 30} days</strong> (first month). The remaining 20% covers upfront infrastructure provisioning, SMS/carrier quota allocations, and processing costs. After 30 days, annual subscriptions are locked for the remainder of the prepaid term.
              </p>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/20">
              <h3 className="text-label-lg font-bold text-on-surface mb-2">3. Subscription Plan Changes &amp; Mid-Cycle Adjustments</h3>
              <ul className="list-disc pl-5 space-y-2 mt-2">
                <li>
                  <strong>Monthly Cycle Timing</strong>:
                  Plan changes are locked during the first 3 days (activation grace period). Between <strong>Day 4 and Day 20</strong>, plan tier upgrades or downgrades are calculated with a <strong>50% mid-cycle adjustment credit</strong>. From Day 21 onwards, plan changes are queued for the upcoming cycle to prevent race conditions during automatic renewals.
                </li>
                <li>
                  <strong>Annual Cycle Timing</strong>:
                  Annual subscribers may adjust subscription tiers during the first <strong>3 months (90 days)</strong> of their commitment. After 3 months, the annual commitment cannot be downgraded until the renewal term.
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/20">
              <h3 className="text-label-lg font-bold text-on-surface mb-2">4. Cash Payment &amp; Offline Settlements</h3>
              <p>
                For households that pay via in-person cash handover or direct bank wire, refunds cannot be automatically credited back to an online payment card. Instead, approved refunds for cash transactions are settled in person by your platform administrator with an official printed cash refund voucher.
              </p>
            </div>

            <div className="rounded-2xl bg-surface-container-low p-5 border border-outline-variant/20">
              <h3 className="text-label-lg font-bold text-on-surface mb-2">5. How to Request a Refund</h3>
              <p className="mb-3">
                You can request a refund through any of the following convenient channels:
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-outline-variant/30 bg-surface p-3.5">
                  <span className="font-bold text-on-surface flex items-center gap-1.5 text-xs mb-1">
                    <Icon name="dashboard" className="text-secondary text-[16px]" />
                    In-App Self-Service (Fastest)
                  </span>
                  <p className="text-xs text-muted">
                    Navigate to <strong>Household Settings → Billing</strong>, open the <strong>Invoices &amp; Refunds</strong> section, and click <strong>&quot;Request Refund&quot;</strong> on your eligible invoice.
                  </p>
                </div>
                <div className="rounded-xl border border-outline-variant/30 bg-surface p-3.5">
                  <span className="font-bold text-on-surface flex items-center gap-1.5 text-xs mb-1">
                    <Icon name="mail" className="text-secondary text-[16px]" />
                    Email Billing Support
                  </span>
                  <p className="text-xs text-muted">
                    Send an email to <a href={`mailto:${policy?.contact_email ?? 'billing@fairshare.app'}`} className="text-secondary font-semibold underline">{policy?.contact_email ?? 'billing@fairshare.app'}</a> with your invoice number and reason. Requests are reviewed within 24 hours.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-outline-variant/20 pt-6">
            <span className="text-xs text-muted">
              Have questions about your household invoice? Our domestic billing team is here to help.
            </span>
            <div className="flex items-center gap-3">
              <Link to="/contact">
                <span className="inline-flex h-10 items-center justify-center rounded-xl border border-outline-variant/40 bg-surface px-4 text-xs font-semibold text-on-surface hover:bg-sage-soft transition-all">
                  Contact Support
                </span>
              </Link>
              {isAuthenticated ? (
                <Link to="/billing">
                  <span className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-5 text-xs font-bold text-white shadow-e1 hover:bg-primary transition-all">
                    Open Billing Portal →
                  </span>
                </Link>
              ) : (
                <Link to="/login">
                  <span className="inline-flex h-10 items-center justify-center rounded-xl bg-secondary px-5 text-xs font-bold text-white shadow-e1 hover:bg-primary transition-all">
                    Sign In to Household →
                  </span>
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
