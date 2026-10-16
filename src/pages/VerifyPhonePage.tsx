import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { AuthLayout } from '@/components/AuthLayout';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { AuthUser } from '@/types';

const OTP_LENGTH = 6;

export function VerifyPhonePage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const code = digits.join('');

  const sendCode = async () => {
    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      await api.post('/v1/auth/phone/send-code');
      setStatus('A 6-digit code has been sent. In development it is written to the API log.');
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  const setDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.replace(/\D/g, '').slice(-1);
    setDigits(next);

    if (next[index] !== '') {
      const target = document.getElementById(`otp-${index + 1}`);
      (target as HTMLInputElement | null)?.focus();
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setStatus(null);
    setBusy(true);

    try {
      const { data } = await api.post<{ user: AuthUser }>('/v1/auth/phone/verify', { code });
      setUser(data.user);
      await navigate({ to: '/' });
    } catch (caught) {
      setError(apiError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout title="Verify your phone" subtitle="We'll send a one-time code by SMS.">
      <div className="flex flex-col gap-5">
        {status && <Alert tone="success">{status}</Alert>}
        {error && <Alert>{error}</Alert>}

        <div className="flex items-start gap-3 rounded-xl bg-sage-soft p-4">
          <Icon name="sms" className="mt-0.5 text-[20px] text-secondary" />
          <p className="text-body-md text-on-surface-variant">
            Verify your number so boundary alerts and escalations can reach you.
          </p>
        </div>

        <Button variant="soft" size="lg" onClick={sendCode} disabled={busy}>
          {busy ? 'Working…' : 'Send verification code'}
        </Button>

        <form className="flex flex-col gap-5" onSubmit={verify}>
          <fieldset>
            <legend className="mb-2 text-label-md text-on-surface-variant">6-digit code</legend>
            <div className="flex gap-2">
              {digits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  inputMode="numeric"
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                  maxLength={1}
                  value={digit}
                  aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                  onChange={(event) => setDigit(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Backspace' && digits[index] === '' && index > 0) {
                      document.getElementById(`otp-${index - 1}`)?.focus();
                    }
                  }}
                  className="h-14 w-full rounded-xl border border-[rgba(43,45,66,0.12)] bg-surface text-center text-headline-md text-on-surface outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(124,144,130,0.2)]"
                />
              ))}
            </div>
          </fieldset>

          <Button type="submit" size="lg" disabled={busy || code.length !== OTP_LENGTH}>
            {busy ? 'Verifying…' : 'Verify phone'}
          </Button>
        </form>

        <Link to="/" className="text-center text-body-md font-semibold text-secondary hover:underline">
          Continue to dashboard
        </Link>
      </div>
    </AuthLayout>
  );
}
