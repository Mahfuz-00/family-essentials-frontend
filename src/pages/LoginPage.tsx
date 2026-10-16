import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/AuthLayout';
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

export function LoginPage() {
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
        device_name: 'web-dashboard',
      });

      setAuth(data.token, data.user);

      // A landlord signing in here belongs in the console, not the household view.
      await navigate({ to: data.user.is_platform_admin ? '/admin' : '/' });
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your household workspace.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Alert>{error}</Alert>}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@familyessentials.app"
            aria-invalid={errors.email ? 'true' : undefined}
            {...register('email')}
          />
          {errors.email && <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? 'true' : undefined}
            {...register('password')}
          />
          {errors.password && <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>}
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>

        <div className="flex items-center justify-between text-body-md">
          <Link to="/forgot-password" className="font-semibold text-secondary hover:underline">
            Forgot password?
          </Link>
          <Link to="/register" className="font-semibold text-secondary hover:underline">
            Create a household
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
