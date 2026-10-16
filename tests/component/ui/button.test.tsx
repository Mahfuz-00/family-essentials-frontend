import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders its label and is a real button element', () => {
    render(<Button>Save &amp; notify</Button>);

    expect(screen.getByRole('button', { name: 'Save & notify' })).toBeInTheDocument();
  });

  it('does not submit a surrounding form unless asked to', async () => {
    const onSubmit = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <Button>Cancel</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('still submits when given type="submit"', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Button type="submit">Sign in</Button>
      </form>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('uses the deep forest teal fill for the primary action', () => {
    render(<Button>Primary</Button>);

    expect(screen.getByRole('button', { name: 'Primary' })).toHaveClass('bg-secondary');
  });

  it('uses the soft sage fill for the secondary action', () => {
    render(<Button variant="soft">Soft</Button>);

    expect(screen.getByRole('button', { name: 'Soft' })).toHaveClass('bg-sage-soft');
  });

  it('scales the control with the size prop', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('h-8');

    rerender(<Button size="xl">Large</Button>);
    expect(screen.getByRole('button', { name: 'Large' })).toHaveClass('h-12');
  });

  it('can be disabled and reports it to assistive technology', async () => {
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Provisioning…
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Provisioning…' });
    expect(button).toBeDisabled();

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('merges caller classes without losing the variant treatment', () => {
    render(<Button className="w-full">Full width</Button>);

    const button = screen.getByRole('button', { name: 'Full width' });
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('bg-secondary');
  });
});
