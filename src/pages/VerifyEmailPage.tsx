import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { AuthLayout } from '@/components/AuthLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api, apiError } from '@/lib/api';

export function VerifyEmailPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const resend = async () => {
    setError(null);
    setStatus(null);
    setSending(true);

    try {
      await api.post('/v1/auth/email/resend');
      setStatus('A fresh verification link has been sent to your inbox.');
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle="Confirm your address to activate reminders.">
      <div className="flex flex-col gap-5">
        {status && <Alert tone="success">{status}</Alert>}
        {error && <Alert>{error}</Alert>}

        <div className="flex items-start gap-3 rounded-xl bg-sage-soft p-4">
          <Icon name="mark_email_unread" className="mt-0.5 text-[20px] text-secondary" />
          <p className="text-body-md text-on-surface-variant">
            Open the link we emailed you. In local development it is written to{' '}
            <code className="rounded bg-surface px-1.5 py-0.5 text-body-sm">storage/logs/laravel.log</code>.
          </p>
        </div>

        <Button onClick={resend} size="lg" disabled={sending}>
          {sending ? 'Sending…' : 'Resend verification link'}
        </Button>

        <Link to="/" className="text-center text-body-md font-semibold text-secondary hover:underline">
          Continue to dashboard
        </Link>
      </div>
    </AuthLayout>
  );
}
