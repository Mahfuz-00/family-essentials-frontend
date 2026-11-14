import { useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Icon } from '@/components/Icon';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';
import type { MarketingBlogPost } from '@/types';
import { BLOG_CATEGORIES, DEFAULT_BLOG_POSTS } from './blogData';
import { MarketingLayout } from './MarketingLayout';

export function BlogHubPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All Guides');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

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
    return raw.filter((post) => post.is_published !== false);
  }, [blogQuery.data]);

  const categories = useMemo(() => {
    const dynamic = new Set<string>(BLOG_CATEGORIES);
    for (const post of allPosts) {
      if (post.category) dynamic.add(post.category);
    }
    return Array.from(dynamic);
  }, [allPosts]);

  const filteredPosts = useMemo(() => {
    return allPosts.filter((post) => {
      const matchesCat =
        selectedCategory === 'All Guides' ||
        post.category.toLowerCase() === selectedCategory.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.summary.toLowerCase().includes(q) ||
        post.category.toLowerCase().includes(q) ||
        post.author_name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [allPosts, selectedCategory, searchQuery]);

  const featuredPost = useMemo(() => {
    return filteredPosts.find((p) => p.is_featured) ?? filteredPosts[0] ?? null;
  }, [filteredPosts]);

  const remainingPosts = useMemo(() => {
    if (!featuredPost) return [];
    return filteredPosts.filter((p) => p.slug !== featuredPost.slug);
  }, [filteredPosts, featuredPost]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterStatus('submitting');
    try {
      await api.post('/v1/marketing/subscribe', {
        email: newsletterEmail.trim(),
        source: 'blog_newsletter',
        campaign: 'household_functionality_journal',
      });
      setNewsletterStatus('success');
      setNewsletterEmail('');
    } catch {
      setNewsletterStatus('error');
    }
  };

  return (
    <MarketingLayout>
      {/* Hero Header */}
      <section className="relative overflow-hidden px-4 pt-12 pb-10 sm:px-6 sm:pt-16 sm:pb-12 lg:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full bg-forest-soft px-3.5 py-1.5 text-label-sm font-semibold text-secondary shadow-[var(--shadow-clay-sm)]">
            <Icon name="menu_book" className="text-[16px]" />
            <span>The Household Functionality Journal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-on-surface leading-tight">
            How to Improve <span className="text-secondary">Household Functionality</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base text-on-surface-variant leading-relaxed">
            Practical systems engineering for everyday family life. Learn how to eliminate the invisible mental load,
            replace group-chat ambiguity with single named ownership, and put repeatable domestic chores on autopilot.
          </p>
        </div>

        {/* Filter & Search Bar */}
        <div className="mx-auto mt-8 max-w-7xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between rounded-[1.25rem] bg-surface p-3 shadow-e1">
            {/* Sunken Clay Category Track */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 shadow-[var(--shadow-inset)]">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`cursor-pointer whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ease-[var(--spring-easing)] ${
                      active
                        ? 'bg-surface text-secondary shadow-[var(--shadow-clay-sm)] font-bold'
                        : 'text-muted hover:text-on-surface'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative flex items-center lg:w-72">
              <Icon
                name="search"
                className="pointer-events-none absolute left-3.5 text-[18px] text-muted"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search articles & playbooks…"
                aria-label="Search blog articles"
                className="h-10 w-full rounded-xl bg-canvas pl-10 pr-4 text-xs font-medium text-on-surface placeholder:text-muted shadow-[var(--shadow-inset-sm)] outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl flex flex-col gap-10">
          {/* Featured Pillar Guide */}
          {featuredPost ? (
            <Card className="clay-card-interactive stagger-item overflow-hidden p-6 sm:p-8 lg:p-10">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
                <div className="flex flex-col gap-4 lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge tone="primary">Featured Pillar Guide</Badge>
                    <Badge tone="neutral">{featuredPost.category}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                      <Icon name="schedule" className="text-[14px]" />
                      {featuredPost.read_time_minutes} min read
                    </span>
                  </div>

                  <Link
                    to="/blog/$slug"
                    params={{ slug: featuredPost.slug }}
                    className="group inline-block"
                  >
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface transition-colors group-hover:text-secondary">
                      {featuredPost.title}
                    </h2>
                  </Link>

                  <p className="text-sm sm:text-base text-on-surface-variant leading-relaxed">
                    {featuredPost.summary}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-outline-variant/20 pt-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={featuredPost.author_name} />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface">
                          {featuredPost.author_name}
                        </span>
                        <span className="text-[11px] text-muted">{featuredPost.author_role}</span>
                      </div>
                    </div>

                    <Link
                      to="/blog/$slug"
                      params={{ slug: featuredPost.slug }}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-xs font-bold text-on-primary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] transition-all duration-300 ease-[var(--spring-easing)] hover:-translate-y-0.5 hover:brightness-110"
                    >
                      <span>Read Full Guide</span>
                      <Icon name="arrow_forward" className="text-[16px]" />
                    </Link>
                  </div>
                </div>

                {/* Sunken Clay Key Takeaways Preview Panel */}
                <div className="rounded-2xl bg-canvas p-5 sm:p-6 shadow-[var(--shadow-inset)] lg:col-span-5 flex flex-col gap-3.5">
                  <div className="flex items-center gap-2.5 border-b border-outline-variant/20 pb-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary shadow-[var(--shadow-clay-sm)]">
                      <Icon name={featuredPost.icon || 'cottage'} className="text-[20px]" />
                    </span>
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-secondary block">
                        Core System Blueprint
                      </span>
                      <span className="text-[11px] text-muted">
                        Actionable pillars inside this guide
                      </span>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-2.5">
                    {(featuredPost.key_takeaways ?? []).slice(0, 4).map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 rounded-xl bg-surface p-3 text-xs text-on-surface shadow-[var(--shadow-clay-sm)]"
                      >
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest-soft text-[11px] font-extrabold text-secondary">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed font-medium">{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <Icon name="search_off" className="mx-auto text-[32px] text-muted" />
              <h3 className="mt-3 text-base font-bold text-on-surface">
                No articles match your search
              </h3>
              <p className="mt-1 text-xs text-muted">
                Try clearing your search filter or selecting &ldquo;All Guides&rdquo;.
              </p>
              <Button
                variant="soft"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setSelectedCategory('All Guides');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
            </Card>
          )}

          {/* Article Grid */}
          {remainingPosts.length > 0 && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {remainingPosts.map((post, idx) => (
                <Card
                  key={post.slug}
                  className="clay-card-interactive stagger-item flex flex-col justify-between p-6"
                  style={{ '--sibling-index': idx + 1 } as CSSProperties}
                >
                  <div className="flex flex-col gap-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                        <Icon name={post.icon || 'article'} className="text-[20px]" />
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge tone="primary">{post.category}</Badge>
                        <span className="text-[11px] font-semibold text-muted tabular-nums">
                          {post.read_time_minutes} min
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/blog/$slug"
                      params={{ slug: post.slug }}
                      className="group block"
                    >
                      <h3 className="text-lg font-extrabold leading-snug text-on-surface transition-colors group-hover:text-secondary">
                        {post.title}
                      </h3>
                    </Link>

                    <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">
                      {post.summary}
                    </p>

                    {post.key_takeaways && post.key_takeaways.length > 0 && (
                      <div className="rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                          Key Insight
                        </span>
                        <p className="text-xs font-medium text-on-surface leading-snug">
                          {post.key_takeaways[0]}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-outline-variant/20 pt-4">
                    <div className="flex items-center gap-2">
                      <Avatar name={post.author_name} size="sm" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-on-surface leading-tight">
                          {post.author_name}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(post.published_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>

                    <Link
                      to="/blog/$slug"
                      params={{ slug: post.slug }}
                      className="inline-flex items-center gap-1 rounded-xl bg-sage-soft px-3 py-1.5 text-xs font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all hover:bg-forest-soft"
                    >
                      <span>Read</span>
                      <Icon name="arrow_forward" className="text-[14px]" />
                    </Link>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Household Functionality Playbook Newsletter Card */}
          <Card className="p-6 sm:p-8 lg:p-10">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-7 flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Monthly Domestic Playbook
                </span>
                <h3 className="text-xl sm:text-2xl font-extrabold text-on-surface">
                  Get Practical Household Functionality Guides in Your Inbox
                </h3>
                <p className="text-xs sm:text-sm text-muted leading-relaxed">
                  One calm, high-signal dispatch each month covering family logistics templates, seasonal home maintenance checklists, and zero-friction budgeting habits.
                </p>
              </div>

              <div className="lg:col-span-5">
                {newsletterStatus === 'success' ? (
                  <div className="rounded-2xl bg-forest-soft p-4 text-xs font-bold text-secondary shadow-[var(--shadow-inset-sm)] flex items-center gap-2">
                    <Icon name="check_circle" className="text-[18px]" />
                    <span>Subscribed! You will receive our next Household Functionality dispatch.</span>
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="email"
                      required
                      value={newsletterEmail}
                      onChange={(e) => setNewsletterEmail(e.target.value)}
                      placeholder="Enter your email address…"
                      aria-label="Email address for blog updates"
                      className="h-11 flex-1 rounded-xl bg-canvas px-4 text-xs font-medium text-on-surface placeholder:text-muted shadow-[var(--shadow-inset-sm)] outline-none focus:ring-2 focus:ring-secondary/40"
                    />
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={newsletterStatus === 'submitting'}
                      className="shrink-0"
                    >
                      {newsletterStatus === 'submitting' ? 'Subscribing…' : 'Subscribe'}
                    </Button>
                  </form>
                )}
                {newsletterStatus === 'error' && (
                  <p className="mt-2 text-xs text-error">
                    Could not subscribe right now. Please check your email and try again.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </section>
    </MarketingLayout>
  );
}
