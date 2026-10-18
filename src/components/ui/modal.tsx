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
 * Overlay on the attention plane: blurred slate backdrop, focus moved in on
 * open and trapped there, Escape and backdrop-click close, focus returned to
 * the trigger. (DESIGN.md Level 4 + accessibility floor.)
 *
 * Tab is cycled inside the panel by hand: moving focus in and restoring it was
 * not enough, because Tab walked straight out into the page behind the
 * backdrop and left the dialog open but unreachable.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);
  const close = useRef(onClose);

  // `onClose` is usually an inline arrow, so it is a new function on every
  // render of the screen that owns the modal. Keeping it in a ref lets the
  // effect below depend on `open` alone: previously it re-ran on every
  // keystroke, re-focusing the panel and swallowing the rest of the input.
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
        // Nothing to cycle through: keep the focus on the dialog itself.
        event.preventDefault();
        root.focus();

        return;
      }

      const current = document.activeElement as HTMLElement | null;
      const index = current ? stops.indexOf(current) : -1;

      // Focus outside the panel (or still on the panel) enters at either end.
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 p-4 backdrop-blur-[4px]"
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
          'w-full max-w-lg rounded-3xl bg-surface p-6 shadow-e2 outline-none',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-headline-md text-on-surface">{title}</h2>
            {description && <p className="text-body-sm text-muted">{description}</p>}
          </div>
          <button
            type="button"
            aria-label="Close dialog"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-sage-soft hover:text-on-surface"
          >
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
