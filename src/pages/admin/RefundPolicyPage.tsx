import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Select } from '@/components/ui/select';
import { Table, TD, TH, THead, TR } from '@/components/ui/table';
import { api, apiError } from '@/lib/api';
import type { RefundPolicy, RefundRecord, RefundsPayload } from '@/types';

export function RefundPolicyPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'requests' | 'policy'>('requests');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals state
  const [approveModal, setApproveModal] = useState<RefundRecord | null>(null);
  const [rejectModal, setRejectModal] = useState<RefundRecord | null>(null);
  const [manualRefundOpen, setManualRefundOpen] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  // Manual refund form
  const [manualForm, setManualForm] = useState({
    tenant_name: '',
    user_email: '',
    amount_cents: 1900,
    currency: 'USD',
    reason: '',
    admin_notes: '',
  });

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filters = {
    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
  };

  const refundsQuery = useQuery({
    queryKey: ['platform', 'refunds', filters, page],
    queryFn: async () =>
      (
        await api.get<RefundsPayload>('/v1/platform/refunds', {
          params: { ...filters, page },
        })
      ).data,
  });

  // Policy Form state
  const [policyForm, setPolicyForm] = useState<RefundPolicy | null>(null);
  const currentPolicy = policyForm ?? refundsQuery.data?.policy;

  const updatePolicyMutation = useMutation({
    mutationFn: async (payload: RefundPolicy) =>
      (await api.post('/v1/platform/refunds/policy', payload)).data,
    onSuccess: () => {
      setNotice('Refund policy updated successfully.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'refunds'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) =>
      (await api.post(`/v1/platform/refunds/${id}/approve`, { admin_notes: notes })).data,
    onSuccess: () => {
      setNotice('Refund approved and scheduled for disbursement.');
      setApproveModal(null);
      setAdminNote('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'refunds'] });
    },
    onError: (err) => {
      setError(apiError(err));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number; notes: string }) =>
      (await api.post(`/v1/platform/refunds/${id}/reject`, { admin_notes: notes })).data,
    onSuccess: () => {
      setNotice('Refund request rejected.');
      setRejectModal(null);
      setAdminNote('');
      queryClient.invalidateQueries({ queryKey: ['platform', 'refunds'] });
    },
    onError: (err) => {
      setError(apiError(err));
    },
  });

  const createManualMutation = useMutation({
    mutationFn: async () => (await api.post('/v1/platform/refunds', manualForm)).data,
    onSuccess: () => {
      setNotice('Manual refund record logged.');
      setManualRefundOpen(false);
      setManualForm({
        tenant_name: '',
        user_email: '',
        amount_cents: 1900,
        currency: 'USD',
        reason: '',
        admin_notes: '',
      });
      queryClient.invalidateQueries({ queryKey: ['platform', 'refunds'] });
    },
    onError: (err) => {
      setError(apiError(err));
    },
  });

  const list = refundsQuery.data?.refunds?.data ?? [];
  const stats = refundsQuery.data?.stats;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={['Platform Admin', 'Finance & Billing']}
          title="Refund Policy &amp; Transactions"
          description="Enforce household refund terms, review disputed charges, issue partial credits, and maintain tenant satisfaction."
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-container">
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-label-lg font-bold transition-colors ${
              activeTab === 'requests'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="receipt_long" className="text-[18px]" />
            Refund Requests &amp; Log
            {stats && stats.pending_count > 0 && (
              <Badge tone="warning">{stats.pending_count} pending</Badge>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('policy')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-label-lg font-bold transition-colors ${
              activeTab === 'policy'
                ? 'border-secondary text-secondary'
                : 'border-transparent text-muted hover:text-on-surface'
            }`}
          >
            <Icon name="description" className="text-[18px]" />
            Policy Terms &amp; Rules
          </button>
        </div>

        {activeTab === 'requests' && (
          <div className="flex flex-col gap-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3.5 md:grid-cols-4">
              <Card className="flex flex-col gap-2 p-4">
                <span className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Total Disbursed</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                    <Icon name="payments" className="text-[18px]" />
                  </span>
                </span>
                <span className="text-headline-md font-bold text-on-surface">
                  ${((stats?.total_refunded_cents ?? 0) / 100).toFixed(2)}
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-4">
                <span className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Pending Action</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-coral-soft text-error">
                    <Icon name="hourglass_top" className="text-[18px]" />
                  </span>
                </span>
                <span className="text-headline-md font-bold text-on-surface">
                  {stats?.pending_count ?? 0}
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-4">
                <span className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Approved Refunds</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sage-soft text-primary">
                    <Icon name="verified" className="text-[18px]" />
                  </span>
                </span>
                <span className="text-headline-md font-bold text-on-surface">
                  {stats?.approved_count ?? 0}
                </span>
              </Card>

              <Card className="flex flex-col gap-2 p-4">
                <span className="flex items-center justify-between">
                  <span className="text-body-sm text-muted">Avg Processing</span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-container text-muted">
                    <Icon name="speed" className="text-[18px]" />
                  </span>
                </span>
                <span className="text-headline-md font-bold text-on-surface">
                  {stats?.avg_turnaround_hours ?? 14} hrs
                </span>
              </Card>
            </div>

            {/* Toolbar */}
            <Card className="flex flex-col gap-3 p-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative w-full max-w-sm">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-muted"
                  />
                  <Input
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                    placeholder="Search household, email or reason…"
                    className="h-10 pl-9"
                  />
                </div>

                <Select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as typeof statusFilter);
                    setPage(1);
                  }}
                  className="w-44"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
              </div>

              <Button onClick={() => setManualRefundOpen(true)}>
                <Icon name="add_circle" className="text-[18px]" />
                Issue Manual Refund
              </Button>
            </Card>

            {refundsQuery.isLoading && <p className="text-body-md text-muted">Loading refunds…</p>}

            {list.length === 0 && !refundsQuery.isLoading && (
              <EmptyState
                title="No refund requests match"
                description="All household billing inquiries are settled or no records match your filter."
              />
            )}

            {list.length > 0 && (
              <Card className="overflow-hidden p-0">
                <Table className="min-w-full">
                  <THead>
                    <TH>Household</TH>
                    <TH>Amount</TH>
                    <TH>Reason / Context</TH>
                    <TH>Requested</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </THead>
                  <tbody>
                    {list.map((r) => (
                      <TR key={r.id}>
                        <TD>
                          <div className="flex flex-col">
                            <span className="font-bold text-on-surface">{r.tenant_name}</span>
                            <span className="text-body-xs text-muted">{r.user_email || '—'}</span>
                          </div>
                        </TD>
                        <TD>
                          <span className="font-mono text-body-md font-bold text-on-surface">
                            ${(r.amount_cents / 100).toFixed(2)} {r.currency}
                          </span>
                        </TD>
                        <TD>
                          <div className="flex max-w-md flex-col">
                            <span className="text-body-sm text-on-surface">{r.reason}</span>
                            {r.admin_notes && (
                              <span className="mt-0.5 text-body-xs italic text-muted">
                                Note: {r.admin_notes}
                              </span>
                            )}
                          </div>
                        </TD>
                        <TD className="text-body-sm text-muted">
                          {new Date(r.created_at).toLocaleDateString()}
                        </TD>
                        <TD>
                          <Badge
                            tone={
                              r.status === 'approved'
                                ? 'success'
                                : r.status === 'rejected'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {r.status}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          {r.status === 'pending' && (
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setApproveModal(r);
                                  setAdminNote('');
                                }}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setRejectModal(r);
                                  setAdminNote('');
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                          {r.status !== 'pending' && (
                            <span className="text-body-xs text-muted">
                              by {r.processor?.name || 'admin'}
                            </span>
                          )}
                        </TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              </Card>
            )}
          </div>
        )}

        {/* Tab 2: Policy Terms Configuration */}
        {activeTab === 'policy' && currentPolicy && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <Card className="flex flex-col gap-4 p-6">
                <div>
                  <h3 className="text-headline-sm font-bold text-on-surface">
                    Public Refund Policy Text
                  </h3>
                  <p className="text-body-sm text-muted">
                    Rendered to household billing portals and checkout terms. Supports Markdown.
                  </p>
                </div>

                <div>
                  <Label htmlFor="policy-text">Terms Markdown Content</Label>
                  <textarea
                    id="policy-text"
                    rows={14}
                    value={currentPolicy.policy_markdown}
                    onChange={(e) =>
                      setPolicyForm({ ...currentPolicy, policy_markdown: e.target.value })
                    }
                    className="w-full rounded-xl border border-surface-container bg-canvas p-4 font-mono text-body-sm text-on-surface shadow-inner focus:outline-none focus:ring-2 focus:ring-secondary"
                  />
                </div>
              </Card>
            </div>

            {/* Side Settings */}
            <div className="flex flex-col gap-6">
              <Card className="flex flex-col gap-4 p-5">
                <h4 className="text-label-lg font-bold text-on-surface">Eligibility Rules</h4>

                <div>
                  <Label htmlFor="window-days">Money-Back Guarantee Window (Days)</Label>
                  <Input
                    id="window-days"
                    type="number"
                    value={currentPolicy.refund_window_days}
                    onChange={(e) =>
                      setPolicyForm({
                        ...currentPolicy,
                        refund_window_days: Number(e.target.value),
                      })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="contact-email">Billing Support Email</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    value={currentPolicy.contact_email}
                    onChange={(e) =>
                      setPolicyForm({
                        ...currentPolicy,
                        contact_email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="prorata-toggle"
                    checked={currentPolicy.pro_rata_enabled}
                    onChange={(e) =>
                      setPolicyForm({
                        ...currentPolicy,
                        pro_rata_enabled: e.target.checked,
                      })
                    }
                    className="h-4 w-4 cursor-pointer accent-secondary"
                  />
                  <Label htmlFor="prorata-toggle" className="cursor-pointer text-body-sm text-on-surface">
                    Enable pro-rated refunds on unused annual billing cycles
                  </Label>
                </div>

                <div className="border-t border-surface-container pt-3">
                  <Button
                    size="lg"
                    disabled={updatePolicyMutation.isPending}
                    onClick={() => updatePolicyMutation.mutate(currentPolicy)}
                  >
                    <Icon name="save" className="text-[18px]" />
                    {updatePolicyMutation.isPending ? 'Saving Policy…' : 'Save Refund Policy'}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Approve Modal */}
      <Modal
        open={approveModal !== null}
        onClose={() => setApproveModal(null)}
        title="Approve Refund Request"
        description={`Disburse $${((approveModal?.amount_cents ?? 0) / 100).toFixed(2)} to ${approveModal?.tenant_name}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setApproveModal(null)}>
              Cancel
            </Button>
            <Button
              disabled={approveMutation.isPending}
              onClick={() =>
                approveModal &&
                approveMutation.mutate({ id: approveModal.id, notes: adminNote })
              }
            >
              {approveMutation.isPending ? 'Processing…' : 'Confirm & Disburse'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Label htmlFor="approve-note">Processor Settlement Note (Optional)</Label>
          <Input
            id="approve-note"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Approved per 14-day policy guarantee..."
          />
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal
        open={rejectModal !== null}
        onClose={() => setRejectModal(null)}
        title="Reject Refund Request"
        description={`Decline refund request from ${rejectModal?.tenant_name}.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRejectModal(null)}>
              Cancel
            </Button>
            <Button
              variant="outline"
              disabled={rejectMutation.isPending || !adminNote.trim()}
              onClick={() =>
                rejectModal &&
                rejectMutation.mutate({ id: rejectModal.id, notes: adminNote })
              }
            >
              {rejectMutation.isPending ? 'Rejecting…' : 'Confirm Rejection'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <Label htmlFor="reject-note">Rejection Reason (Required)</Label>
          <Input
            id="reject-note"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Outside the 14-day refund window..."
          />
        </div>
      </Modal>

      {/* Manual Refund Modal */}
      <Modal
        open={manualRefundOpen}
        onClose={() => setManualRefundOpen(false)}
        title="Issue Manual Refund"
        description="Creates an administrative refund credit record directly for a household."
        footer={
          <>
            <Button variant="ghost" onClick={() => setManualRefundOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={createManualMutation.isPending || !manualForm.tenant_name.trim()}
              onClick={() => createManualMutation.mutate()}
            >
              {createManualMutation.isPending ? 'Recording…' : 'Record Refund'}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="m-tenant">Household Name</Label>
            <Input
              id="m-tenant"
              value={manualForm.tenant_name}
              onChange={(e) => setManualForm({ ...manualForm, tenant_name: e.target.value })}
              placeholder="e.g. The Rahman Household"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-amount">Amount (Cents)</Label>
              <Input
                id="m-amount"
                type="number"
                value={manualForm.amount_cents}
                onChange={(e) =>
                  setManualForm({ ...manualForm, amount_cents: Number(e.target.value) })
                }
              />
            </div>
            <div>
              <Label htmlFor="m-curr">Currency</Label>
              <Input
                id="m-curr"
                value={manualForm.currency}
                onChange={(e) => setManualForm({ ...manualForm, currency: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="m-reason">Reason</Label>
            <Input
              id="m-reason"
              value={manualForm.reason}
              onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
              placeholder="Billing adjustment or accidental renewal"
            />
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
