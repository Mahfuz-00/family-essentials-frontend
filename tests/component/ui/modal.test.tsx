import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from '@/components/ui/modal';

describe('Modal', () => {
  it('renders nothing while closed', () => {
    render(
      <Modal open={false} onClose={() => {}} title="Add a request">
        body
      </Modal>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('exposes a labelled, modal dialog when open', () => {
    render(
      <Modal open onClose={() => {}} title="Add a request" description="Capture what the family needs.">
        body
      </Modal>,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleName('Add a request');
    expect(screen.getByText('Capture what the family needs.')).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} title="Add a request">
        body
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalled();
  });

  it('closes when the backdrop is clicked but not when the panel is', async () => {
    const onClose = vi.fn();

    const { container } = render(
      <Modal open onClose={onClose} title="Add a request">
        <p>panel content</p>
      </Modal>,
    );

    await userEvent.click(screen.getByText('panel content'));
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = container.firstElementChild as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers a named close button', async () => {
    const onClose = vi.fn();

    render(
      <Modal open onClose={onClose} title="Add a request">
        body
      </Modal>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Close dialog' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('returns focus to the trigger when it closes', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)}>Open dialog</button>
          <Modal open={open} onClose={() => setOpen(false)} title="Add a request">
            body
          </Modal>
        </>
      );
    }

    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    await userEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps Tab inside the dialog, cycling through its controls', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button onClick={() => setOpen(true)}>Open dialog</button>
          <Modal
            open={open}
            onClose={() => setOpen(false)}
            title="Add a request"
            footer={<button type="button">Save</button>}
          >
            <input aria-label="What does the family need?" />
          </Modal>
        </>
      );
    }

    render(<Harness />);

    await userEvent.click(screen.getByRole('button', { name: 'Open dialog' }));

    const dialog = screen.getByRole('dialog');
    const close = screen.getByRole('button', { name: 'Close dialog' });
    const field = screen.getByLabelText('What does the family need?');
    const save = screen.getByRole('button', { name: 'Save' });

    // Focus starts on the panel, so the first Tab lands on the first control.
    expect(dialog).toHaveFocus();
    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.tab();
    expect(field).toHaveFocus();

    await userEvent.tab();
    expect(save).toHaveFocus();

    // Past the last control it wraps, rather than walking out behind the backdrop.
    await userEvent.tab();
    expect(close).toHaveFocus();
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'Open dialog' }));
  });

  it('cycles backwards from the first control to the last', async () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Add a request"
        footer={<button type="button">Save</button>}
      >
        <input aria-label="What does the family need?" />
      </Modal>,
    );

    const close = screen.getByRole('button', { name: 'Close dialog' });
    const save = screen.getByRole('button', { name: 'Save' });

    await userEvent.tab();
    expect(close).toHaveFocus();

    await userEvent.tab({ shift: true });
    expect(save).toHaveFocus();
  });
});
