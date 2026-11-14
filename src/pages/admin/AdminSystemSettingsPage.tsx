import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/components/AppLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/ui/page-header';
import { SkeletonForm } from '@/components/ui/skeleton';
import { Select } from '@/components/ui/select';
import { api, apiError } from '@/lib/api';

interface SystemSettings {
  app_name: string;
  support_email: string;
  company_name: string;
  default_plan: string;
  default_trial_days: number;
  allow_registrations: boolean;
  require_email_verification: boolean;
  session_timeout_minutes: number;
  max_members_free_tier: number;
  maintenance_mode: boolean;
  maintenance_announcement: string;
  platform_version: string;
}

export function AdminSystemSettingsPage() {
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SystemSettings | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ['platform', 'settings', 'system'],
    queryFn: async () => {
      const resp = await api.get<{ data: SystemSettings }>('/v1/platform/settings/system');
      if (!form) {
        setForm(resp.data.data);
      }
      return resp.data.data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: SystemSettings) => {
      const resp = await api.post<{ message: string; data: SystemSettings }>(
        '/v1/platform/settings/system',
        payload
      );
      return resp.data;
    },
    onSuccess: (data) => {
      setNotice('Overall system settings updated successfully.');
      setError(null);
      setForm(data.data);
      queryClient.invalidateQueries({ queryKey: ['platform', 'settings', 'system'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const current = form ?? settingsQuery.data;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) return;
    setNotice(null);
    setError(null);
    updateMutation.mutate(current);
  };

  const updateField = <K extends keyof SystemSettings>(field: K, value: SystemSettings[K]) => {
    if (!current) return;
    setForm({
      ...current,
      [field]: value,
    });
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="System Settings"
          titleSize="headline"
          description="Configure global application branding, default tier allocations, membership restrictions, session timeouts, and maintenance banners."
        />

        {notice && <Alert tone="success">{notice}</Alert>}
        {error && <Alert tone="error">{error}</Alert>}

        {settingsQuery.isLoading || !current ? (
          <div className="flex flex-col gap-6">
            <SkeletonForm fields={4} />
            <SkeletonForm fields={6} />
            <SkeletonForm fields={4} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Branding & Platform Identity */}
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon name="palette" className="text-[22px]" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-on-surface">Application &amp; Company Identity</h2>
                    <p className="text-xs text-muted">Global branding attributes applied across web and mobile</p>
                  </div>
                </div>
                <Badge tone="neutral">v{current.platform_version}</Badge>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input
                    id="app-name"
                    value={current.app_name}
                    onChange={(e) => updateField('app_name', e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted">Displayed in header, notification emails, and calendar feeds.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="support-email">Public Support Email</Label>
                  <Input
                    id="support-email"
                    type="email"
                    value={current.support_email}
                    onChange={(e) => updateField('support_email', e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted">Contact email printed on PDF invoices and help footers.</span>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="company-name">Legal Entity / Company Name</Label>
                  <Input
                    id="company-name"
                    value={current.company_name}
                    onChange={(e) => updateField('company_name', e.target.value)}
                    required
                  />
                  <span className="text-[11px] text-muted">Appears on invoices, receipts, and platform terms of service.</span>
                </div>
              </div>
            </Card>

            {/* Tenancy & Plans Default */}
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                  <Icon name="workspace_premium" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Household Onboarding &amp; Plan Defaults</h2>
                  <p className="text-xs text-muted">Default subscription tier, trial length, and seat allowances</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="default-plan">Default Plan for New Households</Label>
                  <Select
                    id="default-plan"
                    value={current.default_plan}
                    onChange={(e) => updateField('default_plan', e.target.value)}
                  >
                    <option value="free">Free Starter</option>
                    <option value="starter">Starter Plan ($9/mo)</option>
                    <option value="family_plus">Family Plus ($19/mo)</option>
                    <option value="enterprise">Enterprise ($49/mo)</option>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="trial-days">Default Trial Days</Label>
                  <Input
                    id="trial-days"
                    type="number"
                    min="0"
                    max="90"
                    value={current.default_trial_days}
                    onChange={(e) => updateField('default_trial_days', parseInt(e.target.value) || 0)}
                  />
                  <span className="text-[11px] text-muted">0 disables trial.</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="max-free-members">Max Members (Free Tier)</Label>
                  <Input
                    id="max-free-members"
                    type="number"
                    min="1"
                    max="20"
                    value={current.max_members_free_tier}
                    onChange={(e) => updateField('max_members_free_tier', parseInt(e.target.value) || 4)}
                  />
                  <span className="text-[11px] text-muted">Caps free household size.</span>
                </div>
              </div>
            </Card>

            {/* Security & Access Policies */}
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                  <Icon name="security" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Security &amp; Registration Policies</h2>
                  <p className="text-xs text-muted">Global sign-up gates, session timeouts, and verification rules</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-on-surface">Allow Public Registrations</span>
                    <span className="text-xs text-muted">If disabled, only invite links can join</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={current.allow_registrations}
                    onChange={(e) => updateField('allow_registrations', e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant accent-secondary cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-bold text-on-surface">Require Email Verification</span>
                    <span className="text-xs text-muted">Mandates signed link before full access</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={current.require_email_verification}
                    onChange={(e) => updateField('require_email_verification', e.target.checked)}
                    className="h-5 w-5 rounded border-outline-variant accent-secondary cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <Label htmlFor="session-timeout">Inactivity Session Timeout (Minutes)</Label>
                  <Input
                    id="session-timeout"
                    type="number"
                    min="15"
                    max="1440"
                    value={current.session_timeout_minutes}
                    onChange={(e) => updateField('session_timeout_minutes', parseInt(e.target.value) || 120)}
                  />
                  <span className="text-[11px] text-muted">
                    Tokens expire after this duration of total inactivity (default: 120 minutes = 2 hours).
                  </span>
                </div>
              </div>
            </Card>

            {/* Maintenance & Announcement */}
            <Card className="flex flex-col gap-5 p-6 border-amber-500/30">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Icon name="engineering" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Maintenance Mode &amp; Global Broadcasts</h2>
                  <p className="text-xs text-muted">Control maintenance status and site-wide informational banners</p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-outline-variant/30 bg-surface-container-low p-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-bold text-on-surface">Platform Maintenance Mode</span>
                  <span className="text-xs text-muted">Restricts tenant dashboard access for database upgrades</span>
                </div>
                <input
                  type="checkbox"
                  checked={current.maintenance_mode}
                  onChange={(e) => updateField('maintenance_mode', e.target.checked)}
                  className="h-5 w-5 rounded border-outline-variant accent-amber-600 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="announcement">Global Maintenance / Announcement Banner</Label>
                <textarea
                  id="announcement"
                  rows={3}
                  value={current.maintenance_announcement}
                  onChange={(e) => updateField('maintenance_announcement', e.target.value)}
                  placeholder="e.g. System upgrade scheduled for Sunday 02:00 UTC. Live service may experience brief interruptions."
                  className="w-full rounded-xl border border-outline-variant/40 bg-canvas p-3 text-sm text-on-surface placeholder:text-muted focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20"
                />
                <span className="text-[11px] text-muted">
                  Broadcasts a sticky message to all logged-in household members when populated.
                </span>
              </div>
            </Card>

            <div className="flex justify-end gap-3 pb-8">
              <Button
                type="submit"
                variant="primary"
                disabled={updateMutation.isPending}
              >
                <Icon name="save" className="text-[18px]" />
                {updateMutation.isPending ? 'Saving...' : 'Save System Settings'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </AppLayout>
  );
}
