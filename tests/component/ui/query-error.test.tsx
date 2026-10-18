import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QueryError } from '@/components/ui/query-error';

vi.mock('@/lib/api', () => ({
  api: {},
  apiError: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
}));

describe('QueryError', () => {
  it('shows what the API said rather than an empty state', () => {
    render(<QueryError error={new Error('Server Error')} />);

    expect(screen.getByText('Server Error')).toBeInTheDocument();
  });

  it('offers a retry that reloads the failed query', async () => {
    const onRetry = vi.fn();

    render(<QueryError error={new Error('Server Error')} onRetry={onRetry} what="the roster" />);

    const retry = screen.getByRole('button', { name: /try again/i });
    // The section it reloads is part of the accessible name, so a screen with
    // two failed queries still has two distinguishable buttons.
    expect(retry).toHaveAccessibleName(/the roster/);

    await userEvent.click(retry);

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the message without a retry when the caller has none', () => {
    render(<QueryError error={new Error('Server Error')} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
