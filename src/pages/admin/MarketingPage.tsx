import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonPanel } from '@/components/ui/skeleton';
import { StatCard, StatGrid, StatGridSkeleton, StatHighlight } from '@/components/ui/stat-card';
import { Select } from '@/components/ui/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type {
  MarketingAnnouncement,
  MarketingBlogPost,
  MarketingLead,
  MarketingOverview,
  MarketingPromotion,
  Paginated,
  ReferralProgramSettings,
} from '@/types';

type TabKey = 'overview' | 'blog' | 'promotions' | 'announcements' | 'leads' | 'referrals';

export function MarketingPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [promoStatus, setPromoStatus] = useState<string>('all');
  const [leadStatus, setLeadStatus] = useState<string>('all');
  const [leadSearch, setLeadSearch] = useState<string>('');

  // Modals
  const [createPromoOpen, setCreatePromoOpen] = useState(false);
  const [createBannerOpen, setCreateBannerOpen] = useState(false);
  const [blogModalOpen, setBlogModalOpen] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState<number | null>(null);

  const [blogForm, setBlogForm] = useState({
    title: '',
    slug: '',
    category: 'Household Functionality',
    read_time_minutes: 6,
    author_name: 'Dr. Maya Lin',
    author_role: 'Domestic Systems Researcher',
    icon: 'cottage',
    summary: '',
    key_takeaways_text: '',
    sections: [
      { heading: '1. Identify the Operational Bottleneck', body: '' },
      { heading: '2. Implement Single Named Ownership', body: '' },
    ],
    action_checklist_text: '',
    is_featured: false,
    is_published: true,
  });

  // Forms
  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    discount_type: 'percent' as 'percent' | 'fixed_amount',
    discount_value: 20,
    currency: 'USD',
    duration: 'once' as 'once' | 'repeating' | 'forever',
    max_redemptions: 100,
    expires_at: '',
  });

  const [bannerForm, setBannerForm] = useState({
    title: '',
    message: '',
    cta_text: 'Learn More',
    cta_url: '/billing',
    tone: 'primary' as 'primary' | 'success' | 'warning' | 'info',
    target_audience: 'all' as 'all' | 'trial_only' | 'free_only' | 'paying_only',
    dismissable: true,
  });

  // Queries
  const overviewQuery = useQuery({
    queryKey: ['platform', 'marketing', 'overview'],
    queryFn: async () => (await api.get<{ data: MarketingOverview }>('/v1/platform/marketing/overview')).data.data,
  });

  const promotionsQuery = useQuery({
    queryKey: ['platform', 'marketing', 'promotions', promoStatus],
    queryFn: async () =>
      (
        await api.get<Paginated<MarketingPromotion>>('/v1/platform/marketing/promotions', {
          params: promoStatus !== 'all' ? { status: promoStatus } : {},
        })
      ).data,
  });

  const announcementsQuery = useQuery({
    queryKey: ['platform', 'marketing', 'announcements'],
    queryFn: async () =>
      (await api.get<{ data: MarketingAnnouncement[] }>('/v1/platform/marketing/announcements')).data.data,
  });

  const leadsQuery = useQuery({
    queryKey: ['platform', 'marketing', 'leads', leadStatus, leadSearch],
    queryFn: async () =>
      (
        await api.get<Paginated<MarketingLead>>('/v1/platform/marketing/leads', {
          params: {
            ...(leadStatus !== 'all' ? { status: leadStatus } : {}),
            ...(leadSearch.trim() ? { search: leadSearch.trim() } : {}),
          },
        })
      ).data,
  });

  const referralsQuery = useQuery({
    queryKey: ['platform', 'marketing', 'referrals'],
    queryFn: async () =>
      (await api.get<{ data: ReferralProgramSettings }>('/v1/platform/marketing/referrals')).data.data,
  });

  const blogQuery = useQuery({
    queryKey: ['platform', 'marketing', 'blog'],
    queryFn: async () =>
      (await api.get<{ data: MarketingBlogPost[] }>('/v1/platform/marketing/blog')).data.data,
  });

  const openNewBlogModal = () => {
    setEditingBlogId(null);
    setBlogForm({
      title: '',
      slug: '',
      category: 'Household Functionality',
      read_time_minutes: 6,
      author_name: 'Dr. Maya Lin',
      author_role: 'Domestic Systems Researcher',
      icon: 'cottage',
      summary: '',
      key_takeaways_text:
        'Replace multi-owner requests with single named ownership.\nAnchor checklists to store locations rather than clock alarms.',
      sections: [
        {
          heading: '1. Diagnose the Household Bottleneck',
          body: 'Explain how invisible mental load or fragmented group chats create friction in everyday domestic routines.',
        },
        {
          heading: '2. Build a Repeatable System',
          body: 'Walk through the step-by-step operational habit that eliminates ambiguity for every family member.',
        },
      ],
      action_checklist_text:
        'Assign one clear owner to every open household errand.\nPin your top 3 grocery and pharmacy stops as saved places.',
      is_featured: false,
      is_published: true,
    });
    setBlogModalOpen(true);
  };

  const openEditBlogModal = (post: MarketingBlogPost) => {
    setEditingBlogId(post.id);
    setBlogForm({
      title: post.title,
      slug: post.slug,
      category: post.category,
      read_time_minutes: post.read_time_minutes,
      author_name: post.author_name,
      author_role: post.author_role,
      icon: post.icon || 'cottage',
      summary: post.summary,
      key_takeaways_text: (post.key_takeaways ?? []).join('\n'),
      sections:
        post.sections && post.sections.length > 0
          ? post.sections
          : [{ heading: 'Overview', body: post.summary }],
      action_checklist_text: (post.action_checklist ?? []).join('\n'),
      is_featured: post.is_featured,
      is_published: post.is_published,
    });
    setBlogModalOpen(true);
  };

  const saveBlogMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: blogForm.title,
        slug: blogForm.slug,
        category: blogForm.category,
        read_time_minutes: blogForm.read_time_minutes,
        author_name: blogForm.author_name,
        author_role: blogForm.author_role,
        icon: blogForm.icon,
        summary: blogForm.summary,
        key_takeaways: blogForm.key_takeaways_text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        sections: blogForm.sections.filter((s) => s.heading.trim() && s.body.trim()),
        action_checklist: blogForm.action_checklist_text
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        is_featured: blogForm.is_featured,
        is_published: blogForm.is_published,
      };
      if (editingBlogId) {
        return api.patch(`/v1/platform/marketing/blog/${editingBlogId}`, payload);
      }
      return api.post('/v1/platform/marketing/blog', payload);
    },
    onSuccess: () => {
      setNotice(
        editingBlogId
          ? 'Blog article updated and synced to public website.'
          : 'New blog article published to public website!',
      );
      setBlogModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'blog'] });
      queryClient.invalidateQueries({ queryKey: ['public-blog-posts'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const toggleBlogMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/v1/platform/marketing/blog/${id}/toggle`),
    onSuccess: () => {
      setNotice('Blog post publication status updated.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'blog'] });
      queryClient.invalidateQueries({ queryKey: ['public-blog-posts'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteBlogMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/platform/marketing/blog/${id}`),
    onSuccess: () => {
      setNotice('Blog post removed.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'blog'] });
      queryClient.invalidateQueries({ queryKey: ['public-blog-posts'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  // Mutations
  const createPromoMutation = useMutation({
    mutationFn: async () => api.post('/v1/platform/marketing/promotions', promoForm),
    onSuccess: () => {
      setNotice('Promo code created successfully.');
      setCreatePromoOpen(false);
      setPromoForm({
        code: '',
        description: '',
        discount_type: 'percent',
        discount_value: 20,
        currency: 'USD',
        duration: 'once',
        max_redemptions: 100,
        expires_at: '',
      });
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const togglePromoMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/v1/platform/marketing/promotions/${id}/toggle`),
    onSuccess: () => {
      setNotice('Promotion status updated.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'promotions'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/platform/marketing/promotions/${id}`),
    onSuccess: () => {
      setNotice('Promotion deleted.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'promotions'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const createBannerMutation = useMutation({
    mutationFn: async () => api.post('/v1/platform/marketing/announcements', bannerForm),
    onSuccess: () => {
      setNotice('Announcement published.');
      setCreateBannerOpen(false);
      setBannerForm({
        title: '',
        message: '',
        cta_text: 'Learn More',
        cta_url: '/billing',
        tone: 'primary',
        target_audience: 'all',
        dismissable: true,
      });
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const toggleBannerMutation = useMutation({
    mutationFn: async (id: number) => api.post(`/v1/platform/marketing/announcements/${id}/toggle`),
    onSuccess: () => {
      setNotice('Announcement status toggled.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'announcements'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const deleteBannerMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/v1/platform/marketing/announcements/${id}`),
    onSuccess: () => {
      setNotice('Announcement deleted.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'announcements'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const updateLeadStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) =>
      api.patch(`/v1/platform/marketing/leads/${id}`, { status }),
    onSuccess: () => {
      setNotice('Lead status updated.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'leads'] });
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'overview'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const updateReferralMutation = useMutation({
    mutationFn: async (payload: ReferralProgramSettings) =>
      api.post('/v1/platform/marketing/referrals', payload),
    onSuccess: () => {
      setNotice('Referral program settings saved.');
      queryClient.invalidateQueries({ queryKey: ['platform', 'marketing', 'referrals'] });
    },
    onError: (err) => setError(apiError(err)),
  });

  const exportLeadsCsv = () => {
    window.location.href = '/api/v1/platform/marketing/leads/export';
  };

  const overview = overviewQuery.data;
  const promotions = promotionsQuery.data?.data ?? [];
  const announcements = announcementsQuery.data ?? [];
  const leads = leadsQuery.data?.data ?? [];
  const referrals = referralsQuery.data;
  const blogPosts = blogQuery.data ?? [];

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Marketing"
          titleSize="headline"
          description="Publish website blog articles on household functionality, manage promotional coupons, broadcast banners, and track inbound leads."
          actions={
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-xl bg-sage-soft px-4 py-2.5 text-label-md font-bold text-secondary shadow-[var(--shadow-clay-sm)] transition-all hover:bg-forest-soft"
              >
                <Icon name="open_in_new" className="text-[18px]" />
                View Live Website Blog
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('blog');
                  openNewBlogModal();
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gradient-to-br from-secondary to-primary px-4 py-2.5 text-label-md font-bold text-on-primary shadow-[0_6px_14px_-4px_rgba(55,104,71,0.45)] transition-all hover:brightness-110"
              >
                <Icon name="edit_note" className="text-[18px]" />
                Write Blog Article
              </button>
            </div>
          }
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* Soft Tactile Submodule Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/80 bg-surface p-1.5 shadow-e1">
          {[
            { key: 'overview', label: 'Growth KPIs', icon: 'trending_up' },
            { key: 'blog', label: `Website Blog (${blogPosts.length})`, icon: 'article' },
            { key: 'promotions', label: 'Promo Codes & Vouchers', icon: 'local_offer' },
            { key: 'announcements', label: 'Announcements & Banners', icon: 'campaign' },
            { key: 'leads', label: 'Leads & Waitlist', icon: 'contacts' },
            { key: 'referrals', label: 'Referral Program', icon: 'loyalty' },
          ].map((t) => {
            const isActive = activeTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setActiveTab(t.key as TabKey);
                  setError(null);
                  setNotice(null);
                }}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-label-md font-bold transition-all ${
                  isActive
                    ? 'bg-secondary text-on-secondary shadow-xs'
                    : 'text-on-surface-variant hover:bg-sage-soft/60 hover:text-on-surface'
                }`}
              >
                <Icon name={t.icon} className="text-[18px]" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex flex-col gap-6">
            {overviewQuery.isLoading && (
              <>
                <StatGridSkeleton count={4} />
                <SkeletonPanel className="h-64" />
                <SkeletonPanel className="h-48" />
              </>
            )}
            {overview && (
              <>
                <StatGrid count={4}>
                  <StatCard
                    title="Total Inbound Leads"
                    value={overview.total_leads.toLocaleString()}
                    subtitle={`${overview.new_leads} new · ${overview.converted_leads} converted`}
                    icon="contacts"
                    tone="forest"
                    highlight={
                      <StatHighlight
                        tone="forest"
                        icon="trending_up"
                        label={`${overview.lead_conversion_rate}% conversion rate`}
                      />
                    }
                  />
                  <StatCard
                    title="Active Promo Codes"
                    value={overview.active_promotions}
                    subtitle="Live discount vouchers"
                    icon="local_offer"
                    tone="sage"
                    highlight={
                      <StatHighlight
                        tone="sage"
                        icon="redeem"
                        label={`${overview.total_redemptions.toLocaleString()} total redemptions`}
                      />
                    }
                  />
                  <StatCard
                    title="Active Announcements"
                    value={overview.active_announcements}
                    subtitle="Broadcast banners running"
                    icon="campaign"
                    tone="amber"
                    highlight={
                      <StatHighlight
                        tone="amber"
                        icon="visibility"
                        label="Live across dashboards"
                      />
                    }
                  />
                  <StatCard
                    title="Banner Click-Through Rate"
                    value={`${overview.banner_ctr_percent}%`}
                    subtitle={`${overview.total_clicks} clicks / ${overview.total_impressions.toLocaleString()} views`}
                    icon="ads_click"
                    tone="forest"
                    highlight={
                      <StatHighlight
                        tone="forest"
                        icon="insights"
                        label="Client engagement"
                      />
                    }
                  />
                </StatGrid>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <Card className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between border-b border-surface-container pb-3">
                      <h3 className="text-headline-sm font-bold text-on-surface">Quick Campaign Actions</h3>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                        <div>
                          <h4 className="text-label-md font-bold text-on-surface">New Discount Coupon</h4>
                          <p className="text-body-xs text-muted">Create seasonal or affiliate promo vouchers</p>
                        </div>
                        <Button size="sm" onClick={() => setCreatePromoOpen(true)}>
                          <Icon name="add" className="text-[16px]" />
                          Create Promo
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                        <div>
                          <h4 className="text-label-md font-bold text-on-surface">Broadcast Banner</h4>
                          <p className="text-body-xs text-muted">Publish top-of-screen message to client households</p>
                        </div>
                        <Button size="sm" onClick={() => setCreateBannerOpen(true)}>
                          <Icon name="campaign" className="text-[16px]" />
                          Create Banner
                        </Button>
                      </div>

                      <div className="flex items-center justify-between rounded-xl bg-surface-container-low p-4">
                        <div>
                          <h4 className="text-label-md font-bold text-on-surface">Export Marketing Leads</h4>
                          <p className="text-body-xs text-muted">Download waitlist and lead contacts as CSV</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={exportLeadsCsv}>
                          <Icon name="download" className="text-[16px]" />
                          Export CSV
                        </Button>
                      </div>
                    </div>
                  </Card>

                  <Card className="flex flex-col gap-4 p-6">
                    <div className="flex items-center justify-between border-b border-surface-container pb-3">
                      <h3 className="text-headline-sm font-bold text-on-surface">Active Announcement Preview</h3>
                      <Badge tone="success">Live on Client Apps</Badge>
                    </div>
                    {announcements.length === 0 ? (
                      <p className="py-8 text-center text-body-sm text-muted">No announcement banners currently active.</p>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {announcements.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className={`flex flex-col gap-2 rounded-xl border p-4 ${
                              a.tone === 'success'
                                ? 'border-success/30 bg-forest-soft/30'
                                : a.tone === 'warning'
                                  ? 'border-warning/30 bg-warning/10'
                                  : 'border-primary/30 bg-sage-soft/30'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-on-surface">{a.title}</span>
                              <Badge tone={a.is_active ? 'success' : 'neutral'}>
                                {a.is_active ? 'Active' : 'Paused'}
                              </Badge>
                            </div>
                            <p className="text-body-sm text-on-surface-variant">{a.message}</p>
                            {a.cta_text && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-body-xs font-bold text-secondary">CTA: {a.cta_text}</span>
                                <span className="text-body-xs text-muted">({a.cta_url})</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB: WEBSITE BLOG & ARTICLES */}
        {activeTab === 'blog' && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">
                  Household Functionality Blog Publisher
                </h3>
                <p className="text-body-sm text-muted">
                  Articles published here appear live on the public website at{' '}
                  <Link to="/blog" className="font-semibold text-secondary hover:underline">
                    /blog
                  </Link>{' '}
                  and on the homepage.
                </p>
              </div>
              <Button onClick={openNewBlogModal}>
                <Icon name="add" className="text-[18px]" />
                Publish New Article
              </Button>
            </div>

            {blogQuery.isLoading ? (
              <SkeletonPanel className="h-64" />
            ) : blogPosts.length === 0 ? (
              <Card className="p-10 text-center text-muted">
                No blog articles created yet. Click &ldquo;Publish New Article&rdquo; to write your first guide.
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                {blogPosts.map((post) => (
                  <Card key={post.id} className="flex flex-col justify-between gap-4 p-6">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone="primary">{post.category}</Badge>
                          {post.is_featured && <Badge tone="warning">Featured Pillar</Badge>}
                        </div>
                        <Badge tone={post.is_published ? 'success' : 'neutral'}>
                          {post.is_published ? 'Published on Website' : 'Draft'}
                        </Badge>
                      </div>

                      <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-forest-soft text-secondary shadow-[var(--shadow-inset-sm)]">
                          <Icon name={post.icon || 'article'} className="text-[20px]" />
                        </span>
                        <div>
                          <h4 className="text-base font-extrabold text-on-surface leading-snug">
                            {post.title}
                          </h4>
                          <span className="text-xs text-muted">
                            By {post.author_name} ({post.author_role}) · {post.read_time_minutes} min read
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {post.summary}
                      </p>

                      <div className="rounded-2xl bg-canvas p-3 text-xs text-muted shadow-[var(--shadow-inset-sm)] flex items-center justify-between">
                        <span>
                          {(post.sections ?? []).length} sections · {(post.action_checklist ?? []).length} checklist actions
                        </span>
                        <Link
                          to="/blog/$slug"
                          params={{ slug: post.slug }}
                          className="font-bold text-secondary hover:underline inline-flex items-center gap-1"
                        >
                          <span>Preview on Website</span>
                          <Icon name="open_in_new" className="text-[13px]" />
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-outline-variant/20 pt-3.5">
                      <span className="font-mono text-[11px] text-muted">/blog/{post.slug}</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => openEditBlogModal(post)}
                        >
                          <Icon name="edit" className="text-[15px]" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBlogMutation.mutate(post.id)}
                        >
                          {post.is_published ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBlogMutation.mutate(post.id)}
                        >
                          <Icon name="delete" className="text-[15px] text-error" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROMOTIONS */}
        {activeTab === 'promotions' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Select
                  value={promoStatus}
                  onChange={(e) => setPromoStatus(e.target.value)}
                  className="w-40"
                >
                  <option value="all">All Vouchers</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Paused Only</option>
                </Select>
              </div>

              <Button onClick={() => setCreatePromoOpen(true)}>
                <Icon name="add" className="text-[18px]" />
                Create New Promo Code
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <Table className="min-w-[800px]">
                <THead>
                  <TH>Code</TH>
                  <TH>Discount</TH>
                  <TH>Redemptions</TH>
                  <TH>Expires</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </THead>
                <tbody>
                  {promotions.length === 0 ? (
                    <TR>
                      <TD colSpan={6} className="py-8 text-center text-muted">
                        No promotional codes match your filter.
                      </TD>
                    </TR>
                  ) : (
                    promotions.map((p) => (
                      <TR key={p.id}>
                        <TD>
                          <div className="flex flex-col">
                            <span className="font-mono text-label-md font-bold text-on-surface">{p.code}</span>
                            <span className="text-body-xs text-muted">{p.description || '—'}</span>
                          </div>
                        </TD>
                        <TD>
                          <span className="font-bold text-on-surface">
                            {p.discount_type === 'percent'
                              ? `${p.discount_value}% OFF`
                              : `$${(p.discount_value / 100).toFixed(2)} Credit`}
                          </span>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-sm text-on-surface">
                            {p.times_redeemed} {p.max_redemptions ? `/ ${p.max_redemptions}` : 'used'}
                          </span>
                        </TD>
                        <TD>
                          <span className="text-body-sm text-muted">
                            {p.expires_at ? new Date(p.expires_at).toLocaleDateString() : 'Never'}
                          </span>
                        </TD>
                        <TD>
                          <Badge tone={p.is_active ? 'success' : 'neutral'}>
                            {p.is_active ? 'Active' : 'Paused'}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => togglePromoMutation.mutate(p.id)}
                            >
                              {p.is_active ? 'Pause' : 'Activate'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deletePromoMutation.mutate(p.id)}
                            >
                              <Icon name="delete" className="text-[16px] text-error" />
                            </Button>
                          </div>
                        </TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {/* TAB 3: ANNOUNCEMENTS */}
        {activeTab === 'announcements' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Announcement Banners</h3>
                <p className="text-body-sm text-muted">Header broadcasts shown to client web dashboards and mobile users</p>
              </div>
              <Button onClick={() => setCreateBannerOpen(true)}>
                <Icon name="add" className="text-[18px]" />
                Publish Announcement
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {announcements.length === 0 ? (
                <Card className="col-span-2 py-8 text-center text-muted">
                  No announcement campaigns currently scheduled.
                </Card>
              ) : (
                announcements.map((a) => (
                  <Card key={a.id} className="flex flex-col justify-between gap-4 p-5">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <Badge tone={a.tone}>{a.tone.toUpperCase()}</Badge>
                        <Badge tone={a.is_active ? 'success' : 'neutral'}>
                          {a.is_active ? 'Live' : 'Paused'}
                        </Badge>
                      </div>
                      <h4 className="text-label-lg font-bold text-on-surface">{a.title}</h4>
                      <p className="text-body-sm text-on-surface-variant">{a.message}</p>
                      {a.cta_text && (
                        <div className="flex items-center gap-2 text-body-xs font-semibold text-secondary">
                          <span>Button: &ldquo;{a.cta_text}&rdquo;</span>
                          <span className="font-mono text-muted">({a.cta_url})</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between border-t border-surface-container pt-3">
                      <div className="flex items-center gap-3 font-mono text-body-xs text-muted">
                        <span>{a.impressions_count.toLocaleString()} views</span>
                        <span>·</span>
                        <span>{a.clicks_count} clicks</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleBannerMutation.mutate(a.id)}
                        >
                          {a.is_active ? 'Hide' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteBannerMutation.mutate(a.id)}
                        >
                          <Icon name="delete" className="text-[16px] text-error" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LEADS & WAITLIST */}
        {activeTab === 'leads' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Search lead email or name…"
                  className="w-64"
                />
                <Select
                  value={leadStatus}
                  onChange={(e) => setLeadStatus(e.target.value)}
                  className="w-40"
                >
                  <option value="all">All Statuses</option>
                  <option value="new">New Inbound</option>
                  <option value="contacted">Contacted</option>
                  <option value="converted">Converted</option>
                  <option value="unsubscribed">Unsubscribed</option>
                </Select>
              </div>

              <Button variant="outline" onClick={exportLeadsCsv}>
                <Icon name="download" className="text-[18px]" />
                Export Leads CSV
              </Button>
            </div>

            <Card className="overflow-hidden p-0">
              <Table className="min-w-[800px]">
                <THead>
                  <TH>Contact</TH>
                  <TH>Source</TH>
                  <TH>Campaign</TH>
                  <TH>Date</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Triage</TH>
                </THead>
                <tbody>
                  {leads.length === 0 ? (
                    <TR>
                      <TD colSpan={6} className="py-8 text-center text-muted">
                        No marketing leads found.
                      </TD>
                    </TR>
                  ) : (
                    leads.map((l) => (
                      <TR key={l.id}>
                        <TD>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{l.name || 'Anonymous Prospect'}</span>
                            <span className="font-mono text-body-xs text-muted">{l.email}</span>
                          </div>
                        </TD>
                        <TD>
                          <Badge tone="neutral">{l.source}</Badge>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-xs text-on-surface">{l.campaign || 'organic'}</span>
                        </TD>
                        <TD>
                          <span className="text-body-sm text-muted">
                            {new Date(l.created_at).toLocaleDateString()}
                          </span>
                        </TD>
                        <TD>
                          <Badge
                            tone={
                              l.status === 'converted'
                                ? 'success'
                                : l.status === 'contacted'
                                  ? 'primary'
                                  : l.status === 'new'
                                    ? 'warning'
                                    : 'neutral'
                            }
                          >
                            {l.status}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          <Select
                            aria-label="Triage status"
                            value={l.status}
                            onChange={(e) =>
                              updateLeadStatusMutation.mutate({ id: l.id, status: e.target.value })
                            }
                            className="h-8 text-label-xs"
                          >
                            <option value="new">Mark New</option>
                            <option value="contacted">Mark Contacted</option>
                            <option value="converted">Mark Converted</option>
                            <option value="unsubscribed">Unsubscribe</option>
                          </Select>
                        </TD>
                      </TR>
                    ))
                  )}
                </tbody>
              </Table>
            </Card>
          </div>
        )}

        {/* TAB 5: REFERRAL PROGRAM */}
        {activeTab === 'referrals' && referrals && (
          <Card className="flex flex-col gap-6 p-6">
            <div className="flex items-center justify-between border-b border-surface-container pb-4">
              <div>
                <h3 className="text-headline-sm font-bold text-on-surface">Household Referral Incentives</h3>
                <p className="text-body-sm text-muted">Reward families when they recommend FairShare to friends and neighbors</p>
              </div>
              <Badge tone={referrals.enabled ? 'success' : 'neutral'}>
                {referrals.enabled ? 'Program Live' : 'Program Inactive'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="referrals-enabled"
                    checked={referrals.enabled}
                    onChange={(e) =>
                      updateReferralMutation.mutate({ ...referrals, enabled: e.target.checked })
                    }
                    className="h-4 w-4 accent-secondary"
                  />
                  <Label htmlFor="referrals-enabled" className="cursor-pointer font-bold text-on-surface">
                    Enable Cross-Household Referral Engine
                  </Label>
                </div>

                <div>
                  <Label htmlFor="reward-type">Referrer Reward Type</Label>
                  <Select
                    id="reward-type"
                    value={referrals.reward_type}
                    onChange={(e) =>
                      updateReferralMutation.mutate({
                        ...referrals,
                        reward_type: e.target.value as 'credit_minor' | 'free_months',
                      })
                    }
                  >
                    <option value="credit_minor">Bill Credit in Minor Units (e.g. $10.00)</option>
                    <option value="free_months">Free Subscription Month(s)</option>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="referrer-bonus">Referrer Credit Amount (Cents)</Label>
                  <Input
                    id="referrer-bonus"
                    type="number"
                    value={referrals.referrer_bonus_cents}
                    onChange={(e) =>
                      updateReferralMutation.mutate({
                        ...referrals,
                        referrer_bonus_cents: Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-body-xs text-muted">
                    1000 cents = $10.00 bill credit issued to referring household.
                  </span>
                </div>

                <div>
                  <Label htmlFor="referee-discount">Referred Household Discount (%)</Label>
                  <Input
                    id="referee-discount"
                    type="number"
                    value={referrals.referee_discount_percent}
                    onChange={(e) =>
                      updateReferralMutation.mutate({
                        ...referrals,
                        referee_discount_percent: Number(e.target.value),
                      })
                    }
                  />
                  <span className="text-body-xs text-muted">
                    First invoice percentage discount applied upon sign-up.
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="referral-terms">Referral Terms &amp; Conditions (Markdown)</Label>
                <textarea
                  id="referral-terms"
                  rows={9}
                  value={referrals.terms_markdown}
                  onChange={(e) =>
                    updateReferralMutation.mutate({
                      ...referrals,
                      terms_markdown: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-surface-container bg-canvas p-3 font-mono text-body-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary/50"
                />
              </div>
            </div>
          </Card>
        )}

        {/* MODAL: CREATE PROMO CODE */}
        <Modal
          open={createPromoOpen}
          onClose={() => setCreatePromoOpen(false)}
          title="Create New Promotional Code"
          description="Issue discount vouchers for seasonal marketing campaigns and partnerships."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreatePromoOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!promoForm.code.trim() || createPromoMutation.isPending}
                onClick={() => createPromoMutation.mutate()}
              >
                Create Coupon
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="promo-code">Promo Code</Label>
              <Input
                id="promo-code"
                placeholder="e.g. FAIRSPRING20"
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
              />
            </div>

            <div>
              <Label htmlFor="promo-desc">Campaign Description</Label>
              <Input
                id="promo-desc"
                placeholder="e.g. Spring promotional welcome discount"
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="promo-type">Discount Type</Label>
                <Select
                  id="promo-type"
                  value={promoForm.discount_type}
                  onChange={(e) =>
                    setPromoForm({
                      ...promoForm,
                      discount_type: e.target.value as 'percent' | 'fixed_amount',
                    })
                  }
                >
                  <option value="percent">Percentage Off (%)</option>
                  <option value="fixed_amount">Fixed Amount (Cents)</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="promo-val">
                  {promoForm.discount_type === 'percent' ? 'Discount Percentage (%)' : 'Discount in Cents ($)'}
                </Label>
                <Input
                  id="promo-val"
                  type="number"
                  value={promoForm.discount_value}
                  onChange={(e) => setPromoForm({ ...promoForm, discount_value: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="promo-duration">Duration</Label>
                <Select
                  id="promo-duration"
                  value={promoForm.duration}
                  onChange={(e) =>
                    setPromoForm({
                      ...promoForm,
                      duration: e.target.value as 'once' | 'repeating' | 'forever',
                    })
                  }
                >
                  <option value="once">First Invoice Only (Once)</option>
                  <option value="repeating">Repeating Monthly</option>
                  <option value="forever">Forever (Permanent)</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="promo-max">Max Redemptions</Label>
                <Input
                  id="promo-max"
                  type="number"
                  value={promoForm.max_redemptions}
                  onChange={(e) => setPromoForm({ ...promoForm, max_redemptions: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </Modal>

        {/* MODAL: CREATE BROADCAST BANNER */}
        <Modal
          open={createBannerOpen}
          onClose={() => setCreateBannerOpen(false)}
          title="Publish Announcement Banner"
          description="Broadcast announcements to web and mobile dashboard headers."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateBannerOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!bannerForm.title.trim() || !bannerForm.message.trim() || createBannerMutation.isPending}
                onClick={() => createBannerMutation.mutate()}
              >
                Publish Campaign
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="banner-title">Headline</Label>
              <Input
                id="banner-title"
                placeholder="e.g. Spring Upgrade Special"
                value={bannerForm.title}
                onChange={(e) => setBannerForm({ ...bannerForm, title: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="banner-message">Message Copy</Label>
              <Input
                id="banner-message"
                placeholder="e.g. Unlock unlimited places and voice reminders for 20% off."
                value={bannerForm.message}
                onChange={(e) => setBannerForm({ ...bannerForm, message: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="banner-cta-text">Button Text</Label>
                <Input
                  id="banner-cta-text"
                  placeholder="e.g. Upgrade Now"
                  value={bannerForm.cta_text}
                  onChange={(e) => setBannerForm({ ...bannerForm, cta_text: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="banner-cta-url">Destination URL</Label>
                <Input
                  id="banner-cta-url"
                  placeholder="e.g. /billing"
                  value={bannerForm.cta_url}
                  onChange={(e) => setBannerForm({ ...bannerForm, cta_url: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="banner-tone">Banner Tone</Label>
                <Select
                  id="banner-tone"
                  value={bannerForm.tone}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      tone: e.target.value as 'primary' | 'success' | 'warning' | 'info',
                    })
                  }
                >
                  <option value="primary">Primary (Sage)</option>
                  <option value="success">Success (Forest)</option>
                  <option value="warning">Warning (Amber)</option>
                  <option value="info">Info (Slate)</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="banner-audience">Target Audience</Label>
                <Select
                  id="banner-audience"
                  value={bannerForm.target_audience}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      target_audience: e.target.value as 'all' | 'trial_only' | 'free_only' | 'paying_only',
                    })
                  }
                >
                  <option value="all">All Households</option>
                  <option value="trial_only">Trial Households Only</option>
                  <option value="free_only">Free Tier Only</option>
                  <option value="paying_only">Paying Members Only</option>
                </Select>
              </div>
            </div>
          </div>
        </Modal>

        {/* MODAL: CREATE / EDIT BLOG ARTICLE */}
        <Modal
          open={blogModalOpen}
          onClose={() => setBlogModalOpen(false)}
          title={editingBlogId ? 'Edit Website Blog Article' : 'Publish New Website Blog Article'}
          description="Write and publish educational guides on improving household functionality directly to /blog."
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBlogModalOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!blogForm.title.trim() || !blogForm.summary.trim() || saveBlogMutation.isPending}
                onClick={() => saveBlogMutation.mutate()}
              >
                {saveBlogMutation.isPending
                  ? 'Saving…'
                  : editingBlogId
                    ? 'Save & Update Website'
                    : 'Publish to Website'}
              </Button>
            </div>
          }
        >
          <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
            <div>
              <Label htmlFor="blog-title">Article Headline</Label>
              <Input
                id="blog-title"
                placeholder="e.g. How to Improve Household Functionality in 10 Minutes a Week"
                value={blogForm.title}
                onChange={(e) => setBlogForm({ ...blogForm, title: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="blog-category">Category</Label>
                <Select
                  id="blog-category"
                  value={blogForm.category}
                  onChange={(e) => setBlogForm({ ...blogForm, category: e.target.value })}
                >
                  <option value="Household Functionality">Household Functionality</option>
                  <option value="Accountability & Roles">Accountability &amp; Roles</option>
                  <option value="Smart Geofencing">Smart Geofencing</option>
                  <option value="Pantry & Staples">Pantry &amp; Staples</option>
                  <option value="Household Finance">Household Finance</option>
                  <option value="Automation & Routines">Automation &amp; Routines</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="blog-readtime">Read Time (Minutes)</Label>
                <Input
                  id="blog-readtime"
                  type="number"
                  min={1}
                  max={60}
                  value={blogForm.read_time_minutes}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, read_time_minutes: Number(e.target.value) || 5 })
                  }
                />
              </div>

              <div>
                <Label htmlFor="blog-icon">Material Icon</Label>
                <Select
                  id="blog-icon"
                  value={blogForm.icon}
                  onChange={(e) => setBlogForm({ ...blogForm, icon: e.target.value })}
                >
                  <option value="cottage">cottage (Home)</option>
                  <option value="view_kanban">view_kanban (Errands)</option>
                  <option value="pin_drop">pin_drop (Geofencing)</option>
                  <option value="kitchen">kitchen (Pantry)</option>
                  <option value="account_balance_wallet">account_balance_wallet (Finance)</option>
                  <option value="event_repeat">event_repeat (Recurring)</option>
                  <option value="menu_book">menu_book (Guide)</option>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="blog-author">Author Name</Label>
                <Input
                  id="blog-author"
                  value={blogForm.author_name}
                  onChange={(e) => setBlogForm({ ...blogForm, author_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="blog-role">Author Role / Credential</Label>
                <Input
                  id="blog-role"
                  value={blogForm.author_role}
                  onChange={(e) => setBlogForm({ ...blogForm, author_role: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="blog-summary">Executive Summary (Shown on Cards &amp; Hero)</Label>
              <textarea
                id="blog-summary"
                rows={2}
                value={blogForm.summary}
                onChange={(e) => setBlogForm({ ...blogForm, summary: e.target.value })}
                className="w-full rounded-xl bg-canvas p-3 text-xs text-on-surface shadow-[var(--shadow-inset-sm)] focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div>
              <Label htmlFor="blog-takeaways">Key Takeaways (One per line)</Label>
              <textarea
                id="blog-takeaways"
                rows={3}
                value={blogForm.key_takeaways_text}
                onChange={(e) => setBlogForm({ ...blogForm, key_takeaways_text: e.target.value })}
                className="w-full rounded-xl bg-canvas p-3 text-xs text-on-surface shadow-[var(--shadow-inset-sm)] focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Label>Article Sections</Label>
                <Button
                  variant="soft"
                  size="sm"
                  onClick={() =>
                    setBlogForm({
                      ...blogForm,
                      sections: [
                        ...blogForm.sections,
                        { heading: `${blogForm.sections.length + 1}. Next Step`, body: '' },
                      ],
                    })
                  }
                >
                  + Add Section
                </Button>
              </div>
              {blogForm.sections.map((sec, idx) => (
                <div key={idx} className="rounded-2xl bg-canvas p-3.5 shadow-[var(--shadow-inset-sm)] flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={sec.heading}
                      placeholder="Section Heading"
                      onChange={(e) => {
                        const updated = [...blogForm.sections];
                        updated[idx] = { ...updated[idx], heading: e.target.value };
                        setBlogForm({ ...blogForm, sections: updated });
                      }}
                    />
                    {blogForm.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setBlogForm({
                            ...blogForm,
                            sections: blogForm.sections.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-xs font-bold text-error hover:underline px-2"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={sec.body}
                    placeholder="Section paragraph copy…"
                    onChange={(e) => {
                      const updated = [...blogForm.sections];
                      updated[idx] = { ...updated[idx], body: e.target.value };
                      setBlogForm({ ...blogForm, sections: updated });
                    }}
                    className="w-full rounded-xl bg-surface p-2.5 text-xs text-on-surface shadow-[var(--shadow-clay-sm)] focus:outline-none focus:ring-2 focus:ring-secondary/40"
                  />
                </div>
              ))}
            </div>

            <div>
              <Label htmlFor="blog-checklist">Interactive Action Checklist (One item per line)</Label>
              <textarea
                id="blog-checklist"
                rows={3}
                value={blogForm.action_checklist_text}
                onChange={(e) => setBlogForm({ ...blogForm, action_checklist_text: e.target.value })}
                className="w-full rounded-xl bg-canvas p-3 text-xs text-on-surface shadow-[var(--shadow-inset-sm)] focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={blogForm.is_published}
                  onChange={(e) => setBlogForm({ ...blogForm, is_published: e.target.checked })}
                  className="h-4 w-4 accent-secondary"
                />
                <span>Publish Immediately on Website</span>
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-on-surface">
                <input
                  type="checkbox"
                  checked={blogForm.is_featured}
                  onChange={(e) => setBlogForm({ ...blogForm, is_featured: e.target.checked })}
                  className="h-4 w-4 accent-secondary"
                />
                <span>Set as Featured Pillar Guide on /blog</span>
              </label>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
