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
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';

interface ProfileData {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  is_platform_admin: boolean;
  voice_opt_in: boolean;
  location_notifications_opt_in: boolean;
  alert_style: string;
  created_at: string;
}

export function AdminProfilePage() {
  const queryClient = useQueryClient();
  const setAuthUser = useAuthStore((state) => state.setUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoaded, setIsLoaded] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pwNotice, setPwNotice] = useState<string | null>(null);
  const [pwError, setPwError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ['admin', 'profile'],
    queryFn: async () => {
      const resp = await api.get<{ data: ProfileData }>('/v1/auth/me');
      const data = resp.data.data;
      if (!isLoaded) {
        setName(data.name);
        setEmail(data.email);
        setPhone(data.phone ?? '');
        setIsLoaded(true);
      }
      return data;
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string; email: string; phone: string | null }) => {
      const resp = await api.patch<{ message: string; data: ProfileData }>('/v1/auth/me', payload);
      return resp.data;
    },
    onSuccess: (data) => {
      setNotice('Profile credentials updated successfully.');
      setError(null);
      setAuthUser(data.data as any);
      queryClient.invalidateQueries({ queryKey: ['admin', 'profile'] });
    },
    onError: (err) => {
      setError(apiError(err));
      setNotice(null);
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (payload: { current_password: string; password: string; password_confirmation: string }) => {
      const resp = await api.post<{ message: string }>('/v1/auth/me/password', payload);
      return resp.data;
    },
    onSuccess: (data) => {
      setPwNotice(data.message || 'Password changed successfully.');
      setPwError(null);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setPwError(apiError(err));
      setPwNotice(null);
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setError(null);
    updateProfileMutation.mutate({
      name,
      email,
      phone: phone.trim() ? phone.trim() : null,
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPwNotice(null);
    setPwError(null);

    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters long.');
      return;
    }

    updatePasswordMutation.mutate({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmPassword,
    });
  };

  const profile = profileQuery.data;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 max-w-5xl">
        <PageHeader
          title="Platform Admin Profile Management"
          description="Manage root administrator account details, security credentials, contact preferences, and access permissions."
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Credentials Form */}
          <div className="flex flex-col gap-6 lg:col-span-2">
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon name="badge" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Administrator Details</h2>
                  <p className="text-xs text-muted">Primary identity information for platform administration</p>
                </div>
              </div>

              {notice && <Alert tone="success">{notice}</Alert>}
              {error && <Alert tone="error">{error}</Alert>}

              <form onSubmit={handleProfileSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-name">Full Name</Label>
                  <Input
                    id="admin-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Master Administrator"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-email">Admin Email Address</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="admin@fairshare.app"
                  />
                  <span className="text-[11px] text-muted">
                    Used for platform escalation alerts, audit signatures, and landlord session login.
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="admin-phone">Emergency Phone Number</Label>
                  <Input
                    id="admin-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                  />
                  <span className="text-[11px] text-muted">
                    Used for automated voice dispatch test calls and platform incident SMS escalation.
                  </span>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={updateProfileMutation.isPending}
                  >
                    <Icon name="save" className="text-[18px]" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </Card>

            {/* Change Password Form */}
            <Card className="flex flex-col gap-5 p-6">
              <div className="flex items-center gap-3 border-b border-outline-variant/20 pb-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                  <Icon name="lock" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface">Authentication &amp; Password</h2>
                  <p className="text-xs text-muted">Update your root login password to protect landlord controls</p>
                </div>
              </div>

              {pwNotice && <Alert tone="success">{pwNotice}</Alert>}
              {pwError && <Alert tone="error">{pwError}</Alert>}

              <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="current-pw">Current Password</Label>
                  <Input
                    id="current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="new-pw">New Password</Label>
                    <Input
                      id="new-pw"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      placeholder="Min. 8 characters"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="confirm-pw">Confirm New Password</Label>
                    <Input
                      id="confirm-pw"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Repeat new password"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={updatePasswordMutation.isPending}
                  >
                    <Icon name="key" className="text-[18px]" />
                    {updatePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Admin Sidebar Security / Metadata */}
          <div className="flex flex-col gap-6">
            <Card className="flex flex-col gap-4 p-5 bg-surface-container-low">
              <span className="text-label-sm font-bold uppercase tracking-wider text-muted">
                Access Authorization
              </span>

              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-secondary text-on-secondary shadow-e1">
                  <Icon name="shield" className="text-[24px]" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-on-surface">Platform Landlord</span>
                  <span className="text-xs text-muted">Full System Superuser</span>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-outline-variant/30 text-xs text-on-surface-variant">
                <div className="flex items-center justify-between">
                  <span>Role:</span>
                  <Badge tone="success">Super Admin</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Database Access:</span>
                  <span className="font-mono text-[11px] font-semibold text-secondary">Cross-Tenant RLS Bypass</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Audit Logging:</span>
                  <span className="font-semibold text-success">Active &amp; Immutable</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Account Created:</span>
                  <span className="font-mono text-[11px] text-muted">
                    {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Active'}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="flex flex-col gap-3 p-5">
              <span className="text-label-sm font-bold uppercase tracking-wider text-muted">
                Admin Security Advice
              </span>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                As a platform administrator, your account can review multi-tenant analytics, issue refunds, adjust payment gateway keys, and initiate database backups. Always use a strong, unique passphrase.
              </p>
              <div className="rounded-xl bg-forest-soft p-3 text-xs text-secondary flex items-start gap-2">
                <Icon name="verified_user" className="text-[16px] shrink-0 mt-0.5" />
                <span>All actions executed by this account are recorded into the platform audit log.</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
