import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type StageState = 'pending' | 'active' | 'done' | 'error';
type StageTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
type EditorMode = 'sandbox' | 'live';

/** What the page's ping request settled on, scoped to one gateway. */
export interface GatewayPingFeedback {
  gateway: string;
  mode?: EditorMode;
  status: string;
  message: string;
  latency_ms?: number;
}

interface Stage {
  key: string;
  title: string;
  state: StageState;
  body: ReactNode;
}

const modeLabels: Record<EditorMode, string> = { sandbox: 'Sandbox', live: 'Live' };

const stageStateLabels: Record<StageState, string> = {
  pending: 'Waiting',
  active: 'In progress',
  done: 'Complete',
  error: 'Failed',
};

const stageStateTones: Record<StageState, StageTone> = {
  pending: 'neutral',
  active: 'info',
  done: 'success',
  error: 'danger',
};

/** Everything inside the panel that can hold focus, for the Tab trap. */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true',
  );
}

/**
 * One probe answer as the console understands it. `unconfigured` is a failed
 * probe too: the provider never saw a request.
 */
function describeStatus(status: string): { tone: StageTone; label: string; state: StageState } {
  switch (status) {
    case 'connected':
      return { tone: 'success', label: 'Connected', state: 'done' };
    case 'error':
      return { tone: 'danger', label: 'Failed', state: 'error' };
    case 'unconfigured':
      return { tone: 'warning', label: 'Not configured', state: 'error' };
    default:
      return { tone: 'neutral', label: status || 'Unknown', state: 'done' };
  }
}

function StageMarker({ state, index }: { state: StageState; index: number }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-label-sm font-bold transition-all duration-300',
        state === 'done' && 'border-secondary bg-secondary text-on-secondary',
        state === 'active' && 'border-secondary bg-forest-soft text-secondary',
        state === 'error' && 'border-error bg-error text-on-error',
        state === 'pending' && 'border-outline-variant/60 bg-surface-container-low text-muted',
      )}
    >
      {state === 'active' && (
        <span className="absolute inset-0 animate-ping rounded-full border-2 border-secondary/40" />
      )}
      {state === 'done' ? (
        <Icon name="check" className="text-[18px]" />
      ) : state === 'error' ? (
        <Icon name="error" className="text-[16px]" />
      ) : state === 'active' ? (
        <Icon name="sync" className="animate-spin text-[16px]" />
      ) : (
        <span>{index + 1}</span>
      )}
    </span>
  );
}

/**
 * Right-side drawer that reports one gateway ping: it opens as the request goes
 * out, then shows what the provider answered (status, latency, message). Styled
 * and behaved like `SandboxPaymentDrawer`: fade overlay, slide-in panel, focus
 * in/trap/restore, Escape and backdrop close.
 */
export function GatewayPingDrawer({
  open,
  gatewayName,
  mode,
  testing,
  feedback,
  onClose,
}: {
  open: boolean;
  gatewayName: string;
  mode?: EditorMode;
  testing: boolean;
  feedback: GatewayPingFeedback | null;
  onClose: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const isOpen = open && Boolean(gatewayName);

  // Slide the panel in after it mounts, so `translate-x-full` has a frame to transition from.
  useEffect(() => {
    if (!isOpen) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);

  // Focus management: move focus in on open, trap Tab, Escape closes, restore on exit.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    restoreTo.current = document.activeElement;
    const frame = requestAnimationFrame(() => panel.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current();
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
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      (restoreTo.current as HTMLElement | null)?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const result = feedback ? describeStatus(feedback.status) : null;
  const connectState: StageState = feedback ? 'done' : testing ? 'active' : 'pending';
  const responseState: StageState = result ? result.state : 'pending';

  const stages: Stage[] = [
    {
      key: 'connect',
      title: `Connecting to ${gatewayName}`,
      state: connectState,
      body: (
        <p className="text-body-sm leading-relaxed text-muted">
          {connectState === 'active'
            ? `Sending the probe with the stored ${mode ? `${modeLabels[mode].toLowerCase()} ` : ''}credentials…`
            : connectState === 'done'
              ? `The probe reached ${gatewayName}. ${mode ? `Only the ${modeLabels[mode].toLowerCase()} credential set was used.` : ''}`.trim()
              : 'Waiting to start.'}
        </p>
      ),
    },
    {
      key: 'response',
      title: 'Provider response',
      state: responseState,
      body: feedback ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={result!.tone}>{result!.label}</Badge>
            {typeof feedback.latency_ms === 'number' && (
              <span className="text-body-xs font-semibold text-muted">{feedback.latency_ms} ms</span>
            )}
          </div>
          <p className="text-body-sm leading-relaxed text-on-surface">{feedback.message}</p>
        </div>
      ) : (
        <p className="text-body-sm leading-relaxed text-muted">
          {testing ? 'Waiting for the provider to answer…' : 'No response yet.'}
        </p>
      ),
    },
  ];

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-end bg-inverse-surface/40 backdrop-blur-[2px] transition-opacity duration-300',
        entered ? 'opacity-100' : 'opacity-0',
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
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'flex h-full w-full max-w-md flex-col border-l border-outline-variant/40 bg-surface p-5 shadow-2xl outline-none transition-transform duration-300 ease-out sm:p-6',
          entered ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-outline-variant/30 pb-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-headline-sm font-bold text-on-surface">
                Gateway ping — {gatewayName}
              </h2>
              {mode && <Badge tone={mode === 'live' ? 'success' : 'warning'}>{modeLabels[mode]}</Badge>}
            </div>
            <p className="text-body-sm leading-relaxed text-muted">
              One probe with the stored credentials. Nothing is saved or charged.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close gateway ping drawer"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-sage-soft hover:text-on-surface"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <ol aria-label="Gateway ping progress" className="flex flex-col">
            {stages.map((stage, index) => (
              <li
                key={stage.key}
                data-stage={stage.key}
                data-state={stage.state}
                aria-current={stage.state === 'active' ? 'step' : undefined}
                className="relative flex gap-3"
              >
                {index < stages.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-4 top-8 h-[calc(100%-2rem)] w-0.5 -translate-x-1/2 overflow-hidden rounded-full bg-outline-variant/40"
                  >
                    <span
                      className={cn(
                        'block h-full w-full origin-top bg-secondary transition-transform duration-500 ease-out',
                        stage.state === 'done' ? 'scale-y-100' : 'scale-y-0',
                      )}
                    />
                  </span>
                )}

                <StageMarker state={stage.state} index={index} />

                <div className="flex min-w-0 flex-1 flex-col gap-1 pb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        'text-label-lg font-bold',
                        stage.state === 'error'
                          ? 'text-tertiary'
                          : stage.state === 'pending'
                            ? 'text-muted'
                            : 'text-on-surface',
                      )}
                    >
                      {stage.title}
                    </span>
                    <Badge tone={stageStateTones[stage.state]}>{stageStateLabels[stage.state]}</Badge>
                  </div>
                  {stage.body}
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-outline-variant/30 pt-4">
          <p role="status" aria-live="polite" className="text-body-xs text-muted">
            {testing
              ? 'Gateway ping status: connecting.'
              : result
                ? `Gateway ping status: ${result.label.toLowerCase()}.`
                : 'Gateway ping status: starting.'}
          </p>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
