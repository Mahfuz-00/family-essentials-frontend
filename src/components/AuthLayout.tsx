import type { ReactNode } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Icon } from '@/components/Icon';

const promises = [
  { icon: 'checklist', text: 'Capture a need once, assign a clear owner' },
  { icon: 'notifications_active', text: 'Reminders at the right time, or the right place' },
  { icon: 'shield_lock', text: 'Every household isolated, always' },
];

export function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-full bg-canvas text-on-surface">
      {/* Brand panel — the promise, not decoration. */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-forest-soft p-10 lg:flex">
        <BrandLogo subtitle="Smart Reminder" />

        <div className="flex max-w-md flex-col gap-6">
          <h2 className="text-display-lg tracking-tight text-on-surface">
            Never forget a household need again.
          </h2>
          <ul className="flex flex-col gap-4">
            {promises.map((item) => (
              <li key={item.text} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-secondary shadow-xs">
                  <Icon name={item.icon} className="text-[16px]" />
                </span>
                <span className="text-body-md text-on-surface-variant">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-body-sm font-medium text-secondary">
          Pilot built for families — shared lists, quiet hours, and optional voice escalation.
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <BrandLogo />
          </div>

          <h1 className="text-display-lg tracking-tight text-on-surface">{title}</h1>
          {subtitle && <p className="mt-1.5 text-body-md text-muted">{subtitle}</p>}

          <div className="mt-7">{children}</div>
        </div>
      </main>
    </div>
  );
}
