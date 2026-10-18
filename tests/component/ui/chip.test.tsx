import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StaticChip } from '@/components/ui/chip';
import { Badge } from '@/components/ui/badge';

/**
 * Only the read-only pill is left: the interactive `Chip` button had no
 * consumer, and the filter pills each page builds carry their own pressed state.
 */
describe('StaticChip', () => {
  it('carries the tone colour for each priority', () => {
    const { rerender } = render(<StaticChip tone="normal">Normal</StaticChip>);
    expect(screen.getByText('Normal')).toHaveClass('bg-sage-soft');

    rerender(<StaticChip tone="urgent">Urgent</StaticChip>);
    expect(screen.getByText('Urgent')).toHaveClass('bg-coral-soft');

    rerender(<StaticChip tone="low">Low</StaticChip>);
    expect(screen.getByText('Low')).toHaveClass('bg-surface-container-low');
  });

  it('renders a leading dot only when asked, so colour is never the only signal', () => {
    const { container, rerender } = render(<StaticChip dot>Due</StaticChip>);
    expect(container.querySelectorAll('span.h-1\\.5')).toHaveLength(1);

    rerender(<StaticChip>Due</StaticChip>);
    expect(container.querySelectorAll('span.h-1\\.5')).toHaveLength(0);
  });

  it('does not render a button: it is a label, not a control', () => {
    render(<StaticChip>Read only</StaticChip>);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Badge', () => {
  it('renders status text alongside its colour', () => {
    render(<Badge tone="danger">suspended</Badge>);

    const badge = screen.getByText('suspended');
    expect(badge).toHaveClass('bg-coral-soft');
    expect(badge.textContent).toBe('suspended');
  });
});
