import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { MarketingBlogPost } from '@/types';
import { DEFAULT_BLOG_POSTS } from './blogData';
import { MarketingLayout } from './MarketingLayout';

export function BlogPostPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});

  const blogQuery = useQuery({
    queryKey: ['public-blog-posts'],
    queryFn: async () => {
      try {
        const res = await api.get<{ data: MarketingBlogPost[] }>('/v1/marketing/blog');
        return res.data?.data?.length ? res.data.data : DEFAULT_BLOG_POSTS;
      } catch {
        return DEFAULT_BLOG_POSTS;
      }
    },
    placeholderData: DEFAULT_BLOG_POSTS,
  });

  const allPosts = useMemo(() => {
    const raw = blogQuery.data ?? DEFAULT_BLOG_POSTS;
    return raw.filter((p) => p.is_published !== false);
  }, [blogQuery.data]);

  const post = useMemo(() => {
    return (
      allPosts.find((p) => p.slug === slug) ??
      DEFAULT_BLOG_POSTS.find((p) => p.slug === slug) ??
      allPosts[0] ??
      DEFAULT_BLOG_POSTS[0]
    );
  }, [allPosts, slug]);

  const relatedPosts = useMemo(() => {
    return allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);
  }, [allPosts, post.slug]);

  const toggleStep = (index: number) => {
    setCheckedSteps((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    datePublished: post.published_at,
    author: {
      '@type': 'Person',
      name: post.author_name,
      jobTitle: post.author_role,
    },
    publisher: {
      '@type': 'Organization',
      name: 'FairShare',
    },
  };

  return (
    <MarketingLayout>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="px-4 pt-10 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl flex flex-col gap-8">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted">
            <Link to="/" className="hover:text-secondary font-medium">
              Home
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <Link to="/blog" className="hover:text-secondary font-medium">
              Household Functionality Blog
            </Link>
            <Icon name="chevron_right" className="text-[14px]" />
            <span className="font-semibold text-secondary">{post.category}</span>
          </nav>

          {/* Article Header Card */}
          <Card className="p-6 sm:p-8 lg:p-10 flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge tone="primary">{post.category}</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                <Icon name="schedule" className="text-[14px]" />
                {post.read_time_minutes} min read
              </span>
              <span className="text-xs text-muted">·</span>
              <span className="text-xs text-muted">
                Published{' '}
                {new Date(post.published_at).toLocaleDateString(undefined, {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
              {post.summary}
            </p>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
              <div className="flex items-center gap-3">
                <Avatar name={post.author_name} />
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-on-surface">{post.author_name}</span>
                  <span className="text-xs text-muted">{post.author_role}</span>
                </div>
              </div>

              <Link
                to="/blog"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sage-soft px-3.5 py-2 text-xs font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all hover:bg-forest-soft"
              >
                <Icon name="arrow_back" className="text-[15px]" />
                <span>All Articles</span>
              </Link>
            </div>
          </Card>

          {/* Key Takeaways Sunken Clay Summary */}
          {post.key_takeaways && post.key_takeaways.length > 0 && (
            <Card className="p-6 sm:p-8">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-3.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                  <Icon name="lightbulb" className="text-[20px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">
                    Executive Summary &amp; Key Takeaways
                  </h2>
                  <p className="text-xs text-muted">
                    Core principles for improving household functionality right away
                  </p>
                </div>
              </div>

              <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {post.key_takeaways.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-2xl bg-canvas p-4 shadow-[var(--shadow-inset-sm)]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-forest-soft text-xs font-extrabold text-secondary">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-medium text-on-surface leading-relaxed">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Editorial Body Sections */}
          <Card className="p-6 sm:p-8 lg:p-10 flex flex-col gap-8">
            {(post.sections ?? []).map((section, idx) => (
              <section key={idx} className="flex flex-col gap-3">
                <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
                  {section.heading}
                </h2>
                <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed whitespace-pre-line">
                  {section.body}
                </p>
              </section>
            ))}

            {/* Interactive Household Functionality Checklist */}
            {post.action_checklist && post.action_checklist.length > 0 && (
              <div className="mt-2 rounded-2xl bg-canvas p-5 sm:p-6 shadow-[var(--shadow-inset)] flex flex-col gap-4">
                <div className="flex items-center justify-between gap-2 border-b border-outline-variant/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-[var(--shadow-clay-sm)]">
                      <Icon name="task_alt" className="text-[20px]" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-on-surface">
                        Interactive Household Implementation Checklist
                      </h3>
                      <p className="text-xs text-muted">
                        Check off each step as you apply it to your family workspace
                      </p>
                    </div>
                  </div>
                  <Badge tone="success">
                    {Object.values(checkedSteps).filter(Boolean).length} / {post.action_checklist.length} Done
                  </Badge>
                </div>

                <div className="flex flex-col gap-2.5">
                  {post.action_checklist.map((step, idx) => {
                    const isChecked = Boolean(checkedSteps[idx]);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleStep(idx)}
                        className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3.5 text-left transition-all duration-300 ease-[var(--spring-easing)] ${
                          isChecked
                            ? 'bg-forest-soft/70 text-secondary shadow-[var(--shadow-inset-sm)]'
                            : 'bg-surface text-on-surface shadow-[var(--shadow-clay-sm)] hover:-translate-y-0.5'
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isChecked
                              ? 'border-secondary bg-secondary text-white'
                              : 'border-outline-variant bg-canvas text-transparent'
                          }`}
                        >
                          <Icon name="check" className="text-[14px]" />
                        </span>
                        <span
                          className={`text-xs sm:text-sm font-semibold leading-snug ${
                            isChecked ? 'line-through opacity-80' : ''
                          }`}
                        >
                          {step}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          {/* Put It Into Practice CTA */}
          <Card className="p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex flex-col gap-1.5 max-w-xl">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Put This Guide Into Practice
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-on-surface">
                Ready to Upgrade Your Household Functionality?
              </h3>
              <p className="text-xs sm:text-sm text-muted">
                Set up your shared family Kanban board, saved store geofences, and pantry safety-stock thresholds in under 60 seconds.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/register">
                <Button variant="primary" size="lg" className="gap-2">
                  <Icon name="cottage" className="text-[18px]" />
                  <span>Start Free Workspace</span>
                </Button>
              </Link>
              <Link to="/features">
                <Button variant="soft" size="lg">
                  Explore Modules
                </Button>
              </Link>
            </div>
          </Card>

          {/* More Articles */}
          {relatedPosts.length > 0 && (
            <div className="flex flex-col gap-4 pt-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-extrabold text-on-surface">
                  More Guides on Household Functionality
                </h2>
                <Link to="/blog" className="text-xs font-bold text-secondary hover:underline">
                  View All Guides &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                {relatedPosts.map((rel) => (
                  <Card
                    key={rel.slug}
                    className="clay-card-interactive p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <Badge tone="primary">{rel.category}</Badge>
                        <span className="text-[11px] text-muted">{rel.read_time_minutes} min</span>
                      </div>
                      <Link to="/blog/$slug" params={{ slug: rel.slug }}>
                        <h3 className="text-sm font-bold text-on-surface hover:text-secondary transition-colors">
                          {rel.title}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted line-clamp-2">{rel.summary}</p>
                    </div>
                    <Link
                      to="/blog/$slug"
                      params={{ slug: rel.slug }}
                      className="text-xs font-bold text-secondary hover:underline inline-flex items-center gap-1"
                    >
                      <span>Read Guide</span>
                      <Icon name="arrow_forward" className="text-[13px]" />
                    </Link>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </MarketingLayout>
  );
}
