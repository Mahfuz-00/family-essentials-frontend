import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MarketingLayout } from './MarketingLayout';

export function PricingPage() {
  const plans = [
    {
      name: 'Starter Family',
      tagline: 'A shared board and simple reminders for a small household.',
      price: '$0',
      cadence: 'free',
      seats: 'Up to 2 family members',
      popular: false,
      features: [
        '2 saved stores & geofences',
        '50 errands per month',
        '30 AI & member chat messages / mo',
        '5 receipt OCR scans / mo',
        'Basic pantry tracker (20 items)',
        'Member-to-member calling not included',
      ],
      ctaText: 'Get Started Free',
      ctaVariant: 'outline' as const,
      ctaTo: '/register',
    },
    {
      name: 'Pilot Family Tier',
      tagline: 'Geofenced stores, recurring staples and a shared ledger.',
      price: '$14.99',
      cadence: 'per month',
      seats: 'Up to 5 family members',
      popular: false,
      features: [
        '10 saved stores & geofences',
        '300 errands per month',
        '15 member calls / mo',
        '300 AI & member chat messages / mo',
        '50 receipt OCR scans / mo',
        'Full pantry & cost tracking (100 items)',
        'Multi-period household expense ledgers',
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaVariant: 'soft' as const,
      ctaTo: '/register',
    },
    {
      name: 'Household Pro',
      tagline: 'For busy households running their week on FairShare.',
      price: '$24.99',
      cadence: 'per month',
      seats: 'Up to 10 family members',
      popular: true,
      features: [
        '25 saved stores & geofences',
        '1,000 errands per month',
        '60 member calls / mo',
        '1,500 AI & member chat messages / mo',
        '200 receipt OCR scans / mo',
        'Extended pantry & auto-restock buffer (500 items)',
        'Wealth, assets, debt & tax tracking',
        'Household data export',
      ],
      ctaText: 'Start 14-Day Free Trial',
      ctaVariant: 'primary' as const,
      ctaTo: '/register',
    },
    {
      name: 'Enterprise Household',
      tagline: 'For large, multi-generational households and shared estates.',
      price: '$49.99',
      cadence: 'per month',
      seats: 'Up to 25 family members',
      popular: false,
      features: [
        '100 saved stores & geofences',
        '5,000 errands per month',
        'Unlimited member calls & escalation',
        'Unlimited AI & member chat',
        '1,000 receipt OCR scans / mo',
        'Pantry catalog up to 2,500 items',
        'Multi-generational property & estate tracking',
        'Priority support & concierge onboarding',
      ],
      ctaText: 'Contact Concierge',
      ctaVariant: 'outline' as const,
      ctaTo: '/contact',
    },
  ];

  const matrix = [
    {
      feature: 'Family Member Seats',
      values: ['2 seats', '5 seats', '10 seats', '25 seats'],
    },
    {
      feature: 'Saved Stores & Geofences',
      values: ['2 places', '10 places', '25 places', '100 places'],
    },
    {
      feature: 'Errands per Month',
      values: ['50', '300', '1,000', '5,000'],
    },
    {
      feature: 'Member Calls & Escalation',
      values: ['Not included', '15 / mo', '60 / mo', 'Unlimited'],
    },
    {
      feature: 'AI & Member Chat Messages',
      values: ['30 / mo', '300 / mo', '1,500 / mo', 'Unlimited'],
    },
    {
      feature: 'Receipt OCR Scans',
      values: ['5 / mo', '50 / mo', '200 / mo', '1,000 / mo'],
    },
    {
      feature: 'Pantry Items',
      values: ['20', '100', '500', '2,500'],
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
            No advertising, no selling your family's data, and no hidden surprises. Simple monthly subscriptions that pay for themselves in saved hours and zero duplicate grocery purchases.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
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
                  <span className="text-3xl font-extrabold tracking-tight text-on-surface">{p.price}</span>
                  <span className="text-xs text-muted">{p.cadence}</span>
                </div>

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
                <Link to={p.ctaTo} className="w-full block">
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
          ))}
        </div>

        {/* Feature Comparison Matrix */}
        <section className="mt-24 rounded-3xl bg-surface border border-outline-variant/30 p-6 sm:p-10 shadow-e1">
          <h2 className="text-headline-lg font-bold text-on-surface text-center">
            Comprehensive Feature Matrix
          </h2>
          <p className="text-body-md text-on-surface-variant text-center mt-2">
            The limits below are the ones the API enforces, not a separate catalogue.
          </p>

          <div className="mt-8 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-md font-bold text-on-surface">
                  <th className="py-3 px-4">Feature</th>
                  <th className="py-3 px-4">Starter</th>
                  <th className="py-3 px-4">Pilot</th>
                  <th className="py-3 px-4 text-secondary">Household Pro</th>
                  <th className="py-3 px-4">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-body-sm divide-y divide-outline-variant/15">
                {matrix.map((row) => (
                  <tr key={row.feature}>
                    <td className="py-3.5 px-4 font-semibold text-on-surface">{row.feature}</td>
                    {row.values.map((value, index) => (
                      <td
                        key={index}
                        className={`py-3.5 px-4 ${
                          index === 2 ? 'font-bold text-secondary' : 'text-muted'
                        }`}
                      >
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
