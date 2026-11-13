import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Everything inside a dialog that can hold focus. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * Slide-over overlay on the right side: blurred backdrop, focus moved in on
 * open and trapped there, Escape and backdrop-click close, focus returned to
 * the trigger. Supports expansive forms with maximum vertical and horizontal space.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  position = 'right',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  position?: 'right' | 'center';
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);
  const close = useRef(onClose);

  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    restoreTo.current = document.activeElement;
    panel.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const root = panel.current;
      if (!root) {
        return;
      }

      const stops = focusableWithin(root);
      if (stops.length === 0) {
        event.preventDefault();
        root.focus();
        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const index = current ? stops.indexOf(current) : -1;

      const next =
        index === -1
          ? stops[event.shiftKey ? stops.length - 1 : 0]
          : stops[event.shiftKey ? (index - 1 + stops.length) % stops.length : (index + 1) % stops.length];

      event.preventDefault();
      next.focus();
    };

    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      (restoreTo.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-[4px] transition-opacity duration-200',
        position === 'right' ? 'flex justify-end' : 'flex items-center justify-center p-4',
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          position === 'right'
            ? 'h-full w-full max-w-lg sm:max-w-xl md:max-w-2xl flex flex-col bg-surface p-6 sm:p-8 shadow-2xl outline-none border-l border-outline-variant/40 animate-in slide-in-from-right duration-300'
            : 'w-full max-w-lg max-h-[88vh] flex flex-col rounded-3xl bg-surface p-6 shadow-e2 outline-none',
          className,
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-outline-variant/30 pb-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-on-surface">{title}</h2>
            {description && <p className="text-sm text-muted leading-relaxed">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-sage-soft hover:text-on-surface"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {children && <div className="mt-5 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-2 py-1">{children}</div>}
        {footer && (
          <div className="mt-6 shrink-0 flex items-center justify-end gap-3 border-t border-outline-variant/30 pt-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
