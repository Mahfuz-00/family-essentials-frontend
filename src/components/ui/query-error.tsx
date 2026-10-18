import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { apiError } from '@/lib/api';

/**
 * The error state for a failed query: what the API said, and a way to ask again.
 *
 * Pages used to branch on `isLoading` alone, so a request that failed rendered
 * as an empty list or a row of zeros — good news the server never sent. Every
 * query a screen depends on renders this instead of its empty state.
 *
 * `what` names the section the retry reloads, so a screen with more than one
 * failed query still gives each button a distinct accessible name.
 */
export function QueryError({
  error,
  onRetry,
  what,
}: {
  error: unknown;
  onRetry?: () => void;
  what?: string;
}) {
  return (
    <Alert>
      <span className="flex flex-wrap items-center justify-between gap-3">
        <span>{apiError(error)}</span>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 bg-surface/70 text-tertiary hover:bg-surface"
            onClick={onRetry}
          >
            Try again
            {what && <span className="sr-only"> — reload {what}</span>}
          </Button>
        )}
      </span>
    </Alert>
  );
}
