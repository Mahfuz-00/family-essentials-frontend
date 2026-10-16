import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { AuthUser } from '@/types';

const schema = z.object({
  email: z.string().email('Enter a valid email address like name@example.com'),
  password: z.string().min(1, 'Enter your password'),
});

type FormValues = z.infer<typeof schema>;

/**
 * Platform-admin (landlord) entry point. Distinct from the household login:
 * it refuses non-admin accounts rather than quietly signing them in.
 */
export function AdminLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);

    try {
      const { data } = await api.post<{ user: AuthUser; token: string }>('/v1/auth/login', {
        ...values,
        device_name: 'platform-console',
      });

      if (!data.user.is_platform_admin) {
        setError('That account is not a platform administrator. Use the household sign-in instead.');
        return;
      }

      setAuth(data.token, data.user);
      await navigate({ to: '/admin' });
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  return (
    <div className="relative flex min-h-full flex-col justify-between overflow-hidden bg-canvas">
      <span className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <span className="pointer-events-none absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-secondary/5 blur-3xl" />

      <header className="relative flex items-center justify-between gap-4 border-b border-[rgba(43,45,66,0.08)] bg-surface/70 px-8 py-5 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-secondary to-primary text-on-secondary">
            <Icon name="shield" filled className="text-[22px]" />
          </span>
          <div className="flex flex-col">
            <span className="flex items-center gap-2">
              <span className="text-headline-sm font-bold text-on-surface">Family Essentials</span>
              <span className="rounded-full bg-sage-soft px-2 py-0.5 text-label-sm uppercase tracking-wider text-on-surface-variant">
                Platform Admin
              </span>
            </span>
            <span className="text-label-sm text-muted">Multi-tenant landlord governance console</span>
          </div>
        </div>

        <span className="hidden items-center gap-2 rounded-full bg-forest-soft px-3 py-1.5 text-label-sm text-secondary md:flex">
          <span className="h-2 w-2 rounded-full bg-success" />
          Row-level security enforced
        </span>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[480px]">
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5">
            <Icon name="gpp_maybe" className="text-[18px] text-tertiary" />
            <span className="text-body-sm text-on-surface">
              Strict zero-trust zone · cross-tenant access is audited
            </span>
          </div>

          <div className="rounded-3xl border border-[rgba(43,45,66,0.05)] bg-surface p-8 shadow-e2">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-soft text-secondary">
                <Icon name="shield" filled className="text-[28px]" />
              </span>
              <span className="text-label-sm uppercase tracking-[0.12em] text-muted">
                Platform Admin Console
              </span>
              <h1 className="text-headline-lg text-on-surface">Sign in to the landlord console</h1>
              <p className="text-body-sm text-muted">
                Authorized platform administrators only. Household accounts are rejected here.
              </p>
            </div>

            <form className="mt-7 flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
              {error && <Alert>{error}</Alert>}

              <div>
                <Label htmlFor="admin-email">Admin work email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="platform@familyessentials.app"
                  aria-invalid={errors.email ? 'true' : undefined}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="admin-password">Master password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={errors.password ? 'true' : undefined}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" size="xl" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Signing in…' : 'Sign in to landlord console'}
              </Button>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-forest-soft" />
              <span className="text-label-sm uppercase tracking-wider text-muted">or</span>
              <span className="h-px flex-1 bg-forest-soft" />
            </div>

            <Link
              to="/login"
              className="mt-4 flex items-center justify-center gap-1.5 text-label-lg font-semibold text-secondary hover:underline"
            >
              Sign in to a household workspace
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>

          <p className="mt-5 flex flex-wrap items-center justify-center gap-3 text-label-sm text-muted">
            <span className="flex items-center gap-1.5">
              <Icon name="lock" className="text-[14px]" />
              Session tokens are per-device
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="dns" className="text-[14px]" />
              PostgreSQL row-level isolation
            </span>
          </p>
        </div>
      </main>

      <footer className="relative border-t border-[rgba(43,45,66,0.08)] bg-surface px-8 py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-label-sm text-muted">
          <span>Family Essentials · Landlord platform v2.4</span>
          <span>Need help? Contact the platform SRE team.</span>
        </div>
      </footer>
    </div>
  );
}
