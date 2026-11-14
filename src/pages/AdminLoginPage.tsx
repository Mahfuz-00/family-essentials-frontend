import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/AuthLayout';
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
  const [showPassword, setShowPassword] = useState(false);

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
    <AuthLayout
      isPlatformAdmin
      title="Platform Admin"
      subtitle="Sign in to the landlord operations console. Authorized administrators only."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="flex items-center gap-2 rounded-xl border border-warning/30 bg-warning/10 px-4 py-2.5">
          <Icon name="gpp_maybe" className="text-[18px] text-tertiary shrink-0" />
          <span className="text-body-sm text-on-surface">
            Strict zero-trust zone · cross-tenant access is audited
          </span>
        </div>

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
          <div className="relative">
            <Input
              id="admin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              aria-invalid={errors.password ? 'true' : undefined}
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide text' : 'Show text'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface transition-colors cursor-pointer p-1"
            >
              <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
            </button>
          </div>
          {errors.password && (
            <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>
          )}
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in to landlord console'}
        </Button>

        <div className="flex items-center justify-between text-body-md">
          <Link to="/login" className="font-semibold text-secondary hover:underline">
            Household sign-in
          </Link>
          <Link to="/forgot-password" className="font-semibold text-secondary hover:underline">
            Forgot password?
          </Link>
        </div>

        <div className="border-t border-outline-variant/20 pt-4 text-center">
          <Link to="/landing" className="text-body-sm text-muted transition-colors hover:text-secondary hover:underline">
            ← Explore FairShare Overview
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
