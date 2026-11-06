import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import { landlord } from '../support/fixtures';
import { renderApp } from '../support/render';
import { resetStores, signIn } from '../support/session';

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: apiMock,
  apiError: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

describe('platform admin marketing console', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');

    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/marketing/overview': {
        data: {
          total_leads: 142,
          new_leads: 28,
          converted_leads: 35,
          lead_conversion_rate: 24.6,
          active_promotions: 4,
          total_redemptions: 89,
          active_announcements: 2,
          total_impressions: 4800,
          total_clicks: 340,
          banner_ctr_percent: 7.1,
        },
      },
      '/v1/platform/marketing/promotions': {
        data: [
          {
            id: 1,
            code: 'WELCOME20',
            description: '20% off for first month',
            discount_type: 'percent',
            discount_value: 20,
            currency: 'USD',
            duration: 'once',
            duration_in_months: 1,
            max_redemptions: 500,
            times_redeemed: 38,
            applicable_tiers: ['plus', 'family'],
            starts_at: '2026-10-01T00:00:00Z',
            expires_at: '2027-01-01T00:00:00Z',
            is_active: true,
            created_at: '2026-10-01T00:00:00Z',
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 20,
          total: 1,
        },
      },
      '/v1/platform/marketing/announcements': {
        data: [
          {
            id: 1,
            title: 'Spring Family Savings: 20% Off',
            message: 'Supercharge your household coordination with unlimited members and voice escalation.',
            cta_text: 'Upgrade Household',
            cta_url: '/settings/billing',
            tone: 'primary',
            target_audience: 'all',
            is_active: true,
            dismissable: true,
            impressions_count: 1420,
            clicks_count: 84,
            starts_at: '2026-10-01T00:00:00Z',
            expires_at: '2027-01-01T00:00:00Z',
            created_at: '2026-10-01T00:00:00Z',
          },
        ],
      },
      '/v1/platform/marketing/leads': {
        data: [
          {
            id: 1,
            email: 'sarah.miller@example.com',
            name: 'Sarah Miller',
            source: 'website',
            campaign: 'spring_promo',
            status: 'new',
            notes: 'Requested info regarding 5-member setup',
            converted_tenant_id: null,
            created_at: '2026-11-01T12:00:00Z',
          },
        ],
        meta: {
          current_page: 1,
          last_page: 1,
          per_page: 25,
          total: 1,
        },
      },
      '/v1/platform/marketing/referrals': {
        data: {
          enabled: true,
          reward_type: 'credit_minor',
          reward_value: 1000,
          referrer_bonus_cents: 1000,
          referee_discount_percent: 20,
          min_subscription_tier: 'plus',
          terms_markdown: '# FairShare Family Referral Program\n\nInvite other households to FairShare.',
        },
      },
    });
  });

  it('renders marketing overview and displays acquisition KPIs', async () => {
    renderApp('/admin/marketing');

    expect(await screen.findByRole('heading', { name: /Marketing & Campaign Console/i })).toBeInTheDocument();
    expect(await screen.findByText('142')).toBeInTheDocument();
    expect(screen.getByText('7.1%')).toBeInTheDocument();
    expect(screen.getByText('Spring Family Savings: 20% Off')).toBeInTheDocument();
  });

  it('switches to promotions tab and creates a new promo voucher', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        message: 'Promotion code created successfully.',
        data: { id: 2, code: 'FAIR50', discount_type: 'percent', discount_value: 50 },
      }),
    );

    renderApp('/admin/marketing');

    const promoTab = await screen.findByRole('button', { name: /Promo Codes & Vouchers/i });
    await userEvent.click(promoTab);

    expect(await screen.findByText('WELCOME20')).toBeInTheDocument();
    expect(screen.getByText('20% OFF')).toBeInTheDocument();

    const createBtn = screen.getByRole('button', { name: /Create New Promo Code/i });
    await userEvent.click(createBtn);

    expect(await screen.findByText('Create New Promotional Code')).toBeInTheDocument();

    const codeInput = screen.getByLabelText(/Promo Code/i);
    await userEvent.type(codeInput, 'FAIR50');

    const submitBtn = screen.getByRole('button', { name: /Create Coupon/i });
    await userEvent.click(submitBtn);

    expect(apiMock.post).toHaveBeenCalledWith(
      '/v1/platform/marketing/promotions',
      expect.objectContaining({ code: 'FAIR50' }),
    );
  });

  it('switches to announcements tab and toggles campaign status', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        message: 'Announcement live.',
        data: { id: 1, is_active: false },
      }),
    );

    renderApp('/admin/marketing');

    const announceTab = await screen.findByRole('button', { name: /Announcements & Banners/i });
    await userEvent.click(announceTab);

    expect(await screen.findByRole('heading', { name: 'Announcement Banners' })).toBeInTheDocument();
    expect(screen.getByText('Spring Family Savings: 20% Off')).toBeInTheDocument();

    const hideBtn = screen.getByRole('button', { name: /Hide/i });
    await userEvent.click(hideBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/marketing/announcements/1/toggle');
  });

  it('switches to leads tab and updates status triage', async () => {
    apiMock.patch.mockResolvedValueOnce(
      jsonResponse({
        message: 'Lead updated successfully.',
        data: { id: 1, status: 'contacted' },
      }),
    );

    renderApp('/admin/marketing');

    const leadsTab = await screen.findByRole('button', { name: /Leads & Waitlist/i });
    await userEvent.click(leadsTab);

    expect(await screen.findByText('Sarah Miller')).toBeInTheDocument();
    expect(screen.getByText('sarah.miller@example.com')).toBeInTheDocument();

    const triageSelect = screen.getByRole('combobox', { name: /Triage status/i });
    await userEvent.selectOptions(triageSelect, 'contacted');

    expect(apiMock.patch).toHaveBeenCalledWith('/v1/platform/marketing/leads/1', {
      status: 'contacted',
    });
  });

  it('switches to referrals tab and saves updated terms', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        message: 'Referral program configuration updated.',
      }),
    );

    renderApp('/admin/marketing');

    const referralsTab = await screen.findByRole('button', { name: /Referral Program/i });
    await userEvent.click(referralsTab);

    expect(await screen.findByRole('heading', { name: 'Household Referral Incentives' })).toBeInTheDocument();
    expect(screen.getByDisplayValue(1000)).toBeInTheDocument();
    expect(screen.getByDisplayValue(20)).toBeInTheDocument();

    const termsTextarea = screen.getByLabelText(/Referral Terms/i);
    await userEvent.type(termsTextarea, ' Updated terms.');

    expect(apiMock.post).toHaveBeenCalledWith(
      '/v1/platform/marketing/referrals',
      expect.anything(),
    );
  });
});
