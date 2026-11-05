import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Card } from '@/components/ui/card';
import { MarketingLayout } from './MarketingLayout';
import { SOLUTIONS } from './marketingData';

export function SolutionsHubPage() {
  return (
    <MarketingLayout>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border border-secondary/20 bg-forest-soft px-3 py-1 text-xs font-semibold text-secondary">
            <span className="h-2 w-2 rounded-full bg-secondary" />
            <span>Household Profiles</span>
          </div>

          <h1 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Tailored Logistics for Every Stage of Family Life
          </h1>

          <p className="mt-3 text-sm sm:text-base text-on-surface-variant leading-relaxed max-w-2xl mx-auto">
            Every family is unique. Whether you are balancing dual corporate careers, coordinating split custody across two homes, or caring for aging parents, discover how Family Essentials adapts to your household.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {SOLUTIONS.map((solution) => (
            <Card
              key={solution.slug}
              className="flex flex-col justify-between p-5 sm:p-7 border-outline-variant/30 hover:shadow-e2 transition-all duration-200"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                  <Icon name={solution.icon} className="text-[24px]" />
                </div>

                <div className="mt-5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                    {solution.badge}
                  </span>
                  <h2 className="mt-1 text-base sm:text-lg font-bold text-on-surface">
                    {solution.title}
                  </h2>
                </div>

                <p className="mt-2 text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                  {solution.subtitle}
                </p>

                <div className="mt-5 border-t border-outline-variant/20 pt-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">
                    Primary Friction Solved
                  </span>
                  <ul className="flex flex-col gap-2">
                    {solution.painPoints.slice(0, 2).map((pp) => (
                      <li key={pp.problem} className="text-xs text-on-surface-variant flex items-start gap-2">
                        <span className="text-secondary font-bold">•</span>
                        <span>{pp.problem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 border-t border-outline-variant/20 pt-4">
                <Link
                  to="/solutions/$slug"
                  params={{ slug: solution.slug }}
                  className="group inline-flex items-center gap-1.5 text-xs font-bold text-secondary hover:text-primary transition-colors"
                >
                  <span>Explore {solution.title} Solution</span>
                  <Icon
                    name="arrow_forward"
                    className="text-[14px] transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </MarketingLayout>
  );
}
