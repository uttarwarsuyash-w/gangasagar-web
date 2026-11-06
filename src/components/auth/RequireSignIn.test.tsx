import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeSupabaseMock } from '@/test/supabase-mock';
import { getDictionary } from '@/i18n/get-dictionary';

let mock = makeSupabaseMock();
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => mock }));

import { SessionProvider } from '@/lib/auth/session';
import { RequireSignIn } from './RequireSignIn';

const renderIt = () =>
  render(
    <SessionProvider>
      <RequireSignIn lang="en">
        <p>checkout form</p>
      </RequireSignIn>
    </SessionProvider>,
  );

describe('RequireSignIn', () => {
  it('shows a Google sign-in prompt with no user', async () => {
    mock = makeSupabaseMock({ user: null });
    renderIt();
    const button = await screen.findByRole('button', { name: getDictionary('en').auth.signInWithGoogle });
    expect(screen.queryByText('checkout form')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'google' }),
    );
  });

  it('shows its children when signed in', async () => {
    mock = makeSupabaseMock({ user: { id: 'u1', email: 'a@example.com' } });
    renderIt();
    expect(await screen.findByText('checkout form')).toBeInTheDocument();
  });
});
