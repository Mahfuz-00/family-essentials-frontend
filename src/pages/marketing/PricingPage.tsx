import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarketingLayout } from './MarketingLayout';

export function PricingPage() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: 'Free Household',
      tagline: 'Ideal for couples or small families getting started.',
      priceMonthly: 0,
      priceAnnual: 0,
      seats: 'Up to 3 family members',
      popular: false,
      features: [
        'Active Errand Kanban Board',
        '2 Saved Place Geofences',
        '3 Recurring Staples Rules',
        '1 Shared Household Ledger',
        'Web & Mobile App Access',
        'Community Forum Support',
      ],
      ctaText: 'Get Started Free',
      ctaVariant: 'outline' as const,
    },
    {
      name: 'Family Starter',
      tagline: 'Essential coordination for growing households.',
      priceMonthly: 9,
      priceAnnual: 7, // ~$84/yr
      seats: 'Up to 5 family members',
      popular: false,
      features: [
        'Everything in Free',
        '10 Saved Place Geofences',
        'Unlimited Recurring Rules',
        '3 Multi-Currency Ledgers',
        'Role-Based Access Control',
        'Direct One-Tap Phone Calling',
        'Email Support within 24h',
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaVariant: 'soft' as const,
    },
    {
      name: 'Family Pro',
      tagline: 'Our most popular plan for active, busy families.',
      priceMonthly: 19,
      priceAnnual: 15, // ~$180/yr
      seats: 'Up to 10 family members',
      popular: true,
      features: [
        'Everything in Starter',
        'Unlimited Saved Place Geofences',
        'Unlimited Shared Ledgers',
        'Direct One-Tap Phone Calling & Quick Redial',
        'Custom Geofence Radius Beacons',
        'PDF & CSV Financial Exports',
        'Multi-Household Switching',
        'Priority Phone & Chat Support',
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaVariant: 'primary' as const,
    },
    {
      name: 'Multi-Home Estate',
      tagline: 'For blended families, estates, and elder caregivers.',
      priceMonthly: 39,
      priceAnnual: 31,
      seats: 'Unlimited members across 3 homes',
      popular: false,
      features: [
        'Everything in Pro',
        'Manage up to 3 Separate Households',
        'Direct One-Tap Phone Calling Across Workspaces',
        'Dedicated Tenant Database Partition',
        'Full Audit Logging & Security Logs',
        'White-Glove Family Onboarding Call',
      ],
      ctaText: 'Contact Concierge',
      ctaVariant: 'outline' as const,
    },
  ];

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Pricing Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Fair, Transparent Pricing</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Invest in Household Peace of Mind
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            No advertising, no selling your family's data, and no hidden surprises. Simple subscriptions that pay for themselves in saved hours and zero duplicate grocery purchases.
          </p>

          {/* Monthly / Annual Toggle */}
          <div className="mt-7 flex items-center justify-center gap-3">
            <span className={`text-xs sm:text-sm font-semibold ${!annual ? 'text-on-surface' : 'text-muted'}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className="relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-secondary transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-secondary/40"
              role="switch"
              aria-checked={annual}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  annual ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs sm:text-sm font-semibold ${annual ? 'text-on-surface' : 'text-muted'}`}>
              Annual
            </span>
            <span className="rounded-full bg-forest-soft px-2.5 py-0.5 text-[11px] font-bold text-secondary">
              Save 20%
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => {
            const price = annual ? p.priceAnnual : p.priceMonthly;

            return (
              <Card
                key={p.name}
                className={`relative flex flex-col justify-between p-5 sm:p-6 transition-all duration-200 ${
                  p.popular
                    ? 'border-2 border-secondary bg-surface shadow-e2 ring-1 ring-secondary/20'
                    : 'border-outline-variant/30 bg-surface shadow-e1 hover:shadow-e2'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-xs">
                    Most Popular
                  </span>
                )}

                <div>
                  <h2 className="text-base sm:text-lg font-bold text-on-surface">{p.name}</h2>
                  <p className="mt-1 text-xs text-muted min-h-[32px] leading-relaxed">{p.tagline}</p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold tracking-tight text-on-surface">${price}</span>
                    <span className="text-xs text-muted">/ month</span>
                  </div>
                  {annual && p.priceAnnual > 0 && (
                    <span className="text-[11px] font-semibold text-secondary block mt-0.5">
                      Billed annually (${p.priceAnnual * 12}/year)
                    </span>
                  )}

                  <div className="mt-4 rounded-xl bg-surface-container-low px-3 py-1.5 text-xs font-semibold text-on-surface-variant">
                    {p.seats}
                  </div>

                  <div className="mt-5 border-t border-outline-variant/20 pt-5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-3">
                      Included Capabilities
                    </span>
                    <ul className="flex flex-col gap-2">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-on-surface-variant leading-snug">
                          <Icon name="check" className="text-[14px] text-secondary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 border-t border-outline-variant/20 pt-4">
                  <Link to="/register" className="w-full block">
                    <Button
                      variant={p.ctaVariant}
                      size="md"
                      className="w-full justify-center font-bold text-xs"
                    >
                      {p.ctaText}
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Matrix */}
        <section className="mt-24 rounded-3xl bg-surface border border-outline-variant/30 p-6 sm:p-10 shadow-e1">
          <h2 className="text-headline-lg font-bold text-on-surface text-center">
            Comprehensive Feature Matrix
          </h2>
          <p className="text-body-md text-on-surface-variant text-center mt-2">
            See exactly what is included in each plan tier.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-md font-bold text-on-surface">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Free</th>
                  <th className="py-3 px-4">Starter</th>
                  <th className="py-3 px-4 text-secondary">Pro</th>
                  <th className="py-3 px-4">Estate</th>
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/15">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Active Errand Kanban</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">Unlimited</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Family Member Seats</td>
                  <td className="py-3.5 px-4 text-muted">3 seats</td>
                  <td className="py-3.5 px-4 text-muted">5 seats</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">10 seats</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Saved Place Geofences</td>
                  <td className="py-3.5 px-4 text-muted">2 places</td>
                  <td className="py-3.5 px-4 text-muted">10 places</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">Unlimited</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Direct Mobile Phone Calling</td>
                  <td className="py-3.5 px-4 text-muted">Included (Native)</td>
                  <td className="py-3.5 px-4 text-muted">Included (Native)</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">Included (Priority)</td>
                  <td className="py-3.5 px-4 text-muted">Included (Cross-Home)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Shared Ledgers</td>
                  <td className="py-3.5 px-4 text-muted">1 ledger</td>
                  <td className="py-3.5 px-4 text-muted">3 ledgers</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">Unlimited</td>
                  <td className="py-3.5 px-4 text-muted">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-on-surface">Data Retention & History</td>
                  <td className="py-3.5 px-4 text-muted">30 days</td>
                  <td className="py-3.5 px-4 text-muted">1 year</td>
                  <td className="py-3.5 px-4 font-bold text-secondary">Forever</td>
                  <td className="py-3.5 px-4 text-muted">Forever</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
