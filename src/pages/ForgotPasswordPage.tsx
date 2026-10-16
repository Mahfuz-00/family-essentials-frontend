import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AuthLayout } from '@/components/AuthLayout';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, apiError } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email address like name@example.com'),
});

type FormValues = z.infer<typeof schema>;

export function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setError(null);

    try {
      await api.post('/v1/auth/forgot-password', values);
      setSent(true);
    } catch (caught) {
      setError(apiError(caught));
    }
  };

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a secure reset link.">
      {sent ? (
        <div className="flex flex-col gap-5">
          <Alert tone="success">If that address is registered, a reset link is on its way.</Alert>
          <Link to="/login" className="text-body-md font-semibold text-secondary hover:underline">
            ← Back to sign in
          </Link>
        </div>
      ) : (
        <form className="flex flex-col gap-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          {error && <Alert>{error}</Alert>}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="mt-1.5 text-body-sm text-error">{errors.email.message}</p>}
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </Button>

          <Link to="/login" className="text-center text-body-md font-semibold text-secondary hover:underline">
            ← Back to sign in
          </Link>
        </form>
      )}
    </AuthLayout>
  );
}
