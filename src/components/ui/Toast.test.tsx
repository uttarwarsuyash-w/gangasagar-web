import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from './Toast';

function Buttons() {
  const toast = useToast();
  return (
    <>
      <button onClick={() => toast.success('Saved')}>ok</button>
      <button onClick={() => toast.error('Could not save')}>bad</button>
    </>
  );
}

describe('Toast', () => {
  it('shows success and error messages and can be dismissed', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider closeLabel="Close">
        <Buttons />
      </ToastProvider>,
    );
    await user.click(screen.getByText('ok'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved');
    await user.click(screen.getByText('bad'));
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save');
    await user.click(screen.getAllByRole('button', { name: 'Close' })[0]);
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });
});
