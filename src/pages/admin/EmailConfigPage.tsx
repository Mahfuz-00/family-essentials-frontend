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
import type { EmailSettings } from '@/types';

export function EmailConfigPage() {
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testNotice, setTestNotice] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const emailQuery = useQuery({
    queryKey: ['platform', 'settings', 'email'],
    queryFn: async () =>
      (await api.get<{ data: EmailSettings }>('/v1/platform/settings/email')).data.data,
  });

  const [form, setForm] = useState<EmailSettings | null>(null);
  const currentSettings = form ?? emailQuery.data;

  const updateMutation = useMutation({
    mutationFn: async (settings: EmailSettings) =>
      (await api.post('/v1/platform/settings/email', settings)).data,
    onSuccess: () => {
      setNotice('Email configuration saved successfully.');
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['platform', 'settings', 'email'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const dispatchTestEmail = async () => {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestNotice(null);
    setTestError(null);
    try {
      const res = (
        await api.post<{ success: boolean; message: string }>('/v1/platform/settings/email/test', {
          recipient: testEmail.trim(),
        })
      ).data;
      setTestNotice(res.message);
    } catch (err) {
      setTestError(apiError(err));
    } finally {
      setTesting(false);
    }
  };

  const handleUpdate = (updater: (prev: EmailSettings) => EmailSettings) => {
    if (!currentSettings) return;
    setForm(updater(currentSettings));
  };

  const toggleTemplate = (templateId: string) => {
    if (!currentSettings) return;
    const updated = (currentSettings.templates ?? []).map((t) =>
      t.id === templateId ? { ...t, enabled: !t.enabled } : t,
    );
    setForm({ ...currentSettings, templates: updated });
  };

  return (
    <AppLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <PageHeader
          title="Email Setup"
          titleSize="headline"
          description="Manage transactional email infrastructure, SMTP / cloud mail providers, and outgoing household notification templates."
        />

        {error && <Alert tone="error">{error}</Alert>}
        {notice && <Alert tone="success">{notice}</Alert>}

        {emailQuery.isLoading && (
          <div className="flex flex-col gap-6">
            <SkeletonForm fields={6} />
            <SkeletonForm fields={4} />
          </div>
        )}

        {currentSettings && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Main Provider Settings */}
              <div className="flex flex-col gap-6 lg:col-span-2">
                <Card className="flex flex-col gap-5 p-6">
                  <div className="flex items-center justify-between border-b border-surface-container pb-4">
                    <div>
                      <h3 className="text-headline-sm font-bold text-on-surface">Delivery Provider</h3>
                      <p className="text-body-sm text-muted">SMTP or hosted transactional delivery service</p>
                    </div>
                    <Badge tone="primary">Active Mailer: {currentSettings.mailer.toUpperCase()}</Badge>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="mailer">Mail Driver / Protocol</Label>
                      <Select
                        id="mailer"
                        value={currentSettings.mailer}
                        onChange={(e) =>
                          handleUpdate((prev) => ({
                            ...prev,
                            mailer: e.target.value as EmailSettings['mailer'],
                          }))
                        }
                      >
                        <option value="smtp">Standard SMTP (Custom Host)</option>
                        <option value="mailgun">Mailgun API / SMTP</option>
                        <option value="postmark">Postmark</option>
                        <option value="ses">Amazon SES</option>
                        <option value="sendgrid">Twilio SendGrid</option>
                        <option value="log">Local Log (Development)</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="smtp-host">Host</Label>
                      <Input
                        id="smtp-host"
                        value={currentSettings.host ?? ''}
                        onChange={(e) =>
                          handleUpdate((prev) => ({ ...prev, host: e.target.value }))
                        }
                        placeholder="smtp.mailgun.org"
                      />
                    </div>

                    <div>
                      <Label htmlFor="smtp-port">Port</Label>
                      <Input
                        id="smtp-port"
                        type="number"
                        value={currentSettings.port ?? 587}
                        onChange={(e) =>
                          handleUpdate((prev) => ({ ...prev, port: Number(e.target.value) }))
                        }
                        placeholder="587"
                      />
                    </div>

                    <div>
                      <Label htmlFor="smtp-encryption">Encryption Protocol</Label>
                      <Select
                        id="smtp-encryption"
                        value={currentSettings.encryption ?? 'tls'}
                        onChange={(e) =>
                          handleUpdate((prev) => ({
                            ...prev,
                            encryption: e.target.value as 'tls' | 'ssl' | 'none',
                          }))
                        }
                      >
                        <option value="tls">STARTTLS (Recommended / Port 587)</option>
                        <option value="ssl">SSL / TLS (Port 465)</option>
                        <option value="none">None (Insecure / Port 25)</option>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="smtp-user">Username / API Key ID</Label>
                      <Input
                        id="smtp-user"
                        value={currentSettings.username ?? ''}
                        onChange={(e) =>
                          handleUpdate((prev) => ({ ...prev, username: e.target.value }))
                        }
                        placeholder="postmaster@mg.fairshare.app"
                      />
                    </div>

                    <div>
                      <Label htmlFor="smtp-pass">Password / Secret Key</Label>
                      <div className="relative">
                        <Input
                          id="smtp-pass"
                          type={showPassword ? 'text' : 'password'}
                          value={currentSettings.password ?? ''}
                          onChange={(e) =>
                            handleUpdate((prev) => ({ ...prev, password: e.target.value }))
                          }
                          placeholder="••••••••••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface"
                        >
                          <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[16px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Sender Headers */}
                  <div className="grid grid-cols-1 gap-4 border-t border-surface-container pt-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="from-address">From Email Address</Label>
                      <Input
                        id="from-address"
                        type="email"
                        value={currentSettings.from_address}
                        onChange={(e) =>
                          handleUpdate((prev) => ({ ...prev, from_address: e.target.value }))
                        }
                        placeholder="notifications@fairshare.app"
                      />
                    </div>

                    <div>
                      <Label htmlFor="from-name">From Sender Name</Label>
                      <Input
                        id="from-name"
                        value={currentSettings.from_name}
                        onChange={(e) =>
                          handleUpdate((prev) => ({ ...prev, from_name: e.target.value }))
                        }
                        placeholder="FairShare Household Sync"
                      />
                    </div>
                  </div>
                </Card>

                {/* Templates Switcher */}
                <Card className="flex flex-col gap-4 p-6">
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-surface">
                      Transactional Email Templates
                    </h3>
                    <p className="text-body-sm text-muted">
                      Control which platform triggers dispatch automatic notifications to family members.
                    </p>
                  </div>

                  <div className="flex flex-col divide-y divide-surface-container">
                    {(currentSettings.templates ?? []).map((template) => (
                      <div key={template.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                              template.enabled ? 'bg-forest-soft text-secondary' : 'bg-surface-container text-muted'
                            }`}
                          >
                            <Icon name="mail" className="text-[16px]" />
                          </span>
                          <span className="text-body-md font-medium text-on-surface">
                            {template.name}
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={template.enabled}
                          onChange={() => toggleTemplate(template.id)}
                          className="h-4 w-4 cursor-pointer accent-secondary"
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Side Card: Test Email Delivery Tool */}
              <div className="flex flex-col gap-6">
                <Card className="flex flex-col gap-4 border-primary/20 bg-forest-soft/30 p-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-secondary">
                      <Icon name="send" className="text-[18px]" />
                    </span>
                    <div>
                      <h4 className="text-label-lg font-bold text-on-surface">Send Test Email</h4>
                      <p className="text-body-xs text-muted">Verify end-to-end SMTP dispatch</p>
                    </div>
                  </div>

                  <p className="text-body-sm text-muted">
                    Sends a live verification message through the active mail driver to check DNS, SPF,
                    and TLS handshake health.
                  </p>

                  <div className="flex flex-col gap-2">
                    <Label htmlFor="test-recipient">Target Recipient</Label>
                    <Input
                      id="test-recipient"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="admin@example.com"
                    />
                  </div>

                  {testNotice && <Alert tone="success">{testNotice}</Alert>}
                  {testError && <Alert tone="error">{testError}</Alert>}

                  <Button
                    disabled={testing || !testEmail.trim()}
                    onClick={dispatchTestEmail}
                  >
                    <Icon name="mark_email_read" className="text-[16px]" />
                    {testing ? 'Sending Verification…' : 'Dispatch Test Email'}
                  </Button>
                </Card>

                {/* Save Global Button */}
                <Card className="flex flex-col gap-3 p-5">
                  <span className="text-label-md font-bold text-on-surface">Apply Changes</span>
                  <p className="text-body-xs text-muted">
                    Saves mailer settings and template activations across all tenant notification triggers.
                  </p>
                  <Button
                    size="lg"
                    disabled={updateMutation.isPending}
                    onClick={() => updateMutation.mutate(currentSettings)}
                  >
                    <Icon name="save" className="text-[18px]" />
                    {updateMutation.isPending ? 'Saving Configuration…' : 'Save Email Configuration'}
                  </Button>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
