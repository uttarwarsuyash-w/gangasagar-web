import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { makeSupabaseMock } from '@/test/supabase-mock';
import { getDictionary } from '@/i18n/get-dictionary';

let mock = makeSupabaseMock();
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => mock }));

import { SessionProvider } from '@/lib/auth/session';
import { AdminGuard } from './AdminGuard';

const USER = { id: 'u1', email: 'someone@example.com' };
const renderGuard = () =>
  render(
    <SessionProvider>
      <AdminGuard lang="en">
        <p>secret admin page</p>
      </AdminGuard>
    </SessionProvider>,
  );

describe('AdminGuard', () => {
  it('shows the admins-only message when is_admin is false', async () => {
    mock = makeSupabaseMock({ user: USER, isAdmin: false });
    renderGuard();
    expect(await screen.findByText(getDictionary('en').auth.adminsOnly)).toBeInTheDocument();
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument();
    expect(mock.rpc).toHaveBeenCalledWith('is_admin');
  });

  it('shows its children when is_admin is true', async () => {
    mock = makeSupabaseMock({ user: USER, isAdmin: true });
    renderGuard();
    expect(await screen.findByText('secret admin page')).toBeInTheDocument();
  });

  it('shows a spinner while the check is pending', async () => {
    mock = makeSupabaseMock({ user: USER, isAdmin: new Promise<boolean>(() => {}) });
    renderGuard();
    await waitFor(() => expect(mock.rpc).toHaveBeenCalledWith('is_admin'));
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('secret admin page')).not.toBeInTheDocument();
  });

  it('asks a signed-out visitor to sign in', async () => {
    mock = makeSupabaseMock({ user: null });
    renderGuard();
    expect(await screen.findByRole('button', { name: getDictionary('en').auth.signInWithGoogle })).toBeInTheDocument();
  });
});
