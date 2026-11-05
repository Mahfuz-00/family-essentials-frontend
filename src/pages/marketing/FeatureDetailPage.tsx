import { useMemo } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { MarketingLayout } from './MarketingLayout';
import { FEATURES } from './marketingData';

export function FeatureDetailPage({ slug: propSlug }: { slug?: string }) {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  const params = useParams({ strict: false });
  const targetSlug = propSlug ?? (params as { slug?: string }).slug ?? 'errands';

  const feature = useMemo(() => {
    return FEATURES.find((f) => f.slug === targetSlug) ?? FEATURES[0];
  }, [targetSlug]);

  const otherFeatures = useMemo(() => {
    return FEATURES.filter((f) => f.slug !== feature.slug);
  }, [feature.slug]);

  // Schema.org Structured Data for this feature
  const jsonLd = useMemo(() => {
    return {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: `Family Essentials - ${feature.name}`,
          applicationCategory: 'ProductivityApplication',
          operatingSystem: 'iOS, Android, Web',
          description: feature.summary,
        },
        {
          '@type': 'FAQPage',
          mainEntity: feature.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: faq.answer,
            },
          })),
        },
      ],
    };
  }, [feature]);

  return (
    <MarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-label-sm text-muted">
          <Link to="/" className="hover:text-secondary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link to="/features" className="hover:text-secondary transition-colors">
            Features
          </Link>
          <span>/</span>
          <span className="font-semibold text-on-surface">{feature.name}</span>
        </nav>

        {/* -------------------------------------------------------------
            FEATURE HERO SECTION
        -------------------------------------------------------------- */}
        <section className="relative overflow-hidden rounded-3xl border border-secondary/20 bg-gradient-to-br from-surface via-forest-soft/30 to-sage-soft/60 p-6 sm:p-12 shadow-e2">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-secondary/30 bg-surface/90 px-3 py-1 text-xs font-bold text-secondary shadow-xs">
              <Icon name={feature.icon} className="text-[16px]" />
              <span>{feature.heroEyebrow}</span>
            </div>

            <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              {feature.heroTitle}
            </h1>

            <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl">
              {feature.heroDescription}
            </p>

            {/* CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              {isAuthenticated ? (
                <Link to="/dashboard">
                  <Button variant="primary" size="lg" className="shadow-e2 gap-2">
                    <Icon name="cottage" className="text-[18px]" />
                    <span>Open Dashboard</span>
                    <Icon name="arrow_forward" className="text-[16px]" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button variant="primary" size="lg" className="shadow-e2 gap-2">
                      <span>Start Free Trial</span>
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Button>
                  </Link>

                  <Link to="/login">
                    <Button variant="soft" size="lg" className="gap-2">
                      <Icon name="laptop_mac" className="text-[18px]" />
                      <span>Sign In</span>
                    </Button>
                  </Link>
                </>
              )}
            </div>

            {/* Metrics Strip */}
            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-outline-variant/30 pt-5 sm:grid-cols-3">
              {feature.metrics.map((m) => (
                <div key={m.label} className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-extrabold text-secondary">{m.value}</span>
                  <span className="text-xs font-medium text-muted mt-0.5">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* -------------------------------------------------------------
            THE REALITY: BEFORE VS AFTER COMPARISON
        -------------------------------------------------------------- */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              The Everyday Shift
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Why Domestic Logistics Fail Without Structured Ownership
            </h2>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* The Old Way */}
            <Card className="border-error/20 bg-coral-soft/30 p-5 sm:p-7">
              <div className="flex items-center gap-2 text-sm font-bold text-error">
                <Icon name="cancel" className="text-[18px]" />
                <span>The Unstructured Reality</span>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {feature.beforeBulletPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-error/20 text-error text-[10px] font-bold">
                      ✕
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <blockquote className="mt-5 border-l-2 border-error/40 pl-3.5 italic text-xs text-on-surface-variant">
                "{feature.problemQuote}"
                <footer className="mt-1 font-semibold not-italic text-[11px] text-muted">
                  — {feature.problemAuthor}
                </footer>
              </blockquote>
            </Card>

            {/* The Family Essentials Way */}
            <Card className="border-secondary/30 bg-forest-soft/40 p-5 sm:p-7 shadow-e1">
              <div className="flex items-center gap-2 text-sm font-bold text-secondary">
                <Icon name="check_circle" className="text-[18px]" />
                <span>With Family Essentials</span>
              </div>
              <ul className="mt-4 flex flex-col gap-3">
                {feature.afterBulletPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-xs sm:text-sm text-on-surface leading-relaxed">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary text-white text-[10px] font-bold">
                      ✓
                    </span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 rounded-xl bg-surface p-3.5 border border-secondary/20 flex items-center justify-between">
                <span className="text-xs font-semibold text-secondary">
                  Ready to transform your home?
                </span>
                <Link to="/register" className="text-xs font-bold text-secondary hover:underline">
                  Get Started →
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {/* -------------------------------------------------------------
            DEEP-DIVE CAPABILITIES GRID
        -------------------------------------------------------------- */}
        <section className="mt-16">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Core Capabilities
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Engineered for Real Household Reliability
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Every detail is designed to solve real domestic friction without bloated complexity.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {feature.capabilities.map((cap) => (
              <div
                key={cap.title}
                className="group relative flex flex-col justify-between rounded-2xl border border-outline-variant/30 bg-surface p-5 shadow-e1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-e2"
              >
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary transition-colors group-hover:bg-secondary group-hover:text-white">
                    <Icon name={cap.icon} className="text-[20px]" />
                  </div>
                  <h3 className="mt-3.5 text-sm sm:text-base font-bold text-on-surface">{cap.title}</h3>
                  <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------
            HOW IT OPERATES (3-STEP TIMELINE)
        -------------------------------------------------------------- */}
        <section className="mt-16 rounded-3xl bg-surface border border-outline-variant/30 p-6 sm:p-10">
          <div className="max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Daily Workflow
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              How It Works in Practice
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm text-on-surface-variant">
              Three seamless steps from initial errand creation to verified check-off.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {feature.workflowSteps.map((step) => (
              <div key={step.step} className="flex flex-col relative">
                <span className="text-2xl font-extrabold text-secondary/30">
                  {step.step}
                </span>
                <h3 className="mt-1 text-base font-bold text-on-surface">{step.title}</h3>
                <p className="mt-1.5 text-xs text-on-surface-variant leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------
            FEATURE-SPECIFIC FAQ (AEO DIRECT ANSWER FORMAT)
        -------------------------------------------------------------- */}
        <section className="mt-16 max-w-4xl mx-auto">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-wider text-secondary">
              Direct Answers
            </span>
            <h2 className="mt-1 text-xl sm:text-2xl font-bold text-on-surface">
              Frequently Asked Questions About {feature.name}
            </h2>
          </div>

          <div className="mt-8 flex flex-col gap-3.5">
            {feature.faqs.map((faq) => (
              <Card key={faq.question} className="p-5 sm:p-6 border-outline-variant/30">
                <h3 className="text-sm sm:text-base font-bold text-on-surface">{faq.question}</h3>
                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {faq.answer}
                </p>
              </Card>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------
            EXPLORE OTHER MODULES (Softrly Style Navigation)
        -------------------------------------------------------------- */}
        <section className="mt-16 border-t border-outline-variant/30 pt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-on-surface">
              Explore More Household Modules
            </h2>
            <Link to="/features" className="text-xs font-bold text-secondary hover:underline">
              View All Features →
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherFeatures.slice(0, 3).map((f) => (
              <Link
                key={f.slug}
                to="/features/$slug"
                params={{ slug: f.slug }}
                className="group flex items-center justify-between rounded-2xl border border-outline-variant/30 bg-surface p-4 shadow-e1 hover:border-secondary/50 hover:shadow-e2 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                    <Icon name={f.icon} className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-on-surface group-hover:text-secondary">
                      {f.name}
                    </h3>
                    <p className="text-xs text-muted leading-tight">{f.shortTag}</p>
                  </div>
                </div>
                <Icon name="arrow_forward" className="text-[16px] text-muted group-hover:text-secondary group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------
            BOTTOM CALL TO ACTION BANNER
        -------------------------------------------------------------- */}
        <section className="mt-16 rounded-3xl bg-secondary px-6 py-10 text-center text-on-secondary shadow-e3 sm:px-12 sm:py-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Ready to Streamline {feature.name}?
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-xs sm:text-sm text-emerald-100 leading-relaxed">
            Join thousands of modern families running calm, organized households without the mental load.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button size="xl" className="bg-surface text-secondary hover:bg-canvas shadow-e2 font-bold gap-2">
                  <Icon name="cottage" className="text-[20px]" />
                  <span>Open Household Dashboard</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/register">
                  <Button size="xl" className="bg-surface text-secondary hover:bg-canvas shadow-e2 font-bold">
                    Get Started Free Today
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10 font-semibold">
                    Talk to Support
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
