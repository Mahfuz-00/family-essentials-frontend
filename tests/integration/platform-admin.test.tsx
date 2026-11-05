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

describe('platform admin console enhancements', () => {
  beforeEach(() => {
    resetStores();
    signIn(landlord, 'landlord-token');

    installGetRoutes(apiMock, {
      '/v1/auth/me': { data: landlord },
      '/v1/auth/tenants': { data: [] },
      '/v1/platform/settings/payment': {
        data: {
          active_gateway: 'stripe',
          mode: 'sandbox',
          currency: 'USD',
          gateways: {
            stripe: {
              enabled: true,
              publishable_key: 'pk_test_sample',
              secret_key: 'sk_test_sample',
              webhook_secret: 'whsec_sample',
            },
            razorpay: { enabled: false, key_id: 'rzp_sample', key_secret: 'secret' },
            sslcommerz: { enabled: false, store_id: 'store_sample', store_passwd: 'pwd' },
            paypal: { enabled: false, client_id: 'sb_client', client_secret: 'secret' },
          },
          webhook_url: 'https://api.fairshare.app/api/v1/webhooks/payment',
          auto_billing_enabled: true,
        },
      },
      '/v1/platform/settings/email': {
        data: {
          mailer: 'smtp',
          host: 'smtp.mailgun.org',
          port: 587,
          encryption: 'tls',
          username: 'postmaster@mg.fairshare.app',
          password: '••••••••',
          from_address: 'notifications@fairshare.app',
          from_name: 'FairShare Household Sync',
          templates: [
            { id: 'welcome', name: 'Welcome & Household Onboarding', enabled: true },
            { id: 'chore_digest', name: 'Morning Chores & Errand Digest', enabled: true },
          ],
        },
      },
      '/v1/platform/refunds': {
        policy: {
          policy_markdown: '# FairShare Household Refund & Guarantee Policy\n\nHouseholds may cancel within 14 days.',
          refund_window_days: 14,
          auto_approve_under_cents: 2000,
          pro_rata_enabled: true,
          contact_email: 'billing@fairshare.app',
        },
        refunds: {
          data: [
            {
              id: 101,
              tenant_id: 1,
              tenant_name: 'The Tanvir Household',
              user_id: 1,
              user_email: 'tanvir@familyessentials.app',
              amount_cents: 2900,
              currency: 'USD',
              reason: 'Duplicate billing during trial upgrade',
              status: 'pending',
              admin_notes: null,
              processed_by: null,
              processed_at: null,
              created_at: '2026-11-04T12:00:00Z',
            },
          ],
          meta: {
            current_page: 1,
            last_page: 1,
            per_page: 25,
            total: 1,
          },
        },
        stats: {
          total_refunded_cents: 5800,
          pending_count: 1,
          approved_count: 2,
          rejected_count: 0,
          avg_turnaround_hours: 4.5,
        },
      },
      '/v1/platform/analytics': {
        overview: {
          mrr_dollars: 4850,
          arr_dollars: 58200,
          total_households: 265,
          active_households: 240,
          trial_households: 25,
          suspended_households: 0,
          total_users: 750,
          active_members: 680,
        },
        by_status: { active: 240, trial: 25 },
        by_tier: { free: 120, plus: 85, family: 60 },
        errand_metrics: {
          total_requests: 1200,
          completed_requests: 1135,
          in_progress_requests: 45,
          pending_requests: 20,
          completion_rate_percent: 94.6,
        },
        infrastructure: {
          saved_places: 310,
          geofence_triggers: 1450,
          voice_escalations: 12,
          registered_devices: 540,
          ledger_entries: 2300,
          total_expenses_cents: 14250000,
        },
        timeseries: [
          {
            period: '2026-05',
            signups: 20,
            requests_created: 150,
            requests_completed: 140,
            estimated_mrr: 3200,
          },
          {
            period: '2026-06',
            signups: 35,
            requests_created: 210,
            requests_completed: 195,
            estimated_mrr: 3600,
          },
        ],
      },
      '/v1/platform/tenants/1': {
        tenant: {
          id: 1,
          name: 'The Tanvir Household',
          slug: 'the-tanvir-household',
          status: 'active',
          subscription_tier: 'starter',
          member_count: 3,
          trial_ends_at: null,
          created_at: '2026-01-05T09:00:00.000Z',
        },
        data: {
          id: 1,
          name: 'The Tanvir Household',
          slug: 'the-tanvir-household',
          status: 'active',
          subscription_tier: 'starter',
          member_count: 3,
          created_at: '2026-01-05T09:00:00.000Z',
        },
        members: [
          {
            id: 1,
            name: 'Tanvir Rahman',
            email: 'tanvir@familyessentials.app',
            phone: '+15550000002',
            role: 'owner',
            status: 'active',
            joined_at: '2026-01-05T09:00:00.000Z',
          },
        ],
        counts: {
          members_count: 3,
          places_count: 5,
          requests_count: 24,
          requests_pending: 2,
          requests_completed: 22,
          ledgers_count: 3,
          essentials_count: 42,
          invitations_count: 1,
          total_expenses_cents: 150000,
        },
        quotas: {
          plan: {
            code: 'starter',
            name: 'Starter Plan',
            seat_cap: 5,
            place_cap: 10,
            request_cap: 100,
          },
          usage: {
            seats: 3,
            places: 5,
            requests_this_cycle: 24,
          },
        },
      },
      '/v1/platform/tenants': {
        data: [
          {
            id: 1,
            name: 'The Tanvir Household',
            slug: 'the-tanvir-household',
            status: 'active',
            subscription_tier: 'starter',
            member_count: 3,
            created_at: '2026-01-05T09:00:00.000Z',
          },
        ],
      },
    });
  });

  it('renders payment gateway configuration and triggers a ping test', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        status: 'connected',
        gateway: 'stripe',
        latency_ms: 240,
        message: 'Successfully connected to stripe API endpoint in 240ms.',
      }),
    );

    renderApp('/admin/payment-gateways');

    expect(await screen.findByRole('heading', { name: 'Payment Gateway Configuration' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('pk_test_sample')).toBeInTheDocument();

    const pingBtn = screen.getByRole('button', { name: /Ping Stripe API/i });
    await userEvent.click(pingBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/test', expect.anything());
    expect(await screen.findByText('Successfully connected to stripe API endpoint in 240ms.')).toBeInTheDocument();
  });

  it('renders email configuration and dispatches test email', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({ message: 'Test email successfully sent to platform@familyessentials.app.' }),
    );

    renderApp('/admin/email-config');

    expect(await screen.findByRole('heading', { name: /Email & Notification Delivery/i })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('smtp.mailgun.org')).toBeInTheDocument();

    const recipientInput = screen.getByLabelText(/Target Recipient/i);
    await userEvent.type(recipientInput, 'platform@familyessentials.app');

    const sendTestBtn = screen.getByRole('button', { name: /Dispatch Test Email/i });
    await userEvent.click(sendTestBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/email/test', {
      recipient: 'platform@familyessentials.app',
    });
    expect(await screen.findByText('Test email successfully sent to platform@familyessentials.app.')).toBeInTheDocument();
  });

  it('renders refund requests and policy tabs', async () => {
    renderApp('/admin/refunds');

    expect(await screen.findByRole('heading', { name: 'Refund Policy & Transactions' })).toBeInTheDocument();
    expect(await screen.findByText('Duplicate billing during trial upgrade')).toBeInTheDocument();
    expect(screen.getByText('The Tanvir Household')).toBeInTheDocument();

    // Switch to policy tab
    const policyTab = screen.getByRole('button', { name: /Policy Terms & Rules/i });
    await userEvent.click(policyTab);

    expect(await screen.findByDisplayValue('billing@fairshare.app')).toBeInTheDocument();
  });

  it('renders platform analytics with MRR and performance velocity', async () => {
    renderApp('/admin/analytics');

    expect(await screen.findByRole('heading', { name: 'Platform Analytics & Operations' })).toBeInTheDocument();
    expect(await screen.findByText('$4,850')).toBeInTheDocument();
    expect(screen.getByText('94.6%')).toBeInTheDocument();
    expect(screen.getByText('plus Plan')).toBeInTheDocument();
  });

  it('opens household inspection details from tenant list', async () => {
    renderApp('/admin/tenants');

    expect(await screen.findByRole('heading', { name: 'Tenant Workspaces & Client Families' })).toBeInTheDocument();
    expect(await screen.findByText('The Tanvir Household')).toBeInTheDocument();

    const detailsBtn = screen.getByRole('button', { name: /Details/i });
    await userEvent.click(detailsBtn);

    expect(await screen.findByText('Household: The Tanvir Household')).toBeInTheDocument();
    expect(await screen.findByText('tanvir@familyessentials.app')).toBeInTheDocument();
    expect(screen.getByText('Pantry Essentials')).toBeInTheDocument();
    expect(screen.getByText(/Back to Tenants/i)).toBeInTheDocument();
  });

  it('renders tenant details directly at /admin/tenants/$tenantId page', async () => {
    renderApp('/admin/tenants/1');

    expect(await screen.findByText('Household: The Tanvir Household')).toBeInTheDocument();
    expect(await screen.findByText('tanvir@familyessentials.app')).toBeInTheDocument();
    expect(screen.getByText('Resource Allocations & Live Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Subscription Quota & Capacity Limits')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Tenants/i })).toBeInTheDocument();
  });
});
