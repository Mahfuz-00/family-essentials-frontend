import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { MarketingLayout } from './MarketingLayout';
import { SOLUTIONS, FEATURES } from './marketingData';

export function SolutionDetailPage({ slug: propSlug }: { slug?: string }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const params = useParams({ strict: false });
  const targetSlug = propSlug ?? (params as { slug?: string }).slug ?? 'busy-parents';

  const solution = useMemo(() => {
    return SOLUTIONS.find((s) => s.slug === targetSlug) ?? SOLUTIONS[0];
  }, [targetSlug]);

  const recommendedFeatures = useMemo(() => {
    return FEATURES.filter((f) => solution.recommendedFeatureSlugs.includes(f.slug));
  }, [solution]);

  const otherSolutions = useMemo(() => {
    return SOLUTIONS.filter((s) => s.slug !== solution.slug);
  }, [solution.slug]);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-label-sm text-muted">
          <Link to="/" className="hover:text-secondary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/solutions" className="hover:text-secondary transition-colors">
            Solutions
          </Link>
          <span>/</span>
          <span className="font-semibold text-on-surface">{solution.title}</span>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-secondary/20 bg-gradient-to-br from-surface via-forest-soft/30 to-sage-soft/60 p-6 sm:p-12 shadow-e2">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-surface/90 px-3 py-1 text-xs font-bold text-secondary shadow-xs">
              <Icon name={solution.icon} className="text-[16px]" />
              <span>{solution.badge}</span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              {solution.heroTitle}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl">
              {solution.heroDescription}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" className="shadow-e2 gap-2">
                    <Icon name="cottage" className="text-[18px]" />
                    <span>Open Household Dashboard</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" size="lg" className="shadow-e2 gap-2">
                      <span>Get Started for Your Family</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button variant="soft" size="lg">
                      View Family Plans
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* The Pain Points */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
              Friction Identified
            </span>
            <h2 className="mt-1 text-headline-lg font-bold text-on-surface">
              Why Traditional Household Routines Break Down
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {solution.painPoints.map((point) => (
              <Card key={point.problem} className="p-6 border-outline-variant/30 bg-surface">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral-soft text-error">
                  <Icon name="priority_high" className="text-[20px]" />
                </div>
                <h3 className="mt-4 text-headline-sm font-bold text-on-surface">{point.problem}</h3>
                <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
                  {point.impact}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section className="mt-20 rounded-3xl bg-surface border border-outline-variant/30 p-8 sm:p-12">
          <div className="max-w-2xl">
            <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
              Tailored Systems
            </span>
            <h2 className="mt-1 text-headline-lg font-bold text-on-surface">
              How Family Essentials Restores Calm
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-3">
            {solution.solutionFeatures.map((feat) => (
              <div key={feat.title} className="flex flex-col">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name={feat.icon} className="text-[22px]" />
                </div>
                <h3 className="mt-4 text-headline-sm font-bold text-on-surface">{feat.title}</h3>
                <p className="mt-2 text-body-sm text-on-surface-variant leading-relaxed">
                  {feat.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Recommended Modules */}
        <section className="mt-20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
                Recommended Architecture
              </span>
              <h2 className="mt-1 text-headline-lg font-bold text-on-surface">
                Key Modules for This Solution
              </h2>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {recommendedFeatures.map((rf) => (
              <Card key={rf.slug} className="p-6 border-outline-variant/30 flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name={rf.icon} className="text-[20px]" />
                  </div>
                  <h3 className="mt-4 text-headline-sm font-bold text-on-surface">{rf.name}</h3>
                  <p className="mt-2 text-body-sm text-on-surface-variant">{rf.summary}</p>
                </div>
                <div className="mt-6 border-t border-outline-variant/20 pt-3">
                  <Link
                    to="/features/$slug"
                    params={{ slug: rf.slug }}
                    className="inline-flex items-center gap-1.5 text-label-sm font-bold text-secondary hover:underline"
                  >
                    <span>Read Module Details</span>
                    <Icon name="arrow_forward" className="text-[14px]" />
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* Testimonial Quote */}
        <section className="mt-20">
          <Card className="border-secondary/20 bg-forest-soft/30 p-8 sm:p-12 text-center">
            <span className="text-[36px] text-secondary">“</span>
            <blockquote className="max-w-2xl mx-auto -mt-4 text-headline-md font-semibold text-on-surface italic leading-relaxed">
              {solution.testimonial.quote}
            </blockquote>
            <div className="mt-6">
              <span className="text-label-md font-bold text-on-surface block">
                {solution.testimonial.author}
              </span>
              <span className="text-body-xs text-muted block mt-0.5">
                {solution.testimonial.role} · {solution.testimonial.householdSize}
              </span>
            </div>
          </Card>
        </section>

        {/* FAQs */}
        <section className="mt-20 max-w-4xl mx-auto">
          <div className="text-center">
            <span className="text-label-sm font-bold uppercase tracking-wider text-secondary">
              Common Questions
            </span>
            <h2 className="mt-1 text-headline-lg font-bold text-on-surface">
              Frequently Asked Questions: {solution.title}
            </h2>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            {solution.faqs.map((faq) => (
              <Card key={faq.question} className="p-6 border-outline-variant/30">
                <h3 className="text-headline-sm font-bold text-on-surface">{faq.question}</h3>
                <p className="mt-2 text-body-md text-on-surface-variant leading-relaxed">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* Other Solutions */}
        <section className="mt-20 border-t border-outline-variant/30 pt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-headline-sm font-bold text-on-surface">
              Explore Solutions for Other Households
            </h2>
            <Link to="/solutions" className="text-label-md font-bold text-secondary hover:underline">
              All Solutions →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {otherSolutions.map((s) => (
              <Link
                key={s.slug}
                to="/solutions/$slug"
                params={{ slug: s.slug }}
                className="group flex items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 hover:border-secondary/50 hover:shadow-e2 transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <Icon name={s.icon} className="text-[20px]" />
                  </div>
                    <div>
                      <h3 className="text-sm font-bold text-on-surface group-hover:text-secondary">
                        {s.title}
                      </h3>
                      <p className="text-xs text-muted leading-tight">{s.subtitle}</p>
                    </div>
                </div>
                <Icon name="arrow_forward" className="text-[18px] text-muted group-hover:text-secondary group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
