import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { installGetRoutes, jsonResponse } from '../support/api';
import {
  board,
  household,
  quotaReport,
  serviceRequest,
  sessionRoutes,
  tenantAdmin,
  landlord,
} from '../support/fixtures';
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

describe('progressive disclosure and elevated SaaS capabilities', () => {
  beforeEach(() => {
    resetStores();
    signIn(tenantAdmin, 'dashboard-token');
  });

  it('switches tabs in Settings and exports household vault data', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant': { data: household },
      '/v1/tenant/export': {
        data: {
          tenant: household,
          members: [tenantAdmin],
          summary: { total_requests: 5, total_places: 2 },
          exported_at: '2026-11-06T08:00:00Z',
        },
      },
    });

    renderApp('/settings');

    // 1. Initially Profile tab is active
    expect(await screen.findByRole('heading', { name: 'Household settings' })).toBeInTheDocument();
    expect(screen.getByText('Email Address')).toBeInTheDocument();

    // 2. Switch to Alerts & Reachability tab
    const alertsTab = screen.getByRole('button', { name: /Alerts & Reachability/i });
    await userEvent.click(alertsTab);
    expect(await screen.findByText('How the household reaches you')).toBeInTheDocument();
    expect(screen.getByText('Voice escalation calls')).toBeInTheDocument();

    // 3. Switch to Household Workspace & Data Vault tab
    const workspaceTab = screen.getByRole('button', { name: /Household Workspace & Data Vault/i });
    await userEvent.click(workspaceTab);
    expect(await screen.findByText('Household Workspace Overview')).toBeInTheDocument();
    expect(screen.getByText('Household Data Portability (Vault Export)')).toBeInTheDocument();

    // 4. Trigger vault export
    const exportBtn = screen.getByRole('button', { name: /Export Vault \(\.json\)/i });
    await userEvent.click(exportBtn);

    await waitFor(() => {
      expect(apiMock.get).toHaveBeenCalledWith('/v1/tenant/export');
      expect(screen.getByText(/Household vault exported successfully!/i)).toBeInTheDocument();
    });
  });

  it('switches tabs in Billing between Plan Quotas and Invoices', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport(),
      '/v1/billing/invoices': {
        data: [
          {
            id: 101,
            tenant_id: 1,
            invoice_number: 'INV-2026-001',
            amount_cents: 1499,
            currency: 'USD',
            status: 'paid',
            tier: 'pilot',
            billing_period: 'monthly',
            paid_at: '2026-10-01T00:05:00Z',
            payment_method: 'card',
            last4: '4242',
            created_at: '2026-10-01T00:00:00Z',
          },
        ],
        total: 1,
        current_page: 1,
      },
    });

    renderApp('/billing');

    expect(await screen.findByRole('heading', { name: 'Billing & Subscription Portal' })).toBeInTheDocument();

    // Switch to Invoices & Receipts tab
    const invoicesTab = screen.getByRole('button', { name: /Invoices & Receipts/i });
    await userEvent.click(invoicesTab);

    expect(await screen.findByText('Payment History & Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-001')).toBeInTheDocument();
    expect(screen.getByText('$14.99')).toBeInTheDocument();
  });

  it('allows tenant to select cash payment method during plan upgrade and renders cash invoices', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/tenant/quotas': quotaReport(),
      '/v1/billing/payment-methods': {
        data: {
          active_gateway: 'stripe',
          currency: 'USD',
          cash: {
            enabled: true,
            instructions: 'Please pay cash at reception or during physical onboarding.',
            auto_mark_paid: true,
          },
        },
      },
      '/v1/billing/invoices': {
        data: [
          {
            id: 101,
            tenant_id: 1,
            invoice_number: 'INV-2026-CASH-PENDING',
            amount_cents: 1900,
            currency: 'USD',
            status: 'pending',
            tier: 'family',
            billing_period: 'monthly',
            paid_at: null,
            payment_method: 'cash',
            last4: 'CASH',
            created_at: '2026-11-06T00:00:00Z',
          },
          {
            id: 102,
            tenant_id: 1,
            invoice_number: 'INV-2026-CASH-ACCEPTED',
            amount_cents: 1900,
            currency: 'USD',
            status: 'paid',
            tier: 'family',
            billing_period: 'monthly',
            paid_at: '2026-11-06T00:00:00Z',
            payment_method: 'cash',
            last4: 'CASH',
            created_at: '2026-11-06T00:00:00Z',
          },
        ],
        total: 2,
        current_page: 1,
      },
    });

    apiMock.post.mockImplementation(async (url) => {
      if (url === '/v1/billing/change-plan-preview') {
        return jsonResponse({
          eligible: true,
          days_elapsed: 0,
          current_tier: 'starter',
          target_tier: 'family',
          target_period: 'monthly',
          base_amount_cents: 1900,
          discount_cents: 0,
          final_amount_cents: 1900,
          reason: 'First-time plan selection',
        });
      }
      if (url === '/v1/billing/upgrade') {
        return jsonResponse({
          message: 'Subscription upgraded and invoice generated successfully.',
          invoice: {
            id: 102,
            invoice_number: 'INV-2026-CASH',
            tier: 'family',
            payment_method: 'cash',
          },
        });
      }
      return jsonResponse({});
    });

    renderApp('/billing');

    expect(await screen.findByRole('heading', { name: 'Billing & Subscription Portal' })).toBeInTheDocument();

    // 1. Open upgrade modal
    const upgradeBtn = screen.getByRole('button', { name: /Upgrade \/ Change Tier/i });
    await userEvent.click(upgradeBtn);

    expect(await screen.findByText(/Upgrade Household Plan/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Cash Payment/i })).toBeInTheDocument();

    // 2. Select Cash Payment
    await userEvent.click(screen.getByRole('button', { name: /Cash Payment/i }));
    expect(await screen.findByText('Cash Payment & In-Person Settlement Instructions')).toBeInTheDocument();
    expect(screen.getByText('Please pay cash at reception or during physical onboarding.')).toBeInTheDocument();

    // 3. Confirm upgrade
    const confirmBtn = screen.getByRole('button', { name: /Confirm Cash Upgrade/i });
    await userEvent.click(confirmBtn);

    expect(apiMock.post).toHaveBeenCalledWith('/v1/billing/upgrade', {
      tier: 'family',
      billing_period: 'monthly',
      payment_method: 'cash',
    });

    // 4. Invoices tab shows Cash badge: pending cash shows in-person notice, accepted cash enables PDF receipt download
    const invoicesTab = screen.getByRole('button', { name: /Invoices & Receipts/i });
    await userEvent.click(invoicesTab);

    expect(await screen.findByText('INV-2026-CASH-PENDING')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-CASH-ACCEPTED')).toBeInTheDocument();
    expect(screen.getAllByText('Cash / In-Person')).toHaveLength(2);
    expect(screen.getByText('In-Person Invoice')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /PDF Receipt/i })).toBeInTheDocument();
  });

  it('filters Focus Mode tabs and sends gratitude on completed errands', async () => {
    const completedItem = serviceRequest({
      id: 99,
      title: 'Baby Formula Restock',
      status: 'completed',
      completed_at: '2026-11-06T07:30:00Z',
      assignee: { id: 2, name: 'Sarah Rahman' },
    });

    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/requests/board': board({
        completed_today: [completedItem],
      }),
    });

    apiMock.post.mockImplementation((url) => {
      if (url === '/v1/requests/99/thank') {
        return jsonResponse({
          message: 'Gratitude delivered! Sarah Rahman has been thanked 🙌',
        });
      }
      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/requests');

    expect(await screen.findByRole('heading', { name: 'Household Kanban & Errand Hub' })).toBeInTheDocument();

    // Click "Completed Archive" focus tab
    const completedTab = screen.getByRole('button', { name: /Completed Archive/i });
    await userEvent.click(completedTab);

    // Verify completed item and "Say Thanks" action button
    expect(await screen.findByText('Baby Formula Restock')).toBeInTheDocument();
    const thankBtn = screen.getByRole('button', { name: /Say Thanks 🙌/i });
    await userEvent.click(thankBtn);

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/v1/requests/99/thank');
      expect(screen.getByText(/Gratitude delivered! Sarah Rahman has been thanked 🙌/i)).toBeInTheDocument();
    });
  });

  it('supports 4-tab progressive navigation in Platform Admin Tenant Detail', async () => {
    signIn(landlord, 'landlord-token');

    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/auth/me': { data: landlord },
      '/v1/platform/tenants/1': {
        tenant: household,
        counts: {
          members_count: 3,
          places_count: 5,
          requests_count: 12,
          requests_completed: 8,
          requests_pending: 4,
          essentials_count: 15,
          ledgers_count: 2,
          total_expenses_cents: 84000,
        },
        members: [
          {
            id: 1,
            user_id: 1,
            name: 'Tanvir Rahman',
            email: 'tanvir@familyessentials.app',
            role: 'tenant_admin',
            status: 'active',
            joined_at: '2026-01-05T09:00:00.000Z',
          },
        ],
        quotas: quotaReport(),
      },
    });

    renderApp('/admin/tenants/1');

    // 1. Overview Tab
    expect(await screen.findByText('Household: The Tanvir Household')).toBeInTheDocument();
    expect(screen.getByText('Primary Household Contact')).toBeInTheDocument();

    // 2. Members & Seats Tab
    const membersTab = screen.getByRole('button', { name: /Members & Seats/i });
    await userEvent.click(membersTab);
    expect(await screen.findByText('Household Members (1)')).toBeInTheDocument();
    expect(screen.getByText('tanvir@familyessentials.app')).toBeInTheDocument();

    // 3. Quotas & Telemetry Tab
    const quotasTab = screen.getByRole('button', { name: /Quotas & Telemetry/i });
    await userEvent.click(quotasTab);
    expect(await screen.findByText('Resource Allocations & Live Telemetry')).toBeInTheDocument();
    expect(screen.getByText('Subscription Quota & Capacity Limits')).toBeInTheDocument();

    // 4. Subscription & Tier Controls Tab
    const billingTab = screen.getByRole('button', { name: /Subscription & Tier Controls/i });
    await userEvent.click(billingTab);
    expect(await screen.findByText('Subscription Tier & Access Controls')).toBeInTheDocument();
    expect(screen.getByText('Extend Trial Access')).toBeInTheDocument();
  });

  it('renders dashboard as a gateway and software summary with low-stock replenishment', async () => {
    installGetRoutes(apiMock, {
      ...sessionRoutes(),
      '/v1/essentials': {
        data: [
          {
            id: 42,
            name: 'Organic Whole Milk',
            category: 'dairy',
            default_store: 'Whole Foods',
            pack_size: '1 Gallon',
            cadence_days: 7,
            threshold: 2,
            stock_level: 1,
            last_restocked_at: '2026-10-30T10:00:00Z',
            is_active: true,
            is_due: true,
            due_reason: 'safety_stock',
          },
        ],
        summary: { total: 8, due: 1, safety_stock: 1, cadence: 0 },
      },
    });

    apiMock.post.mockImplementation((url) => {
      if (url === '/v1/essentials/42/create-errand') {
        return jsonResponse({
          message: 'Restock errand for Organic Whole Milk added to household board!',
        });
      }
      return Promise.reject(new Error(`Unstubbed POST ${url}`));
    });

    renderApp('/dashboard');

    // 1. Executive Summary & Pulse Metrics
    expect(await screen.findByRole('heading', { name: "Today's Household Overview" })).toBeInTheDocument();
    expect(await screen.findByText('Active Errands & Tasks')).toBeInTheDocument();
    expect(screen.getByText('Saved Stores & Geofences')).toBeInTheDocument();
    expect(screen.getByText('Shared Ledgers & Budget')).toBeInTheDocument();

    // 2. Actionable Operational Widgets (Each shown once)
    expect(screen.getByText('Standing Chores')).toBeInTheDocument();
    expect(screen.getByText('Family Seats')).toBeInTheDocument();

    // 3. Pantry Restock 1-Tap Widget Action
    expect(screen.getAllByText('Organic Whole Milk').length).toBeGreaterThanOrEqual(1);
    const restockBtn = screen.getByRole('button', { name: /\+ Errand/i });
    await userEvent.click(restockBtn);

    await waitFor(() => {
      expect(apiMock.post).toHaveBeenCalledWith('/v1/essentials/42/create-errand');
      expect(
        screen.getByText(/Restock errand for Organic Whole Milk added to household board!/i),
      ).toBeInTheDocument();
    });
  });
});
