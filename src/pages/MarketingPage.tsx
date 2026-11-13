import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { PhoneSoftwareSimulation } from '@/components/marketing/PhoneSoftwareSimulation';
import { MarketingLayout } from './marketing/MarketingLayout';
import { FEATURES, SOLUTIONS } from './marketing/marketingData';

export function MarketingPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'FairShare',
        headline: 'Household Logistics & Smart Shared Errands for Modern Families',
        operatingSystem: 'Web, iOS, Android',
        applicationCategory: 'LifestyleApplication, ProductivityApplication',
        description:
          'Household logistics for families who share the load: named ownership, location-aware shopping lists, recurring staples, and calm coordination with PostgreSQL row-level isolation.',
        offers: [
          {
            '@type': 'Offer',
            name: 'Starter Family',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free forever for up to 2 family members, with 2 saved stores and 50 errands a month.',
          },
          {
            '@type': 'Offer',
            name: 'Pilot Family Tier',
            price: '14.99',
            priceCurrency: 'USD',
            description: 'Up to 5 family members, 10 saved stores, 300 errands a month, and 15 member calls.',
          },
          {
            '@type': 'Offer',
            name: 'Household Pro',
            price: '24.99',
            priceCurrency: 'USD',
            description: 'Up to 10 family members, 25 saved stores, 1,000 errands a month, and 60 member calls.',
          },
          {
            '@type': 'Offer',
            name: 'Enterprise Household',
            price: '49.99',
            priceCurrency: 'USD',
            description: 'Up to 25 family members, 100 saved stores, 5,000 errands a month, and unlimited member calls.',
          },
        ],
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue: '4.9',
          reviewCount: '380',
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What is FairShare?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'FairShare is a modern domestic logistics system designed for families to coordinate household needs, grocery runs, and recurring chores. It replaces chaotic group chats with named accountability, geofenced store reminders, and database-isolated security.',
            },
          },
          {
            '@type': 'Question',
            name: 'How is FairShare different from a WhatsApp group or generic todo app?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'Unlike group chats where requests get buried, or generic todo apps built for office workers, FairShare is built specifically for domestic life. Every request has exactly one clear owner and deadline; shopping lists trigger automatically when you arrive at a geofenced grocery store; and recurring staples replenish on predictable cadences.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does geofenced shopping mode work?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'When you save a frequent destination (such as your local grocery store, pharmacy, or home depot), FairShare watches for arrival. The moment you step into the store, your phone notifies you with exactly what your household needs from that location, organized for rapid in-store checkout.',
            },
          },
          {
            '@type': 'Question',
            name: 'How does FairShare protect family privacy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text:
                'FairShare enforces PostgreSQL Row-Level Security (RLS) at the database level. Every household has complete cryptographic and relational isolation. Your family data is never mined, tracked, or sold to advertising brokers.',
            },
          },
        ],
      },
    ],
  };

  const faqs = [
    {
      q: 'What makes FairShare different from a family WhatsApp chat or Apple Reminders?',
      a: 'Group chats are where domestic tasks go to die: messages get buried under memes, nobody knows who actually bought the eggs, or both partners end up buying milk on the way home. Generic todo apps lack domestic awareness. FairShare solves this with single named ownership, store-aware shopping lists, automated safety-stock buffers, and one-tap direct calling for urgent items.',
    },
    {
      q: 'How does geofenced location reminders work without draining battery?',
      a: 'The app reads your position only when it is open or resumes, then compares it with the radiuses of the stores you saved. If you are inside one, that store’s open items surface. It does not stream continuous GPS or record a movement history.',
    },
    {
      q: 'Is FairShare free to use for our family?',
      a: 'Yes! The Starter Family plan is free forever for up to 2 family members. It includes the shared errand board, 2 saved stores, shopping mode, recurring staples, 50 errands a month, 5 receipt scans, and mobile/web sync. Paid tiers add seats, stores, calls and more.',
    },
    {
      q: 'How does calling work when an errand is urgent?',
      a: 'Urgent requests carry a call action. Tapping it passes the responsible member’s phone number into your phone’s own dialer so you can ring them directly. There is no third-party telephony service, per-minute fee or robocall infrastructure.',
    },
    {
      q: 'Can family members use different phones (iOS, Android, and Web)?',
      a: 'Yes. FairShare is built with cross-platform parity. Family members can manage tasks from iPhones, Android devices, or any modern web browser with real-time synchronization.',
    },
  ];

  return (
    <MarketingLayout>
      {/* Inject SEO / AEO JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* -------------------------------------------------------------
          HERO SECTION (High-Converting & Purity UI Mockup Preview)
      -------------------------------------------------------------- */}
      <section className="relative overflow-hidden px-4 pt-12 pb-16 sm:px-6 sm:pt-20 sm:pb-24 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3.5 py-1.5 text-label-sm font-semibold text-secondary shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-secondary" />
            <span>The Household Logistics Operating System</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
            Household Logistics for Families <br className="hidden sm:inline" />
            <span className="text-secondary">Without the Friction</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Never wonder who is picking up the milk, what is due today, or what the pantry is running out of.
            Clear named ownership, store geofenced checklists, and calm domestic coordination.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="xl" variant="primary" className="gap-2 shadow-e2 font-bold">
                  <Icon name="cottage" className="text-[20px]" />
                  <span>Open Household Dashboard</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="xl" variant="primary" className="gap-2 shadow-e2 font-bold">
                    <Icon name="cottage" className="text-[20px]" />
                    <span>Create Free Family Workspace</span>
                  </Button>
                </Link>

                <a
                  href="#interactive-preview"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('interactive-preview')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex"
                >
                  <Button size="xl" variant="outline" className="gap-2 font-semibold hover:border-secondary/50">
                    <Icon name="play_circle" className="text-[18px] text-secondary" />
                    <span>See How It Works</span>
                  </Button>
                </a>
              </>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-6 text-label-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="check_circle" className="text-[16px] text-secondary" /> Free tier forever
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check_circle" className="text-[16px] text-secondary" /> No credit card needed
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="check_circle" className="text-[16px] text-secondary" /> iOS, Android & Web
            </span>
          </div>
        </div>

        {/* Animated Software Simulation On Phone ("How It Works" & Motion Graphics) */}
        <div id="interactive-preview" className="relative mx-auto mt-14 max-w-6xl scroll-mt-24">
          <div className="text-center max-w-3xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Live Software Simulation
            </span>
            <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold text-on-surface">
              How FairShare Works On Mobile
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Watch the interactive mobile app simulation below to see how erranding, OpenStreetMap arrival triggers, in-store shopping checklists, and direct carrier calling operate in real time.
            </p>
          </div>

          <PhoneSoftwareSimulation />
        </div>
      </section>

      {/* -------------------------------------------------------------
          SECTION: CORE MODULES (Softrly Style Multi-Page Hub Links)
      -------------------------------------------------------------- */}
      <section className="border-t border-outline-variant/20 bg-surface px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Product Architecture
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-on-surface">
              Six Dedicated Modules. Zero Chaos.
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Every area of domestic life has dedicated tools. Click any module to explore its full capabilities,
              technical specifications, and workflows.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <Card
                key={feat.slug}
                className="group flex flex-col justify-between p-5 border-outline-variant/30 bg-canvas hover:border-secondary/40 hover:shadow-e2 transition-all duration-200"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-soft text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <Icon name={feat.icon} className="text-[22px]" />
                  </div>
                  <h3 className="mt-4 text-base font-bold text-on-surface group-hover:text-secondary transition-colors">
                    {feat.name}
                  </h3>
                  <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                    {feat.summary}
                  </p>
                </div>

                <div className="mt-5 border-t border-outline-variant/20 pt-3.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    {feat.shortTag}
                  </span>
                  <Link
                    to="/features/$slug"
                    params={{ slug: feat.slug }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-secondary group-hover:translate-x-1 transition-transform"
                  >
                    <span>Learn More</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/features" className="text-xs sm:text-sm font-bold text-secondary hover:underline">
              Browse All Features & Architecture →
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          SECTION: SOLUTIONS BY HOUSEHOLD
      -------------------------------------------------------------- */}
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-canvas">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-3xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Household Solutions
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl lg:text-3xl font-bold text-on-surface">
              Built for How Families Actually Live
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Explore specialized workflows tailored for your family's exact stage and living arrangement.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {SOLUTIONS.map((sol) => (
              <Card
                key={sol.slug}
                className="flex flex-col justify-between p-5 sm:p-7 border-outline-variant/30 bg-surface shadow-e1 hover:shadow-e2 transition-all duration-200"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                    <Icon name={sol.icon} className="text-[22px]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary mt-4 block">
                    {sol.badge}
                  </span>
                  <h3 className="mt-1 text-base font-bold text-on-surface">{sol.title}</h3>
                  <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                    {sol.subtitle}
                  </p>
                </div>

                <div className="mt-6 border-t border-outline-variant/20 pt-3.5">
                  <Link
                    to="/solutions/$slug"
                    params={{ slug: sol.slug }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:underline"
                  >
                    <span>Read {sol.title} Guide</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          MENTAL LOAD COMPARISON SECTION
      -------------------------------------------------------------- */}
      <section className="border-t border-outline-variant/20 bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className="text-headline-lg font-bold text-on-surface sm:text-3xl">
              Why Group Chats & Fridge Sticky Notes Fail Families
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-body-lg text-muted">
              Domestic logistics require clear accountability, physical store proximity, and timely escalation.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="rounded-3xl border border-error/20 bg-coral-soft/40 p-8">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-error text-white">
                  <Icon name="close" className="text-[20px]" />
                </span>
                <h3 className="text-headline-md font-bold text-on-surface">The Chaotic Group Chat</h3>
              </div>
              <ul className="mt-6 space-y-4 text-body-md text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-error">•</span>
                  <span><strong>Invisible Mental Load:</strong> One parent carries the anxiety of remembering everything.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-error">•</span>
                  <span><strong>Zero Ownership:</strong> A message to "someone get milk" means everyone assumes someone else did.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-error">•</span>
                  <span><strong>Duplicate Purchases:</strong> Two people buy paper towels; both forget baby formula.</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-secondary/30 bg-forest-soft/50 p-8 shadow-e1">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white">
                  <Icon name="check" className="text-[20px]" />
                </span>
                <h3 className="text-headline-md font-bold text-on-surface">FairShare</h3>
              </div>
              <ul className="mt-6 space-y-4 text-body-md text-on-surface-variant">
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-secondary">✓</span>
                  <span><strong>Single Named Ownership:</strong> Every errand has one clear owner. No bystander effect.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-secondary">✓</span>
                  <span><strong>Parking Lot Detection:</strong> Checklist surfaces the moment you pull into Trader Joe's.</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="mt-1 text-secondary">✓</span>
                  <span><strong>Direct One-Tap Calling:</strong> When an errand is urgent, tap to call its owner from your phone’s dialer.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          FAQ SECTION (Accordion & Knowledge Base)
      -------------------------------------------------------------- */}
      <section className="border-t border-outline-variant/20 bg-canvas px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
              Answers & Evidence
            </span>
            <h2 className="mt-1 text-headline-lg font-bold text-on-surface sm:text-3xl">
              Frequently Asked Questions
            </h2>
            <p className="mt-2 text-body-md text-muted">
              Direct, transparent answers regarding privacy, functionality, and multi-device support.
            </p>
          </div>

          <div className="mt-10 divide-y divide-outline-variant/20">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="py-4">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between text-left text-body-lg font-bold text-on-surface"
                >
                  <span>{faq.q}</span>
                  <Icon
                    name={openFaq === index ? 'expand_less' : 'expand_more'}
                    className="text-[22px] text-muted transition-transform"
                  />
                </button>
                {openFaq === index && (
                  <p className="mt-2 text-body-md leading-relaxed text-on-surface-variant">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link to="/faq" className="text-label-md font-bold text-secondary hover:underline">
              Explore Full Knowledge Base & FAQ →
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------------
          FINAL CALL TO ACTION
      -------------------------------------------------------------- */}
      <section className="bg-secondary px-4 py-14 text-center text-on-secondary sm:px-6 lg:px-8 shadow-e3">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
            Give Your Household the Calm It Deserves.
          </h2>
          <p className="mt-2.5 max-w-xl mx-auto text-xs sm:text-sm text-white/90 leading-relaxed">
            Set up your family workspace in under 60 seconds. Free forever for up to 2 family members.
          </p>
          <div className="mt-7 flex justify-center gap-3.5">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="inverse" size="xl" className="font-bold gap-2">
                  <Icon name="cottage" className="text-[20px]" />
                  <span>Open Household Dashboard</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button variant="inverse" size="xl" className="font-bold">
                  Create Free Family Workspace
                </Button>
              </Link>
            )}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
