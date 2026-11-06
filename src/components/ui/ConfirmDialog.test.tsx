import { describe, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

function Harness({ onConfirm = vi.fn() }: { onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Open it</button>
      <ConfirmDialog
        open={open}
        title="Delete product?"
        message="This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        closeLabel="Close"
        onConfirm={() => {
          onConfirm();
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
      />
    </div>
  );
}

describe('ConfirmDialog', () => {
  it('closes on Escape and returns focus to the opener', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open it' });
    await user.click(opener);
    expect(screen.getByRole('dialog', { name: 'Delete product?' })).toBeInTheDocument();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on an outside click and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Open it' });
    await user.click(opener);
    await user.click(screen.getByTestId('dialog-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('closes on its close button', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open it' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not close when clicking inside', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open it' }));
    await user.click(screen.getByText('This cannot be undone.'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('traps Tab focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open it' }));
    const dialog = screen.getByRole('dialog');
    for (let i = 0; i < 6; i++) {
      await user.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true });
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it('calls onConfirm', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<Harness onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Open it' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
