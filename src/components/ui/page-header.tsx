import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { cn } from '@/lib/utils';

/**
 * Page title block: breadcrumb or eyebrow, heading, supporting line and a
 * right-aligned action cluster. `titleSize` lets a screen use the design's
 * smaller headline-lg where the export specifies it.
 */
export function PageHeader({
  eyebrow,
  breadcrumb,
  title,
  titleSize = 'display',
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  breadcrumb?: string[];
  title: string;
  titleSize?: 'display' | 'headline';
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between', className)}>
      <div className="flex max-w-3xl flex-col gap-1">
        {breadcrumb && (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-label-sm text-muted">
            {breadcrumb.map((crumb, index) => (
              <span key={crumb} className="flex items-center gap-2">
                {index > 0 && <Icon name="chevron_right" className="text-[14px]" />}
                <span className={index === breadcrumb.length - 1 ? 'font-semibold text-secondary' : ''}>
                  {crumb}
                </span>
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <div className="flex items-center gap-1.5 text-label-sm uppercase tracking-wider text-muted">
            {eyebrow}
          </div>
        )}

        <h1
          className={cn(
            'tracking-tight text-on-surface',
            titleSize === 'display' ? 'text-display-lg' : 'text-headline-lg',
          )}
        >
          {title}
        </h1>

        {description && <p className="text-body-md text-muted">{description}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  );
}
