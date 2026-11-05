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
      title: 'Single Named Ownership',
      description:
        'When everyone owns an errand, no one does. We eliminate bystander apathy by enforcing exactly one responsible owner per task.',
      icon: 'person_check',
    },
    {
      title: 'Context Beats Arbitrary Timers',
      description:
        'A reminder at 5:00 PM is useless if you are in a meeting. A reminder when you pull into the grocery store parking lot is indispensable.',
      icon: 'pin_drop',
    },
    {
      title: 'Zero Ads, Zero Data Selling',
      description:
        'Your family’s location beacons, shopping lists, and schedules are strictly confidential. We charge an honest subscription and never monetize your data.',
      icon: 'shield',
    },
    {
      title: 'Direct One-Tap Phone Calling',
      description:
        'Critical errands like urgent medicine refills cannot be left to ignored push alerts. When it matters, one tap dials your partner or family member directly with zero robocalls.',
      icon: 'phone',
    },
  ];

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* About Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Our Founding Mission</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Enterprise-Grade Logistics for the Most Important Organization on Earth: Your Family
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            Businesses spend millions on ERP systems, Jira, and Slack to coordinate simple work projects. Yet modern families juggle careers, school schedules, grocery runs, and elder care using fragmented WhatsApp chats, crumpled receipts, and sticky notes. We built Family Essentials to fix that.
          </p>
        </div>

        {/* Founding Story */}
        <section className="mt-12 rounded-3xl bg-surface border border-outline-variant/30 p-6 sm:p-10">
          <div className="max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              The Genesis
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Why We Rejected the Typical "Chore App" Playbook
            </h2>

            <div className="mt-5 flex flex-col gap-3.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              <p>
                In 2024, our founders—two software engineers with five young kids between them—realized that the primary source of domestic fatigue was not the chores themselves, but the <em>invisible cognitive overhead</em> of remembering, reminding, and renegotiating them.
              </p>
              <p>
                Existing apps either gamified chores with digital stars for toddlers or acted as glorified note pads with no concept of physical store locations, single-person ownership, or urgent escalation.
              </p>
              <p>
                We asked ourselves: <strong>What if a household ran on the same calm, asynchronous, decoupled architecture that powers modern high-reliability engineering teams?</strong>
              </p>
              <p>
                The result was Family Essentials: a quiet, reliable operating system that operates in the background, alerts you when you are actually at the store, and gives both partners transparency without the nag.
              </p>
            </div>
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
              Your Family’s Trust Is Our Entire Business
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-emerald-100 max-w-xl mx-auto leading-relaxed">
              We operate under strict European GDPR and California CCPA privacy standards. We will never sell, analyze, or license your household coordinates or shopping habits.
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
