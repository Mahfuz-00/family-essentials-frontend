import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import { getCurrencySign } from '@/lib/money';
import { useAuthStore } from '@/stores/auth';
import type { RefundPolicy } from '@/types';
import { MarketingLayout } from './MarketingLayout';

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: 'How quickly will my refund appear in my bank account?',
    answer:
      'For credit/debit card transactions processed through our payment gateway, refunds are initiated immediately and typically reflect within 3 to 5 business days depending on your financial institution.',
  },
  {
    question: 'What happens to our household data if we cancel our subscription?',
    answer:
      'All your family lists, grocery catalog, geofence zones, and shared financial entries remain securely encrypted in your household vault for 90 days. If you reactivate during this period, everything is restored instantly without data loss.',
  },
  {
    question: 'How does a mid-cycle plan upgrade or downgrade work?',
    answer:
      'We calculate the exact remaining unused days on your current plan down to the day and credit that balance directly toward your new plan. Reverting to your previous tier is supported while within the 50% refund window.',
  },
  {
    question: 'How are cash payments refunded?',
    answer:
      'For households paying via in-person cash handover to platform administrators, approved refunds generate an official cash refund voucher in your billing portal and are disbursed in person by your platform administrator.',
  },
  {
    question: 'Can non-admin family members access the workspace after cancellation?',
    answer:
      'Upon subscription cancellation, non-admin family members are signed out with a gentle notification. The household administrator retains dedicated access strictly to the Billing & Subscription module to review invoices or resubscribe anytime.',
  },
];

export function PublicRefundPolicyPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const [activeCycle, setActiveCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [calcPlan, setCalcPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [calcDays, setCalcDays] = useState<number>(5);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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

  const currencySign = getCurrencySign();
  const planPrice = calcPlan === 'monthly' ? 9.99 : 99.0;
  const policy = policyQuery.data;

  // Calculate refund percentage based on exact rules:
  // Monthly: 100% within 7 days, 50% till 20 days, 0% after 20 days
  // Yearly: 100% within 15 days, 75% after 1 month (days 16-30), 50% after 3 months (days 31-90), 25% after 6 months (days 91-180), 0% after 180 days
  const calculation = useMemo(() => {
    let percent = 0;
    let tierName = '';
    let statusTone: 'success' | 'warning' | 'danger' = 'danger';

    if (calcPlan === 'monthly') {
      if (calcDays <= 7) {
        percent = 100;
        tierName = '100% Full Refund (Grace Window)';
        statusTone = 'success';
      } else if (calcDays <= 20) {
        percent = 50;
        tierName = '50% Prorated Buffer Refund';
        statusTone = 'warning';
      } else {
        percent = 0;
        tierName = 'Non-Refundable (Term Active)';
        statusTone = 'danger';
      }
    } else {
      if (calcDays <= 15) {
        percent = 100;
        tierName = '100% Full Refund (Annual Grace)';
        statusTone = 'success';
      } else if (calcDays <= 30) {
        percent = 75;
        tierName = '75% Prorated Annual Tier';
        statusTone = 'success';
      } else if (calcDays <= 90) {
        percent = 50;
        tierName = '50% Mid-Cycle Tier';
        statusTone = 'warning';
      } else if (calcDays <= 180) {
        percent = 25;
        tierName = '25% Extended Term Tier';
        statusTone = 'warning';
      } else {
        percent = 0;
        tierName = 'Non-Refundable (Beyond 6 Months)';
        statusTone = 'danger';
      }
    }

    const estimatedAmount = (planPrice * percent) / 100;
    return { percent, tierName, statusTone, estimatedAmount };
  }, [calcPlan, calcDays, planPrice]);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 flex flex-col gap-12">
        {/* Navigation Breadcrumbs & Top Info */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted border-b border-outline-variant/20 pb-4">
          <div className="flex items-center gap-2">
            <Link to="/" className="hover:text-secondary font-semibold">Home</Link>
            <span>/</span>
            <Link to="/pricing" className="hover:text-secondary font-semibold">Pricing</Link>
            <span>/</span>
            <span className="text-on-surface font-bold">Refund Policy & Guarantee</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-soft px-3 py-1 font-semibold text-secondary">
              <Icon name="verified" className="text-[14px]" />
              Official Household Satisfaction Guarantee {policy ? `(Grace Window: ${policy.monthly_refund_window_days ?? 7} Days)` : ''}
            </span>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="text-center max-w-3xl mx-auto flex flex-col items-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-secondary/25 bg-forest-soft px-4 py-1.5 text-xs font-bold text-secondary shadow-xs">
            <Icon name="shield" className="text-[18px]" />
            <span>Guaranteed Household Satisfaction</span>
          </span>

          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-on-surface">
            Fair &amp; Transparent Household Guarantee
          </h1>

          <p className="mt-4 text-sm sm:text-base text-muted leading-relaxed max-w-2xl">
            We believe in honest, predictable family software. If Family Essentials doesn't bring calm, synchrony, and clarity to your household logistics, our graduated refund policy ensures you are protected every step of the way.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/30 shadow-xs">
              <Icon name="bolt" className="text-secondary text-[16px]" />
              Instant Automated Proration
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/30 shadow-xs">
              <Icon name="event_available" className="text-secondary text-[16px]" />
              7-Day / 15-Day Grace Window
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface border border-outline-variant/30 shadow-xs">
              <Icon name="credit_score" className="text-secondary text-[16px]" />
              Direct Reversal in 3–5 Business Days
            </span>
          </div>
        </div>

        {/* Graduated Refund Pillars & Timelines */}
        <section className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-headline-md font-bold text-on-surface">Graduated Refund Pillars</h2>
              <p className="text-body-sm text-muted">Select your subscription cycle to inspect the refund tiers and eligibility milestones.</p>
            </div>
            {/* Cycle Toggle */}
            <div className="inline-flex items-center rounded-xl bg-surface-container-low p-1 border border-outline-variant/30 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveCycle('monthly');
                  setCalcPlan('monthly');
                }}
                className={`cursor-pointer rounded-lg px-4 py-2 text-label-md font-bold transition-all ${
                  activeCycle === 'monthly'
                    ? 'bg-secondary text-on-secondary shadow-e1'
                    : 'text-muted hover:text-on-surface'
                }`}
              >
                Monthly Plan
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveCycle('yearly');
                  setCalcPlan('yearly');
                }}
                className={`cursor-pointer rounded-lg px-4 py-2 text-label-md font-bold transition-all ${
                  activeCycle === 'yearly'
                    ? 'bg-secondary text-on-secondary shadow-e1'
                    : 'text-muted hover:text-on-surface'
                }`}
              >
                Yearly Plan (Save 20%)
              </button>
            </div>
          </div>

          {activeCycle === 'monthly' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="flex flex-col gap-3 p-6 border-t-4 border-secondary bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="looks_one" className="text-[22px]" />
                  </span>
                  <Badge tone="success">100% Refund</Badge>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Days 1 to 7</h3>
                <p className="text-body-sm text-muted leading-relaxed">
                  <strong>Unconditional Grace Period:</strong> Full 100% refund credited back to your payment card with zero deduction. No cancellation fees.
                </p>
                <span className="mt-auto text-xs font-semibold text-secondary">Satisfaction Guarantee Window</span>
              </Card>

              <Card className="flex flex-col gap-3 p-6 border-t-4 border-amber-500 bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Icon name="looks_two" className="text-[22px]" />
                  </span>
                  <Badge tone="warning">50% Refund</Badge>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Days 8 to 20</h3>
                <p className="text-body-sm text-muted leading-relaxed">
                  <strong>Mid-Cycle Buffer Window:</strong> Eligible for a 50% prorated refund. Remaining 50% covers active cloud storage and geofence telephony overhead.
                </p>
                <span className="mt-auto text-xs font-semibold text-amber-700">Revert to Previous Plan Supported</span>
              </Card>

              <Card className="flex flex-col gap-3 p-6 border-t-4 border-outline-variant bg-surface shadow-e1 opacity-90">
                <div className="flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container text-muted">
                    <Icon name="looks_3" className="text-[22px]" />
                  </span>
                  <Badge tone="neutral">Term Completion</Badge>
                </div>
                <h3 className="text-headline-sm font-bold text-on-surface">Day 21+</h3>
                <p className="text-body-sm text-muted leading-relaxed">
                  <strong>Active Term Completion:</strong> Charges are non-refundable. Your plan remains active until the end of the billing period without auto-renewal.
                </p>
                <span className="mt-auto text-xs font-semibold text-muted">No Further Charges</span>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card className="flex flex-col gap-3 p-5 border-t-4 border-secondary bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="event_available" className="text-[20px]" />
                  </span>
                  <Badge tone="success">100% Refund</Badge>
                </div>
                <h3 className="text-label-lg font-bold text-on-surface">Within 15 Days</h3>
                <p className="text-body-xs text-muted leading-relaxed">
                  Full 100% refund for annual commitments within the first 15 days of payment.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5 border-t-4 border-emerald-500 bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                    <Icon name="calendar_month" className="text-[20px]" />
                  </span>
                  <Badge tone="success">75% Refund</Badge>
                </div>
                <h3 className="text-label-lg font-bold text-on-surface">16 to 30 Days (Month 1)</h3>
                <p className="text-body-xs text-muted leading-relaxed">
                  75% refund returned if canceled within the first month.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5 border-t-4 border-amber-500 bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                    <Icon name="date_range" className="text-[20px]" />
                  </span>
                  <Badge tone="warning">50% Refund</Badge>
                </div>
                <h3 className="text-label-lg font-bold text-on-surface">Months 2 to 3 (Day 90)</h3>
                <p className="text-body-xs text-muted leading-relaxed">
                  50% refund returned for early quarterly cancellations. Revert rule active.
                </p>
              </Card>

              <Card className="flex flex-col gap-3 p-5 border-t-4 border-orange-500 bg-surface shadow-e1">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-100 text-orange-800">
                    <Icon name="history_toggle_off" className="text-[20px]" />
                  </span>
                  <Badge tone="warning">25% Refund</Badge>
                </div>
                <h3 className="text-label-lg font-bold text-on-surface">Months 4 to 6 (Day 180)</h3>
                <p className="text-body-xs text-muted leading-relaxed">
                  25% refund returned through 6 months. No refund after month 6.
                </p>
              </Card>
            </div>
          )}
        </section>

        {/* Interactive Eligibility Calculator */}
        <section className="rounded-3xl border border-secondary/25 bg-forest-soft/30 p-6 sm:p-10 shadow-e1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-secondary">
                <Icon name="calculate" className="text-[18px]" />
                Interactive Estimator
              </span>
              <h2 className="text-headline-lg font-black text-on-surface">
                Refund &amp; Proration Calculator
              </h2>
              <p className="text-body-sm text-muted leading-relaxed">
                Test your exact refund percentage and estimated recovery amount based on days elapsed since your latest payment.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="calc-plan-select" className="text-label-sm font-bold text-on-surface">Plan Type</label>
                  <select
                    id="calc-plan-select"
                    value={calcPlan}
                    onChange={(e) => setCalcPlan(e.target.value as 'monthly' | 'yearly')}
                    className="h-10 rounded-xl border border-outline-variant/40 bg-surface px-3 text-sm text-on-surface font-semibold focus:border-secondary focus:outline-none"
                  >
                    <option value="monthly">Monthly Family Plan ({currencySign}9.99/mo)</option>
                    <option value="yearly">Yearly Family Plan ({currencySign}99.00/yr)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="calc-days-slider" className="text-label-sm font-bold text-on-surface">Days Since Payment</label>
                    <span className="text-label-sm font-extrabold text-secondary">{calcDays} {calcDays === 1 ? 'day' : 'days'}</span>
                  </div>
                  <input
                    id="calc-days-slider"
                    type="range"
                    min={1}
                    max={calcPlan === 'monthly' ? 30 : 365}
                    value={calcDays}
                    onChange={(e) => setCalcDays(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer accent-secondary mt-2"
                  />
                  <div className="flex justify-between text-[11px] text-muted">
                    <span>Day 1</span>
                    <span>{calcPlan === 'monthly' ? 'Day 30' : 'Day 365'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculated Output Card */}
            <div className="lg:col-span-5 rounded-2xl bg-surface p-6 border border-outline-variant/30 shadow-e2 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted">Estimated Settlement</span>
                <Badge tone={calculation.statusTone}>{calculation.percent}% Tier</Badge>
              </div>

              <div>
                <span className="text-3xl sm:text-4xl font-extrabold text-secondary">
                  {currencySign}{calculation.estimatedAmount.toFixed(2)}
                </span>
                <span className="text-xs text-muted block mt-1">
                  Estimated refund for {currencySign}{planPrice.toFixed(2)} charge at Day {calcDays}
                </span>
              </div>

              <div className="rounded-xl bg-surface-container-low p-3 text-xs flex flex-col gap-1.5">
                <div className="flex justify-between text-muted">
                  <span>Policy Category:</span>
                  <span className="font-semibold text-on-surface">{calculation.tierName}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Disbursement Route:</span>
                  <span className="font-semibold text-on-surface">Original Card / Bank Source</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Processing Window:</span>
                  <span className="font-semibold text-on-surface">3–5 Business Days</span>
                </div>
              </div>

              {isAuthenticated ? (
                <Link to="/billing" className="inline-flex w-full">
                  <Button variant="primary" size="md" className="w-full gap-2 font-bold">
                    <Icon name="receipt_long" className="text-[18px]" />
                    <span>Open Billing &amp; Request Refund</span>
                  </Button>
                </Link>
              ) : (
                <Link to="/login" className="inline-flex w-full">
                  <Button variant="primary" size="md" className="w-full gap-2 font-bold">
                    <Icon name="login" className="text-[18px]" />
                    <span>Log In to Manage Subscription</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Plan Modifications & The 50% Revert Rule */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="flex flex-col gap-3 p-6 border border-outline-variant/30 bg-surface">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
              <Icon name="swap_horiz" className="text-[22px]" />
            </span>
            <h3 className="text-headline-sm font-bold text-on-surface">Mid-Cycle Upgrades &amp; Proration</h3>
            <p className="text-body-sm text-muted leading-relaxed">
              When upgrading or switching subscription tiers mid-cycle, Family Essentials calculates the exact unused days remaining on your active plan and deducts that value as a direct credit against your new plan price. You never pay twice for the same billing days.
            </p>
          </Card>

          <Card className="flex flex-col gap-3 p-6 border border-outline-variant/30 bg-surface">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
              <Icon name="undo" className="text-[22px]" />
            </span>
            <h3 className="text-headline-sm font-bold text-on-surface">The 50% Revert Rule</h3>
            <p className="text-body-sm text-muted leading-relaxed">
              If your household switches to a new tier and needs to revert to the previous plan, reverting is permitted while within the <strong>50% refund window</strong> (up to Day 20 for monthly, or 3 months for yearly). After that milestone, reverting is locked until the conclusion of the cycle.
            </p>
          </Card>
        </section>

        {/* Cancellation Notice & Access Restriction */}
        <div className="rounded-2xl border border-coral-soft bg-coral-soft/20 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-soft text-error">
              <Icon name="warning" className="text-[22px]" />
            </span>
            <div>
              <h4 className="text-label-lg font-bold text-on-surface">Cancellation Protocol &amp; Account Access</h4>
              <p className="text-body-xs text-muted mt-1 leading-relaxed">
                Canceling a plan logs out all non-admin household members immediately. Upon subsequent login, all household features remain locked except for Billing &amp; Subscription to allow review of past invoices and instant resubscription.
              </p>
            </div>
          </div>
          <Link to="/billing" className="shrink-0">
            <Button variant="outline" size="sm" className="font-semibold text-error border-error/30 hover:bg-coral-soft">
              Billing Settings
            </Button>
          </Link>
        </div>

        {/* FAQ Accordion */}
        <section className="flex flex-col gap-6">
          <div>
            <h2 className="text-headline-md font-bold text-on-surface">Frequently Asked Questions</h2>
            <p className="text-body-sm text-muted">Clear answers on how billing, refunds, and subscription guarantees are handled.</p>
          </div>

          <div className="flex flex-col gap-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl border border-outline-variant/30 bg-surface overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full cursor-pointer items-center justify-between p-5 text-left font-bold text-on-surface hover:bg-surface-container-low/50"
                  >
                    <span className="text-label-lg">{faq.question}</span>
                    <Icon
                      name={isOpen ? 'expand_less' : 'expand_more'}
                      className="text-[20px] text-muted transition-transform"
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-outline-variant/15 p-5 pt-3 text-body-sm text-muted leading-relaxed bg-surface-container-low/20">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Bottom Trust Footer */}
        <div className="rounded-2xl bg-surface border border-outline-variant/30 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
              <Icon name="lock" className="text-[18px]" />
            </span>
            <div className="text-xs text-muted">
              <span className="font-bold text-on-surface">Encrypted Data Retention Guarantee</span>
              <p>Your grocery catalogs and family errand histories are kept safe for 90 days after cancellation.</p>
            </div>
          </div>
          <Link to="/contact">
            <Button variant="ghost" size="sm" className="font-bold text-secondary">
              Contact Family Concierge →
            </Button>
          </Link>
        </div>
      </div>
    </MarketingLayout>
  );
}
