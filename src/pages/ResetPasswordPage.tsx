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

const schema = z
  .object({
    email: z.string().email('Enter a valid email address like name@example.com'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string(),
  })
  .refine((values) => values.password === values.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Passwords do not match',
  });

type FormValues = z.infer<typeof schema>;

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email } });

  const onSubmit = async (values: FormValues) => {
    setError(null);

    try {
      await api.post('/v1/auth/reset-password', {
        token,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });

      await navigate({ to: '/login' });
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  return (
    <AuthLayout title="Choose a new password" subtitle="Set a strong password for your account.">
      <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {error && <Alert>{error}</Alert>}
        {!token && <Alert>This reset link is missing its token. Request a new one.</Alert>}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" {...register('email')} />
          {errors.email && <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>}
        </div>

        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
          {errors.password && <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>}
        </div>

        <div>
          <Label htmlFor="password_confirmation">Confirm new password</Label>
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

        <Button type="submit" size="lg" disabled={isSubmitting || !token}>
          {isSubmitting ? 'Updating…' : 'Update password'}
        </Button>

        <Link to="/login" className="text-center text-body-md font-semibold text-secondary hover:underline">
          ← Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
