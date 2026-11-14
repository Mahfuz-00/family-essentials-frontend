import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
      '/v1/platform/notifications': {
        total_pending: 1,
        pending_cash_count: 1,
        pending_refund_count: 0,
        cash_settlements: [
          {
            id: 88,
            tenant_id: 1,
            invoice_number: 'INV-2026-PENDING-CASH',
            amount_cents: 1900,
            currency: 'USD',
            status: 'pending',
            tier: 'family',
            billing_period: 'monthly',
            paid_at: null,
            payment_method: 'cash',
            last4: 'CASH',
            created_at: '2026-11-06T10:00:00Z',
            tenant: { id: 1, name: 'The Tanvir Household', slug: 'the-tanvir-household' },
          },
        ],
        refund_requests: [],
      },
      '/v1/platform/billing/pending-cash': {
        data: [
          {
            id: 88,
            tenant_id: 1,
            invoice_number: 'INV-2026-PENDING-CASH',
            amount_cents: 1900,
            currency: 'USD',
            status: 'pending',
            tier: 'family',
            billing_period: 'monthly',
            paid_at: null,
            payment_method: 'cash',
            last4: 'CASH',
            created_at: '2026-11-06T10:00:00Z',
            tenant: { id: 1, name: 'The Tanvir Household', slug: 'the-tanvir-household' },
          },
        ],
        count: 1,
      },
      '/v1/platform/billing/invoices': {
        invoices: {
          data: [
            {
              id: 88,
              tenant_id: 1,
              invoice_number: 'INV-2026-PENDING-CASH',
              amount_cents: 1900,
              currency: 'USD',
              status: 'pending',
              tier: 'family',
              billing_period: 'monthly',
              paid_at: null,
              payment_method: 'cash',
              last4: 'CASH',
              created_at: '2026-11-06T10:00:00Z',
              tenant: { id: 1, name: 'The Tanvir Household', slug: 'the-tanvir-household' },
            },
          ],
          total: 1,
          current_page: 1,
          last_page: 1,
        },
        stats: {
          total_count: 1,
          paid_count: 0,
          pending_cash_count: 1,
          pending_cash_cents: 1900,
          total_revenue_cents: 0,
        },
      },
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
              configured: { sandbox: true, live: false },
            },
            razorpay: {
              enabled: false,
              key_id: 'rzp_sample',
              key_secret: 'secret',
              configured: { sandbox: false, live: false },
            },
            sslcommerz: {
              enabled: false,
              store_id: 'store_sample',
              store_passwd: 'pwd',
              configured: { sandbox: false, live: false },
            },
            paypal: {
              enabled: false,
              client_id: 'sb_client',
              client_secret: 'secret',
              configured: { sandbox: false, live: false },
            },
            paddle: {
              enabled: false,
              api_key: 'pdl_sdbx_apikey_x',
              webhook_secret: 'whsec_x',
              price_id: 'pri_x',
              // Clients receive the Paddle token masked, the link in the clear.
              client_token: 'test_pdl_client_token',
              default_payment_link: 'https://example.com/checkout',
              configured: { sandbox: true, live: false },
            },
            cash: {
              enabled: true,
              instructions: 'Cash payment upon in-person settlement or physical collection.',
              auto_mark_paid: true,
            },
          },
          webhook_url: 'https://api.fairshare.app/api/v1/webhooks/payment',
          auto_billing_enabled: true,
        },
      },
      // The bare result page the provider returns to after a sandbox payment.
      '/v1/sandbox-payment-result/': {
        data: {
          gateway: 'stripe',
          mode: 'sandbox',
          reference: 'cs_test_sandbox',
          status: 'paid',
          message: 'Sandbox payment confirmed by Stripe.',
          invoice: {
            invoice_number: 'TEST-STRIPE-ABCD1234',
            amount_cents: 100,
            currency: 'USD',
            tier: 'family',
            billing_period: 'monthly',
            payment_method: 'stripe',
            status: 'paid',
            issued_at: '2026-11-14T10:00:00Z',
            paid_at: '2026-11-14T10:01:00Z',
            reference: 'cs_test_sandbox',
            sandbox: true,
          },
        },
      },
      // Sandbox-payment status polling (the create call is a POST stub per test).
      '/v1/platform/settings/payment/paddle/sandbox-payment/': {
        data: {
          gateway: 'paddle',
          mode: 'sandbox',
          reference: 'txn_sandbox_paddle',
          status: 'pending',
          message: 'Paddle sandbox transaction is awaiting completion.',
          invoice: null,
        },
      },
      '/v1/platform/settings/payment/stripe/sandbox-payment/': {
        data: {
          gateway: 'stripe',
          mode: 'sandbox',
          reference: 'cs_test_sandbox',
          status: 'paid',
          message: 'Sandbox payment confirmed by Stripe.',
          invoice: {
            invoice_number: 'TEST-STRIPE-ABCD1234',
            amount_cents: 100,
            currency: 'USD',
            tier: 'family',
            billing_period: 'monthly',
            payment_method: 'stripe',
            status: 'paid',
            issued_at: '2026-11-14T10:00:00Z',
            paid_at: '2026-11-14T10:01:00Z',
            reference: 'cs_test_sandbox',
            sandbox: true,
          },
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

    expect(await screen.findByRole('heading', { name: 'Gateways' })).toBeInTheDocument();
    expect(await screen.findByDisplayValue('pk_test_sample')).toBeInTheDocument();

    const pingBtn = screen.getByRole('button', { name: /Ping Stripe API/i });
    expect(pingBtn).toHaveAttribute('aria-haspopup', 'dialog');
    await userEvent.click(pingBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/test', expect.anything());

    // The ping result lives in the right-side drawer, not on the card.
    const drawer = await screen.findByRole('dialog', { name: /Gateway ping — Stripe/i });
    expect(drawer).toHaveAttribute('aria-modal', 'true');
    expect(
      await within(drawer).findByText('Successfully connected to stripe API endpoint in 240ms.'),
    ).toBeInTheDocument();
    expect(within(drawer).getByText('240 ms')).toBeInTheDocument();
    expect(drawer.querySelector('[data-stage="connect"]')).toHaveAttribute('data-state', 'done');
    expect(drawer.querySelector('[data-stage="response"]')).toHaveAttribute('data-state', 'done');

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /Gateway ping/i })).not.toBeInTheDocument(),
    );
  });

  it('labels the Paddle price fields as Product ID and Price ID without the payment-link setup note', async () => {
    renderApp('/admin/payment-gateways');

    const paddleHeading = await screen.findByRole('heading', { name: 'Paddle (Merchant of Record)' });
    const paddleCard = paddleHeading.closest('.clay-card') as HTMLElement | null;
    expect(paddleCard).not.toBeNull();

    const productId = within(paddleCard!).getByLabelText('Product ID');
    const priceId = within(paddleCard!).getByLabelText('Price ID');

    // Both Paddle identifiers stay masked, and they use the Paddle prefixes.
    expect(productId).toHaveAttribute('type', 'password');
    expect(priceId).toHaveAttribute('type', 'password');
    expect(productId).toHaveAttribute('placeholder', 'pro_…');
    expect(priceId).toHaveAttribute('placeholder', 'pri_…');

    // The client-side token drives the Paddle.js overlay, so it is a secret.
    const clientToken = within(paddleCard!).getByLabelText('Client-side Token');
    expect(clientToken).toHaveAttribute('type', 'password');
    expect(clientToken).toHaveAttribute('placeholder', 'test_…');
    expect(
      within(paddleCard!).getByRole('button', { name: /Show Client-side Token for Paddle sandbox/i }),
    ).toBeInTheDocument();

    // The default payment link is read back in the clear: no reveal toggle.
    const paymentLink = within(paddleCard!).getByLabelText('Default Payment Link');
    expect(paymentLink).toHaveAttribute('type', 'text');
    expect(paymentLink).toHaveAttribute('placeholder', 'https://example.com/checkout');
    expect(
      within(paddleCard!).queryByRole('button', { name: /Default Payment Link for Paddle sandbox/i }),
    ).not.toBeInTheDocument();

    // The old labels and the PATCH checkout-url setup note are gone.
    expect(within(paddleCard!).queryByLabelText(/Price ID \/ Product ID/i)).not.toBeInTheDocument();
    expect(within(paddleCard!).queryByLabelText(/Test Price ID/i)).not.toBeInTheDocument();
    expect(within(paddleCard!).queryByText(/checkout-settings/i)).not.toBeInTheDocument();
    expect(within(paddleCard!).queryByText(/checkout-url/i)).not.toBeInTheDocument();
  });

  it('shows a corner check only for the configured mode of a digital gateway card', async () => {
    renderApp('/admin/payment-gateways');

    const stripeHeading = await screen.findByRole('heading', { name: 'Stripe Payments' });
    const stripeCard = stripeHeading.closest('.clay-card') as HTMLElement | null;
    expect(stripeCard).not.toBeNull();

    // The fixture reports sandbox configured and live not configured.
    expect(within(stripeCard!).getByLabelText('Stripe sandbox credentials configured')).toBeInTheDocument();
    // Only the two configured digital cards carry one: cash and the mock
    // simulator own no credential sets, so they never show the check.
    expect(screen.getAllByLabelText(/credentials configured/i)).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: /Edit Stripe live credentials/i }));

    expect(within(stripeCard!).queryByLabelText(/credentials configured/i)).not.toBeInTheDocument();
  });

  it('opens the sandbox payment drawer and starts a Stripe sandbox payment', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            gateway: 'stripe',
            mode: 'sandbox',
            reference: 'cs_test_sandbox',
            url: 'https://checkout.stripe.com/c/pay/cs_test_sandbox',
            amount_cents: 100,
            currency: 'USD',
            simulated: false,
            result_url: 'http://localhost:5175/sandbox/payment-result/tok-1?gateway=stripe',
            invoice: {
              invoice_number: 'TEST-STRIPE-ABCD1234',
              amount_cents: 100,
              currency: 'USD',
              tier: 'family',
              billing_period: 'monthly',
              payment_method: 'stripe',
              status: 'pending',
              issued_at: '2026-11-14T10:00:00Z',
              paid_at: null,
              reference: 'cs_test_sandbox',
              sandbox: true,
            },
          },
        },
        201,
      ),
    );

    renderApp('/admin/payment-gateways');

    expect(await screen.findByDisplayValue('pk_test_sample')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Sandbox payment for Stripe/i }));

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/stripe/sandbox-payment');

    const dialog = await screen.findByRole('dialog', { name: /Sandbox payment/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // The session reference and the hosted checkout control come from the POST response.
    expect(await screen.findByText('cs_test_sandbox')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Open checkout page/i })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('opens the sandbox payment drawer from the Paddle gateway card', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            gateway: 'paddle',
            mode: 'sandbox',
            reference: 'txn_sandbox_paddle',
            url: 'https://sandbox-checkout.paddle.com/txn_sandbox_paddle',
            amount_cents: 100,
            currency: 'USD',
            simulated: false,
            result_url: 'http://localhost:5175/sandbox/payment-result/tok-paddle?gateway=paddle',
            invoice: {
              invoice_number: 'TEST-PADDLE-ABCD1234',
              amount_cents: 100,
              currency: 'USD',
              tier: 'family',
              billing_period: 'monthly',
              payment_method: 'paddle',
              status: 'pending',
              issued_at: '2026-11-14T10:00:00Z',
              paid_at: null,
              reference: 'txn_sandbox_paddle',
              sandbox: true,
            },
          },
        },
        201,
      ),
    );

    renderApp('/admin/payment-gateways');

    const paddleHeading = await screen.findByRole('heading', { name: 'Paddle (Merchant of Record)' });
    // The provider filter counts the cards the grid actually renders (12 now).
    expect(screen.getByRole('button', { name: 'All Providers (12)' })).toBeInTheDocument();
    const paddleCard = paddleHeading.closest('.clay-card') as HTMLElement | null;
    expect(paddleCard).not.toBeNull();

    // The legacy flat fixture lands in the sandbox credential set of this card.
    expect(within(paddleCard!).getByDisplayValue('pdl_sdbx_apikey_x')).toBeInTheDocument();
    expect(within(paddleCard!).getByDisplayValue('pri_x')).toBeInTheDocument();

    await userEvent.click(
      within(paddleCard!).getByRole('button', { name: /Sandbox payment for Paddle/i }),
    );

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/paddle/sandbox-payment');

    const dialog = await screen.findByRole('dialog', { name: /Sandbox payment/i });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(await screen.findByText('txn_sandbox_paddle')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  describe('Paddle sandbox checkout overlay', () => {
    const checkoutOpen = vi.fn();
    const initialize = vi.fn();
    const setEnvironment = vi.fn();

    const paddleSession = (overrides: Record<string, unknown> = {}) => ({
      gateway: 'paddle',
      mode: 'sandbox',
      reference: 'txn_sandbox_paddle',
      // Paddle's hosted link points at a default page this app does not serve.
      url: 'https://sandbox-checkout.paddle.com/txn_sandbox_paddle',
      amount_cents: 100,
      currency: 'USD',
      simulated: false,
      result_url: 'http://localhost:5175/sandbox/payment-result/tok-paddle?gateway=paddle',
      invoice: null,
      ...overrides,
    });

    /** Opens the Paddle card's sandbox drawer with the given session payload. */
    const openPaddleDrawer = async (session: Record<string, unknown>) => {
      apiMock.post.mockResolvedValueOnce(jsonResponse({ data: session }, 201));

      renderApp('/admin/payment-gateways');

      const paddleHeading = await screen.findByRole('heading', { name: 'Paddle (Merchant of Record)' });
      const paddleCard = paddleHeading.closest('.clay-card') as HTMLElement | null;
      expect(paddleCard).not.toBeNull();

      await userEvent.click(
        within(paddleCard!).getByRole('button', { name: /Sandbox payment for Paddle/i }),
      );

      return screen.findByRole('dialog', { name: /Sandbox payment/i });
    };

    beforeEach(() => {
      checkoutOpen.mockReset();
      initialize.mockReset();
      setEnvironment.mockReset();
    });

    afterEach(() => {
      delete window.Paddle;
    });

    it('opens the Paddle.js overlay instead of the default-link page', async () => {
      window.Paddle = {
        Environment: { set: setEnvironment },
        Initialize: initialize,
        Checkout: { open: checkoutOpen },
      };

      const dialog = await openPaddleDrawer(paddleSession({ client_token: 'test_pdl_client_token' }));

      // No hosted-link button: the overlay is the only entry point.
      expect(
        within(dialog).queryByRole('button', { name: /Open checkout page/i }),
      ).not.toBeInTheDocument();

      await userEvent.click(within(dialog).getByRole('button', { name: /Open Paddle checkout/i }));

      await waitFor(() =>
        expect(checkoutOpen).toHaveBeenCalledWith({
          transactionId: 'txn_sandbox_paddle',
          settings: {
            successUrl: 'http://localhost:5175/sandbox/payment-result/tok-paddle?gateway=paddle&flow=success',
          },
        }),
      );
      expect(setEnvironment).toHaveBeenCalledWith('sandbox');
      expect(initialize).toHaveBeenCalledWith({ token: 'test_pdl_client_token' });
    });

    it('warns instead of offering the overlay when no client token is stored', async () => {
      const dialog = await openPaddleDrawer(paddleSession({ client_token: null }));

      expect(
        await within(dialog).findByText(/client-side token before the overlay checkout can open/i),
      ).toBeInTheDocument();
      expect(
        within(dialog).queryByRole('button', { name: /Open Paddle checkout/i }),
      ).not.toBeInTheDocument();
      expect(
        within(dialog).queryByRole('button', { name: /Open checkout page/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('advances the sandbox payment drawer to confirmed when the poll reports paid', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse(
        {
          data: {
            gateway: 'stripe',
            mode: 'sandbox',
            reference: 'cs_test_sandbox',
            url: 'https://checkout.stripe.com/c/pay/cs_test_sandbox',
            amount_cents: 100,
            currency: 'USD',
            simulated: false,
            result_url: 'http://localhost:5175/sandbox/payment-result/tok-1?gateway=stripe',
            invoice: {
              invoice_number: 'TEST-STRIPE-ABCD1234',
              amount_cents: 100,
              currency: 'USD',
              tier: 'family',
              billing_period: 'monthly',
              payment_method: 'stripe',
              status: 'pending',
              issued_at: '2026-11-14T10:00:00Z',
              paid_at: null,
              reference: 'cs_test_sandbox',
              sandbox: true,
            },
          },
        },
        201,
      ),
    );

    renderApp('/admin/payment-gateways');

    expect(await screen.findByDisplayValue('pk_test_sample')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Sandbox payment for Stripe/i }));

    const dialog = await screen.findByRole('dialog', { name: /Sandbox payment/i });

    // The first status poll runs as soon as the checkout session exists.
    expect(await screen.findByText('Payment confirmed')).toBeInTheDocument();
    expect(dialog.querySelector('[data-stage="result"]')).toHaveAttribute('data-state', 'done');
    expect(dialog.querySelector('[data-stage="confirming"]')).toHaveAttribute('data-state', 'done');
    expect(apiMock.get).toHaveBeenCalledWith(
      '/v1/platform/settings/payment/stripe/sandbox-payment/cs_test_sandbox',
    );
    // A dedicated step generates the invoice once the provider confirms, then the
    // drawer points at the bare result page for it.
    const viewInvoice = await screen.findByRole('button', { name: /View invoice/i });
    expect(viewInvoice).toBeInTheDocument();
    expect(dialog.querySelector('[data-stage="invoice"]')).toHaveAttribute('data-state', 'done');
    expect(await screen.findByText('Invoice generated')).toBeInTheDocument();
  });

  it('shows the generated invoice on the bare sandbox result page and returns to gateways', async () => {
    renderApp('/sandbox/payment-result/tok-1?gateway=stripe&flow=success');

    expect(await screen.findByRole('heading', { name: /Payment confirmed/i })).toBeInTheDocument();
    expect(await screen.findByText('TEST-STRIPE-ABCD1234')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(apiMock.get).toHaveBeenCalledWith(
      '/v1/sandbox-payment-result/tok-1',
    );
    expect(screen.getByRole('button', { name: /Back to payment gateways/i })).toBeInTheDocument();
  });

  it('allows platform admin to configure cash payment option and test ping', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        status: 'connected',
        gateway: 'cash',
        latency_ms: 0,
        message: 'Cash payment and offline collection workflow is active and ready.',
      }),
    );

    renderApp('/admin/payment-gateways');

    expect(await screen.findByRole('heading', { name: 'Gateways' })).toBeInTheDocument();
    expect(await screen.findByText('Cash Payment & Offline Settlement')).toBeInTheDocument();
    expect(screen.getByText('Cash Option Enabled')).toBeInTheDocument();

    const cashInstructions = screen.getByLabelText(/Tenant Collection Instructions & Notes/i);
    expect(cashInstructions).toHaveValue('Cash payment upon in-person settlement or physical collection.');

    const pingCashBtn = screen.getByRole('button', { name: /Test Cash Payment Configuration/i });
    await userEvent.click(pingCashBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/test', { gateway: 'cash' });
    expect(await screen.findByText('Cash payment and offline collection workflow is active and ready.')).toBeInTheDocument();
  });

  it('saves one gateway through its own endpoint with the edited credential set', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({ message: 'Payment gateway saved.', data: { enabled: true, sandbox: true } }),
    );

    renderApp('/admin/payment-gateways');

    // The legacy flat fixture must still render inside the sandbox editor.
    const publishableKey = await screen.findByDisplayValue('pk_test_sample');

    await userEvent.clear(publishableKey);
    await userEvent.type(publishableKey, 'pk_test_updated');
    await userEvent.click(screen.getByRole('button', { name: /Save Stripe/i }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/stripe', {
        enabled: true,
        sandbox: true,
        credentials: {
          sandbox: expect.objectContaining({
            publishable_key: 'pk_test_updated',
            secret_key: 'sk_test_sample',
          }),
          live: {},
        },
      }),
    );

    expect(await screen.findByText('Stripe credentials saved.')).toBeInTheDocument();
  });

  it('saves an offline gateway through the same per-card endpoint', async () => {
    apiMock.post.mockResolvedValueOnce(jsonResponse({ message: 'Payment gateway saved.', data: { enabled: true } }));

    renderApp('/admin/payment-gateways');

    expect(await screen.findByText('Cash Payment & Offline Settlement')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Save Cash/i }));

    await waitFor(() =>
      expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/cash', {
        enabled: true,
        instructions: 'Cash payment upon in-person settlement or physical collection.',
        auto_mark_paid: true,
      }),
    );
  });

  it('pings the credential environment selected in the editor tabs', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        status: 'connected',
        gateway: 'stripe',
        mode: 'live',
        latency_ms: 88,
        message: 'Stripe API reachable with the configured live secret key.',
      }),
    );

    renderApp('/admin/payment-gateways');

    expect(await screen.findByDisplayValue('pk_test_sample')).toBeInTheDocument();

    const liveTab = screen.getByRole('button', { name: /Edit Stripe live credentials/i });
    expect(liveTab).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(liveTab);
    expect(liveTab).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: /Ping Stripe API/i }));

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/settings/payment/test', {
      gateway: 'stripe',
      mode: 'live',
    });
    expect(
      await screen.findByText('Stripe API reachable with the configured live secret key.'),
    ).toBeInTheDocument();
    // The persisted last_test badge follows the pinged environment, not colour alone.
    expect(screen.getByText(/Live test: Connected · 88 ms/)).toBeInTheDocument();
  });

  it('displays platform admin notification bell and allows approving pending cash payments at /admin/billing', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({
        message: 'Cash payment of $19.00 approved. Invoice INV-2026-PENDING-CASH is now Paid and the household plan has been upgraded.',
        invoice: {
          id: 88,
          invoice_number: 'INV-2026-PENDING-CASH',
          status: 'paid',
        },
      }),
    );

    renderApp('/admin/billing');

    expect(await screen.findByRole('heading', { name: 'Invoices' })).toBeInTheDocument();
    expect(await screen.findByText(/Pending In-Person Cash Settlements \(1\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('INV-2026-PENDING-CASH').length).toBeGreaterThanOrEqual(1);

    // Check notification bell on top bar
    const bellBtn = screen.getByRole('button', { name: /Platform Notifications/i });
    expect(bellBtn).toBeInTheDocument();
    await userEvent.click(bellBtn);

    expect(await screen.findByText('Admin Action Items')).toBeInTheDocument();
    expect(screen.getAllByText(/Awaiting in-person cash collection/i).length).toBeGreaterThanOrEqual(1);

    // Click Approve & Mark Paid button on the pending cash settlement card
    const approveBtn = screen.getByRole('button', { name: /Approve & Mark Paid/i });
    await userEvent.click(approveBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/platform/billing/invoices/88/approve-cash');
    expect(await screen.findByText(/Cash payment of \$19\.00 approved/i)).toBeInTheDocument();
  });

  it('renders email configuration and dispatches test email', async () => {
    apiMock.post.mockResolvedValueOnce(
      jsonResponse({ message: 'Test email successfully sent to platform@familyessentials.app.' }),
    );

    renderApp('/admin/email-config');

    expect(await screen.findByRole('heading', { name: /Email Setup/i })).toBeInTheDocument();
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

    expect(await screen.findByRole('heading', { name: 'Refunds' })).toBeInTheDocument();
    expect(await screen.findByText('Duplicate billing during trial upgrade')).toBeInTheDocument();
    expect(screen.getByText('The Tanvir Household')).toBeInTheDocument();

    // Switch to policy tab
    const policyTab = screen.getByRole('button', { name: /Policy Terms & Rules/i });
    await userEvent.click(policyTab);

    expect(await screen.findByDisplayValue('billing@fairshare.app')).toBeInTheDocument();
  });

  it('renders platform analytics with MRR and performance velocity', async () => {
    renderApp('/admin/analytics');

    expect(await screen.findByRole('heading', { name: 'Platform Analytics' })).toBeInTheDocument();
    expect(await screen.findByText('$4,850')).toBeInTheDocument();
    expect(screen.getByText('94.6%')).toBeInTheDocument();
    expect(screen.getByText('plus Plan')).toBeInTheDocument();
  });

  it('opens household inspection details from tenant list', async () => {
    renderApp('/admin/tenants');

    expect(await screen.findByRole('heading', { name: 'Tenants' })).toBeInTheDocument();
    expect(await screen.findByText('The Tanvir Household')).toBeInTheDocument();

    const detailsBtn = screen.getByRole('button', { name: /Details/i });
    await userEvent.click(detailsBtn);

    expect(await screen.findByText('Household: The Tanvir Household')).toBeInTheDocument();
    expect(await screen.findByText('tanvir@familyessentials.app')).toBeInTheDocument();
    expect(screen.getByText(/Back to Tenants/i)).toBeInTheDocument();
  });

  it('renders tenant details directly at /admin/tenants/$tenantId page', async () => {
    renderApp('/admin/tenants/1');

    expect(await screen.findByText('Household: The Tanvir Household')).toBeInTheDocument();
    expect(await screen.findByText('tanvir@familyessentials.app')).toBeInTheDocument();

    const quotasTab = screen.getByRole('button', { name: /Quotas & Telemetry/i });
    await userEvent.click(quotasTab);

    expect(screen.getByText('Resource Allocations & Live Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Subscription Quota & Capacity Limits')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Tenants/i })).toBeInTheDocument();
  });
});
