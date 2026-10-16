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

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address like name@example.com'),
    phone: z.string().min(6, 'Enter a phone number for verification'),
    household_name: z.string().optional(),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

export function RegisterPage() {
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
      const { data } = await api.post<{ user: AuthUser; token: string }>('/v1/auth/register', {
        ...values,
        device_name: 'web-dashboard',
      });

      setAuth(data.token, data.user);
      await navigate({ to: '/verify-phone' });
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  return (
    <AuthLayout
      title="Create your household"
      subtitle="One workspace for your family's shared needs, owners and reminders."
    >
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Alert>{error}</Alert>}

        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" autoComplete="name" aria-invalid={errors.name ? 'true' : undefined} {...register('name')} />
          {errors.name && <p className="mt-1.5 text-body-sm text-error">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>}
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" autoComplete="tel" placeholder="+1 555 010 0000" {...register('phone')} />
            {errors.phone && <p className="mt-1.5 text-body-sm text-error">{errors.phone.message}</p>}
          </div>
        </div>

        <div>
          <Label htmlFor="household_name">Household name (optional)</Label>
          <Input id="household_name" placeholder="The Rahman Household" {...register('household_name')} />
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <Input
              id="password_confirmation"
              type="password"
              autoComplete="new-password"
              {...register('password_confirmation')}
            />
            {errors.password_confirmation && (
              <p className="mt-1.5 text-body-sm text-error">{errors.password_confirmation.message}</p>
            )}
          </div>
        </div>

        <Button type="submit" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating household…' : 'Create household'}
        </Button>

        <p className="text-center text-body-md text-muted">
          Already registered?{' '}
          <Link to="/login" className="font-semibold text-secondary hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}
