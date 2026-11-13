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
import { Select } from '@/components/ui/select';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { AuthUser } from '@/types';

const CURRENCIES = [
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'CAD', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', label: 'AUD ($) - Australian Dollar' },
  { code: 'JPY', label: 'JPY (¥) - Japanese Yen' },
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'BDT', label: 'BDT (৳) - Bangladeshi Taka' },
];

const schema = z
  .object({
    name: z.string().min(2, 'Enter your full name'),
    email: z.string().email('Enter a valid email address like name@example.com'),
    phone: z.string().min(6, 'Enter a phone number for verification'),
    household_name: z.string().optional(),
    currency: z.string().min(3).max(3),
    monthly_budget: z.string().optional(),
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: 'USD',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);

    const monthlyBudgetMinor = values.monthly_budget && !isNaN(Number(values.monthly_budget))
      ? Math.round(Number(values.monthly_budget) * 100)
      : undefined;

    try {
      const { data } = await api.post<{ user: AuthUser; token: string }>('/v1/auth/register', {
        name: values.name,
        email: values.email,
        phone: values.phone,
        household_name: values.household_name || undefined,
        currency: values.currency,
        monthly_budget_minor: monthlyBudgetMinor,
        yearly_budget_minor: monthlyBudgetMinor ? monthlyBudgetMinor * 12 : undefined,
        password: values.password,
        password_confirmation: values.password_confirmation,
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
            <Label htmlFor="currency">Household Currency</Label>
            <Select id="currency" {...register('currency')}>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted">Used for ledgers, budgets, and expense tracking</p>
          </div>

          <div>
            <Label htmlFor="monthly_budget">Starting Monthly Budget (optional)</Label>
            <Input
              id="monthly_budget"
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 2500"
              {...register('monthly_budget')}
            />
            <p className="mt-1 text-xs text-muted">Sets initial monthly & yearly spending limits</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            {errors.password && <p className="mt-1.5 text-body-sm text-error">{errors.password.message}</p>}
          </div>

          <div>
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <div className="relative">
              <Input
                id="password_confirmation"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="pr-10"
                {...register('password_confirmation')}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide text' : 'Show text'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-on-surface transition-colors cursor-pointer p-1"
              >
                <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} className="text-[20px]" />
              </button>
            </div>
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
