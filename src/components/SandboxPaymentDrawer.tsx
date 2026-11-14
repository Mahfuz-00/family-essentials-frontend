import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, apiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { SandboxInvoice, SandboxPaymentSession, SandboxPaymentStatus } from '@/types';

/** How often the console asks the provider whether the sandbox payment landed. */
const POLL_INTERVAL_MS = 4_000;
/** Hard stop after ten minutes so an abandoned drawer stops hitting the provider. */
const POLL_CAP_MS = 10 * 60 * 1000;
/** Paddle.js v2 bundle: it renders the checkout overlay inside this page. */
const PADDLE_SCRIPT_SRC = 'https://cdn.paddle.com/paddle/v2/paddle.js';

/** The slice of the Paddle.js global this drawer calls. */
interface PaddleGlobal {
  Environment?: { set?: (environment: 'sandbox' | 'production') => void };
  Initialize?: (options: { token: string }) => void;
  Checkout?: {
    open?: (options: { transactionId: string; settings?: { successUrl?: string } }) => void;
  };
}

declare global {
  interface Window {
    Paddle?: PaddleGlobal;
  }
}

/** One script tag and one Initialize per page load; Paddle errors on a second call. */
let paddleScript: Promise<PaddleGlobal> | null = null;
let paddleInitialized = false;

function loadPaddle(): Promise<PaddleGlobal> {
  if (window.Paddle) {
    return Promise.resolve(window.Paddle);
  }
  if (paddleScript) {
    return paddleScript;
  }

  paddleScript = new Promise<PaddleGlobal>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = PADDLE_SCRIPT_SRC;
    script.async = true;
    script.addEventListener('load', () => {
      if (window.Paddle) {
        resolve(window.Paddle);
        return;
      }
      paddleScript = null;
      reject(new Error('Paddle.js loaded but did not expose the Paddle global.'));
    });
    script.addEventListener('error', () => {
      paddleScript = null;
      reject(new Error('Could not load Paddle.js from its CDN.'));
    });
    document.head.appendChild(script);
  });

  return paddleScript;
}

/**
 * Opens the Paddle.js checkout overlay for one sandbox transaction. Paddle's
 * hosted checkout link points at a default page this app does not serve, so the
 * overlay is the only usable entry point: it renders on this page and sends the
 * browser to the session's result page once the payment settles.
 */
async function openPaddleCheckout(
  session: SandboxPaymentSession,
  clientToken: string,
): Promise<void> {
  const paddle = await loadPaddle();

  // The drawer only ever starts sandbox payments. Optional so an older bundle
  // without Environment still opens the checkout.
  paddle.Environment?.set?.('sandbox');

  if (!paddleInitialized) {
    if (!paddle.Initialize) {
      throw new Error('Paddle.js did not expose Initialize.');
    }
    paddle.Initialize({ token: clientToken });
    paddleInitialized = true;
  }

  const open = paddle.Checkout?.open;
  if (!open) {
    throw new Error('Paddle.js did not expose Checkout.open.');
  }

  // The result URL already carries `?gateway=paddle`, so the flow flag appends.
  const successUrl = session.result_url ? `${session.result_url}&flow=success` : undefined;
  open.call(paddle.Checkout, {
    transactionId: session.reference,
    ...(successUrl ? { settings: { successUrl } } : {}),
  });
}


type StageState = 'pending' | 'active' | 'done' | 'error';
type StageTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info';

interface Stage {
  key: string;
  title: string;
  state: StageState;
  body?: ReactNode;
}

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

/** The 422 "unconfigured" answer means the stored sandbox credentials are incomplete. */
function isUnconfiguredError(error: unknown): boolean {
  const response = (error as { response?: { status?: number; data?: { status?: string } } })?.response;
  return response?.status === 422 || response?.data?.status === 'unconfigured';
}

function formatAmount(amountCents: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountCents / 100);
  } catch {
    return `${(amountCents / 100).toFixed(2)} ${currency}`;
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
 * Right-side drawer that runs a real sandbox payment for one gateway: it starts a
 * checkout session, shows the hosted page, then polls the provider until the
 * payment is confirmed (or fails). The stepper animates as each stage settles.
 *
 * Polling lives in a react-query observer keyed on the session reference, so
 * closing or unmounting the drawer stops it without manual interval bookkeeping.
 */
export function SandboxPaymentDrawer({
  open,
  gateway,
  gatewayName,
  onClose,
}: {
  open: boolean;
  gateway: string;
  gatewayName: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<Element | null>(null);
  const closeRef = useRef(onClose);
  const startedAt = useRef(0);
  const startedFor = useRef<string | null>(null);

  const [entered, setEntered] = useState(false);
  const [expired, setExpired] = useState(false);
  const [simulatedStage, setSimulatedStage] = useState<'checkout' | 'confirming' | 'paid'>('checkout');
  const [invoiceStepDone, setInvoiceStepDone] = useState(false);
  /** Failure from loading, initialising or opening the Paddle.js overlay. */
  const [paddleError, setPaddleError] = useState<string | null>(null);
  const [paddleOpening, setPaddleOpening] = useState(false);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  const startMutation = useMutation({
    mutationFn: async (target: string) =>
      (
        await api.post<{ data: SandboxPaymentSession }>(
          `/v1/platform/settings/payment/${target}/sandbox-payment`,
        )
      ).data.data,
  });

  const { mutate: startSandboxPayment, reset: resetStart } = startMutation;

  // One create call per opening, even if the parent re-renders while it is in flight.
  useEffect(() => {
    if (!open) {
      startedFor.current = null;
      setEntered(false);
      return;
    }

    if (startedFor.current === gateway) {
      return;
    }

    startedFor.current = gateway;
    startedAt.current = Date.now();
    setExpired(false);
    setPaddleError(null);
    setSimulatedStage('checkout');
    resetStart();
    startSandboxPayment(gateway);
  }, [open, gateway, startSandboxPayment, resetStart]);

  // Slide the panel in after it mounts, so `translate-x-full` has a frame to transition from.
  useEffect(() => {
    if (!open) {
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const session = startMutation.data;
  const reference = session?.reference;

  /** Open Paddle's overlay on this page; its completion lands on the result page. */
  const openPaddleOverlay = async () => {
    const clientToken = session?.client_token;
    if (!session || !clientToken) {
      return;
    }

    setPaddleOpening(true);
    setPaddleError(null);
    try {
      await openPaddleCheckout(session, clientToken);
    } catch (error) {
      setPaddleError(
        error instanceof Error && error.message
          ? error.message
          : 'Paddle checkout could not be opened. Retry to create a fresh session.',
      );
    } finally {
      setPaddleOpening(false);
    }
  };

  // Poll the provider until it settles the payment. The key is derived from the
  // stable gateway/reference pair, never from the clock.
  const statusQuery = useQuery({
    queryKey: ['platform', 'settings', 'payment', gateway, 'sandbox-payment', reference ?? 'none'],
    queryFn: async () => {
      if (!reference) {
        throw new Error('No sandbox payment reference.');
      }
      return (
        await api.get<{ data: SandboxPaymentStatus }>(
          `/v1/platform/settings/payment/${gateway}/sandbox-payment/${encodeURIComponent(reference)}`,
        )
      ).data.data;
    },
    enabled: open && Boolean(reference) && !session?.simulated,
    retry: false,
    refetchInterval: (query) => {
      const value = query.state.data?.status;
      if (value === 'paid' || value === 'failed') {
        return false;
      }
      if (Date.now() - startedAt.current >= POLL_CAP_MS) {
        return false;
      }
      return POLL_INTERVAL_MS;
    },
  });

  // A separate timer surfaces the ten-minute cap to the UI, since the interval
  // simply stops without a render of its own.
  useEffect(() => {
    if (!open || !session || session.simulated) {
      return;
    }
    const timer = setTimeout(() => setExpired(true), POLL_CAP_MS);
    return () => clearTimeout(timer);
  }, [open, session]);

  // The internal simulator has no checkout page: walk it through the stages itself.
  useEffect(() => {
    if (!open || !session?.simulated || simulatedStage === 'paid') {
      return;
    }
    const timer = setTimeout(
      () => setSimulatedStage((previous) => (previous === 'checkout' ? 'confirming' : 'paid')),
      simulatedStage === 'checkout' ? 900 : 1400,
    );
    return () => clearTimeout(timer);
  }, [open, session, simulatedStage]);

  // The invoice is part of the flow, but it should read as a distinct step after
  // the provider confirms. Give it a short beat so that step animates in.
  const isPaid =
    statusQuery.data?.status === 'paid' || (Boolean(session?.simulated) && simulatedStage === 'paid');

  useEffect(() => {
    if (!open || !isPaid) {
      setInvoiceStepDone(false);
      return;
    }
    const timer = setTimeout(() => setInvoiceStepDone(true), 700);
    return () => clearTimeout(timer);
  }, [open, isPaid]);

  // Focus management: move focus in on open, trap Tab, Escape closes, restore on exit.
  useEffect(() => {
    if (!open) {
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
  }, [open]);

  if (!open) {
    return null;
  }

  const unconfigured = isUnconfiguredError(startMutation.error);
  const creating = startMutation.isPending;
  const simulatedPaid = Boolean(session?.simulated) && simulatedStage === 'paid';
  const status: SandboxPaymentStatus['status'] | undefined = session
    ? simulatedPaid
      ? 'paid'
      : session.simulated
        ? 'pending'
        : statusQuery.data?.status
    : undefined;

  const polled = session?.simulated ? simulatedStage !== 'checkout' : statusQuery.data !== undefined;
  const paid = isPaid;
  const failed = status === 'failed';
  const providerMessage = session?.simulated
    ? simulatedPaid
      ? 'The internal mock gateway settled the payment.'
      : 'The internal mock gateway is settling the payment…'
    : statusQuery.data?.message;

  // The invoice is display-only: it is generated for the flow and cached server-side,
  // never written to the billing ledger. It is shown once the payment is confirmed.
  const invoice: SandboxInvoice | null = session?.simulated
    ? session.invoice
      ? {
          ...session.invoice,
          status: paid ? 'paid' : session.invoice.status,
          paid_at: paid ? session.invoice.paid_at ?? new Date().toISOString() : session.invoice.paid_at,
        }
      : null
    : statusQuery.data?.invoice ?? session?.invoice ?? null;

  const credentialsState: StageState = creating
    ? 'active'
    : startMutation.isError
      ? unconfigured
        ? 'error'
        : 'done'
      : session
        ? 'done'
        : 'pending';

  const sessionState: StageState = session
    ? 'done'
    : startMutation.isError && !unconfigured
      ? 'error'
      : 'pending';

  const checkoutState: StageState = !session
    ? 'pending'
    : paid || failed
      ? 'done'
      : session.simulated
        ? simulatedStage === 'checkout'
          ? 'active'
          : 'done'
        : polled
          ? 'done'
          : 'active';

  const confirmingState: StageState = !session
    ? 'pending'
    : paid || failed
      ? 'done'
      : statusQuery.isError
        ? 'error'
        : session.simulated
          ? simulatedStage === 'confirming'
            ? 'active'
            : 'pending'
          : polled
            ? 'active'
            : 'pending';

  const invoiceState: StageState = !session
    ? 'pending'
    : paid
      ? invoiceStepDone
        ? 'done'
        : 'active'
      : 'pending';

  const resultState: StageState = !session
    ? 'pending'
    : paid
      ? 'done'
      : failed
        ? 'error'
        : 'pending';

  const retryable = startMutation.isError || failed || expired || statusQuery.isError;

  const retry = () => {
    startedAt.current = Date.now();
    setExpired(false);
    setPaddleError(null);
    setSimulatedStage('checkout');
    resetStart();
    startSandboxPayment(gateway);
  };

  const stages: Stage[] = [
    {
      key: 'credentials',
      title: 'Sandbox credentials',
      state: credentialsState,
      body: (
        <p className="text-body-sm leading-relaxed text-muted">
          {credentialsState === 'active'
            ? 'Validating the stored sandbox credentials…'
            : credentialsState === 'error'
              ? 'The stored sandbox credentials are incomplete. Add the missing fields on the gateway card and retry.'
              : credentialsState === 'done'
                ? 'Sandbox credentials resolved. Live credentials are not touched.'
                : 'Waiting for validation.'}
        </p>
      ),
    },
    {
      key: 'session',
      title: 'Checkout session',
      state: sessionState,
      body: session ? (
        <p className="text-body-sm leading-relaxed text-muted">
          Reference <code className="break-all font-mono text-body-xs text-on-surface">{session.reference}</code>
        </p>
      ) : (
        <p className="text-body-sm leading-relaxed text-muted">
          {creating ? 'Waiting for the sandbox credentials before creating the session.' : 'Not started yet.'}
        </p>
      ),
    },
    {
      key: 'checkout',
      title: 'Complete the payment',
      state: checkoutState,
      body: session ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-sage-soft px-2 py-1 font-mono text-label-md font-bold text-secondary">
              {formatAmount(session.amount_cents, session.currency)} {session.currency}
            </span>
            <Badge tone="warning">Sandbox · test funds</Badge>
          </div>
          {session.simulated ? (
            <p className="text-body-sm leading-relaxed text-muted">
              No hosted checkout: the internal simulator settles this payment on its own.
            </p>
          ) : session.gateway === 'paddle' ? (
            session.client_token ? (
              <>
                <Button
                  size="sm"
                  variant="primary"
                  className="w-fit"
                  disabled={paddleOpening}
                  onClick={() => void openPaddleOverlay()}
                >
                  <Icon name="open_in_new" className="text-[16px]" />
                  {paddleOpening ? 'Opening Paddle checkout…' : 'Open Paddle checkout'}
                </Button>
                <p className="text-body-xs leading-relaxed text-muted">
                  Paddle opens as an overlay on this page; pay with a sandbox test card and this drawer confirms the
                  payment automatically.
                </p>
                {paddleError && <Alert tone="error">{paddleError}</Alert>}
              </>
            ) : (
              <Alert tone="warning">
                Paddle needs a client-side token before the overlay checkout can open. Add it on the Paddle gateway
                card, then retry to create a fresh session.
              </Alert>
            )
          ) : session.url ? (
            <>
              <Button
                size="sm"
                variant="primary"
                className="w-fit"
                onClick={() => window.open(session.url ?? '', '_blank', 'noopener,noreferrer')}
              >
                <Icon name="open_in_new" className="text-[16px]" />
                Open checkout page
              </Button>
              <p className="text-body-xs leading-relaxed text-muted">
                Pay with the provider&apos;s sandbox test card in the new tab; this drawer confirms it automatically.
              </p>
            </>
          ) : (
            <p className="text-body-sm leading-relaxed text-muted">
              The provider did not return a checkout URL. Retry to create a new session.
            </p>
          )}
        </div>
      ) : (
        <p className="text-body-sm leading-relaxed text-muted">Waiting for the checkout session.</p>
      ),
    },
    {
      key: 'confirming',
      title: 'Confirming payment',
      state: confirmingState,
      body: (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm leading-relaxed text-muted">
            {confirmingState === 'active'
              ? `Checking ${gatewayName} every 4 seconds…`
              : confirmingState === 'done'
                ? 'The provider has answered.'
                : confirmingState === 'error'
                  ? 'The last status check failed. Polling continues; retry to start over.'
                  : 'Starts once the checkout session exists.'}
          </p>
          {providerMessage && confirmingState !== 'error' && (
            <p className="text-body-sm leading-relaxed text-on-surface">{providerMessage}</p>
          )}
          {statusQuery.isError && <Alert tone="error">{apiError(statusQuery.error)}</Alert>}
          {expired && !paid && !failed && (
            <Alert tone="warning">
              Still waiting after ten minutes. Polling stopped — retry to create a fresh sandbox payment.
            </Alert>
          )}
        </div>
      ),
    },
    {
      key: 'invoice',
      title: invoiceState === 'done' ? 'Invoice generated' : 'Generating invoice',
      state: invoiceState,
      body: (
        <div className="flex flex-col gap-2">
          <p className="text-body-sm leading-relaxed text-muted">
            {invoiceState === 'active'
              ? 'Generating the sandbox invoice…'
              : invoiceState === 'done'
                ? `Invoice ${invoice?.invoice_number ?? ''} generated for this sandbox payment.`
                : 'Starts once the provider confirms the payment.'}
          </p>
          {invoiceState === 'done' && invoice && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-sage-soft px-2 py-1 font-mono text-label-sm font-bold text-secondary">
                {invoice.invoice_number}
              </span>
              {session?.result_url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => window.location.assign(session.result_url ?? '')}
                >
                  <Icon name="receipt_long" className="text-[16px]" />
                  View invoice
                </Button>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'result',
      title: failed ? 'Payment failed' : paid ? 'Payment confirmed' : 'Awaiting confirmation',
      state: resultState,
      body: (
        <p className="text-body-sm leading-relaxed text-muted">
          {paid
            ? `The sandbox payment was confirmed${providerMessage ? `: ${providerMessage}` : '.'}`
            : failed
              ? providerMessage ?? `${gatewayName} reported that the sandbox payment failed.`
              : startMutation.isError
                ? 'The checkout session could not be created, so no payment was taken.'
                : 'This drawer updates as soon as the provider confirms the payment.'}
        </p>
      ),
    },
  ];

  const activeStage = stages.find((stage) => stage.state === 'active');

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
                Sandbox payment — {gatewayName}
              </h2>
              <Badge tone="warning">Sandbox</Badge>
            </div>
            <p className="text-body-sm leading-relaxed text-muted">
              Test checkout with sandbox credentials only. No real money moves.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close sandbox payment drawer"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-sage-soft hover:text-on-surface"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
          <ol aria-label="Sandbox payment progress" className="flex flex-col">
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

          {startMutation.isError && !unconfigured && <Alert tone="error">{apiError(startMutation.error)}</Alert>}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between gap-2 border-t border-outline-variant/30 pt-4">
          <p role="status" aria-live="polite" className="text-body-xs text-muted">
            {paid
              ? 'Sandbox payment status: confirmed.'
              : failed
                ? 'Sandbox payment status: failed.'
                : activeStage
                  ? `Sandbox payment status: ${activeStage.title.toLowerCase()}.`
                  : 'Sandbox payment status: starting.'}
          </p>
          <div className="flex items-center gap-2">
            {retryable && (
              <Button size="sm" variant="outline" onClick={retry}>
                <Icon name="refresh" className="text-[16px]" />
                Retry
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
