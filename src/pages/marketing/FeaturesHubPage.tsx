import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth';
import { MarketingLayout } from './MarketingLayout';
import { FEATURES } from './marketingData';

export function FeaturesHubPage() {
  const token = useAuthStore((state) => state.token);
  const isAuthenticated = Boolean(token);

  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Hub Hero */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Complete Architecture Overview</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Six Dedicated Modules for Complete Household Logistics
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            From single-person errand accountability and saved-place checklists to one-tap direct calling and private ledgers, explore how each module powers your home.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, idx) => (
            <Card
              key={feature.slug}
              className="flex flex-col justify-between p-5 sm:p-7 border-outline-variant/30 hover:shadow-e2 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name={feature.icon} className="text-[22px]" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted">
                    Module 0{idx + 1}
                  </span>
                </div>

                <h2 className="mt-4 text-base sm:text-lg font-bold text-on-surface">
                  {feature.name}
                </h2>

                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {feature.summary}
                </p>

                {/* Key feature highlights */}
                <div className="mt-5 flex flex-wrap gap-1.5">
                  {feature.capabilities.slice(0, 2).map((cap) => (
                    <span
                      key={cap.title}
                      className="inline-flex items-center gap-1 rounded-md bg-sage-soft px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      <Icon name="check" className="text-[12px]" />
                      <span>{cap.title}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-outline-variant/20 pt-4">
                <Link
                  to="/features/$slug"
                  params={{ slug: feature.slug }}
                  className="group inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  <span>Explore {feature.shortTag} Deep Dive</span>
                  <Icon
                    name="arrow_forward"
                    className="text-[14px] transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </Card>
          ))}
        </div>

        {/* Bottom Banner */}
        <section className="mt-16 rounded-3xl bg-secondary px-6 py-10 text-center text-on-secondary shadow-e3 sm:px-12 sm:py-14">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Ready to Experience the Difference?
          </h2>
          <p className="mx-auto mt-2.5 max-w-xl text-xs sm:text-sm text-emerald-100">
            Set up your household in 2 minutes. Free forever for up to 5 family members.
          </p>
          <div className="mt-6 flex justify-center gap-3.5">
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="surface" size="xl" className="font-bold gap-2">
                  <Icon name="cottage" className="text-[20px]" />
                  <span>Open Household Dashboard</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Button>
              </Link>
            ) : (
              <Link to="/register">
                <Button variant="surface" size="xl" className="font-bold">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </section>
      </div>
    </MarketingLayout>
  );
}
