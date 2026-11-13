import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { MarketingLayout } from './MarketingLayout';

export function AboutPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const principles = [
    {
      title: 'One Named Owner',
      description:
        'Every request belongs to exactly one household member. It moves through explicit states — accepted, started, completed — so nobody has to ask who is handling it.',
      icon: 'person_check',
    },
    {
      title: 'Location Beats a Timer',
      description:
        'A reminder at 5:00 PM is useless if you are in a meeting. Save the stores you actually visit, and when the app checks your position inside one of them, that store’s open items surface ready to shop.',
      icon: 'pin_drop',
    },
    {
      title: 'Rules Live on the Server',
      description:
        'Plan caps, member roles and household isolation are enforced by the API and by PostgreSQL row-level security — not by the interface. The dashboard cannot grant access the database refuses.',
      icon: 'shield',
    },
    {
      title: 'Direct Contact, With Consent',
      description:
        'When an errand is urgent, one tap opens your phone’s own dialer and calls the responsible member. Voice escalation is opt-in per member and respects the household quiet window.',
      icon: 'phone',
    },
  ];

  const builtFeatures = [
    'Assignable errands with item lists and asked-vs-got quantities',
    'Saved stores, geofenced arrival checklists and recurring rules',
    'Pantry inventory with restock buffers and auto-generated errands',
    'Shared ledgers with budgets, roles and receipt OCR scanning',
    'Goals, loans, assets and tax tracking in a household finances suite',
    'Roles, invitations, audit history, calendar feed and data export',
  ];

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* About Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Our Mission</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Calm, Accountable Logistics for the Households That Keep Everything Else Running
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            Family Essentials is a household logistics system. It gives errands, recurring staples, store runs, budgets and family finances one shared board — with a single owner per task, so nothing depends on someone remembering.
          </p>
        </div>

        {/* Founding Story */}
        <section className="mt-12 rounded-3xl bg-surface border border-outline-variant/30 p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Why We Built It
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Household Work Rarely Fails Because Nobody Cares
            </h2>

            <div className="mt-5 flex flex-col gap-3.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              <p>
                It fails because a request lives in a group chat, has no owner, and depends on somebody remembering at the right moment. The cognitive overhead of tracking, reminding and renegotiating is the real burden — not the errand itself.
              </p>
              <p>
                Family Essentials takes the opposite approach. A request becomes a record with one assignee, a due time, a priority and a saved place. It moves through explicit states, and the household board shows the truth without anyone asking for an update.
              </p>
              <p>
                Around that core we built the rest of household logistics: recurring staples that spawn before they run out, a pantry that tracks what is actually at home, ledgers with budgets and receipt scanning, and a finances suite for goals, loans, assets and taxes.
              </p>
              <p>
                It is deliberately not a medical, clinical or chore-gamification product. It is the domestic logistics a household already has, made explicit, shared and auditable.
              </p>
            </div>
          </div>
        </section>

        {/* What the product actually does */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              What’s Inside
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              One System for the Work a Household Already Does
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-4xl mx-auto">
            {builtFeatures.map((feature) => (
              <div
                key={feature}
                className="flex items-start gap-3 rounded-2xl border border-outline-variant/30 bg-surface px-4 py-3.5"
              >
                <Icon name="check_circle" className="mt-0.5 text-[18px] text-secondary" />
                <span className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {feature}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Core Principles */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Core Architecture
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Our Four Engineering Principles
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((pr) => (
              <Card key={pr.title} className="p-5 border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name={pr.icon} className="text-[22px]" />
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-on-surface">{pr.title}</h3>
                  <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                    {pr.description}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Privacy Promise Banner */}
        <section className="mt-16 rounded-3xl bg-secondary px-6 py-10 text-center text-on-secondary shadow-e3 sm:px-12 sm:py-14">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Your Household’s Data Stays in Your Household
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
              Every household table runs behind PostgreSQL row-level security: a query without a valid household session returns zero rows. We charge for the product, and we do not sell or broker household data.
            </p>
            <div className="mt-7 flex justify-center">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button size="xl" className="bg-surface text-secondary hover:bg-canvas font-bold gap-2">
                    <Icon name="cottage" className="text-[20px]" />
                    <span>Open Household Dashboard</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Button>
                </Link>
              ) : (
                <Link to="/register">
                  <Button size="xl" className="bg-surface text-secondary hover:bg-canvas font-bold">
                    Join Family Essentials
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
