import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { makeSupabaseMock } from '@/test/supabase-mock';
import { getDictionary } from '@/i18n/get-dictionary';

const { holder } = vi.hoisted(() => ({ holder: { mock: null as unknown as ReturnType<typeof makeSupabaseMock> } }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => holder.mock }));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/shop/' }));

import { SessionProvider } from '@/lib/auth/session';
import { HeaderAccount } from './HeaderAccount';

const en = getDictionary('en');
const show = (opts: Parameters<typeof makeSupabaseMock>[0]) => {
  holder.mock = makeSupabaseMock(opts);
  return render(
    <SessionProvider>
      <HeaderAccount lang="en" />
    </SessionProvider>,
  );
};

describe('HeaderAccount', () => {
  it('offers Sign in to a visitor and returns them to the same page', async () => {
    const user = userEvent.setup();
    show({ user: null });
    await user.click(await screen.findByRole('button', { name: en.auth.signIn }));
    expect(holder.mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/en/auth/callback/?next=%2Fen%2Fshop%2F') },
    });
  });

  it('offers Sign out to a signed-in customer, with no Admin link', async () => {
    const user = userEvent.setup();
    show({ user: { id: 'u1', email: 'customer@example.com' }, isAdmin: false });
    await user.click(await screen.findByRole('button', { name: en.auth.signOut }));
    expect(holder.mock.auth.signOut).toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: en.nav.admin })).not.toBeInTheDocument();
  });

  it('shows the Admin link and Sign out to an admin', async () => {
    show({ user: { id: 'a1', email: 'uttarwarsuyash@gmail.com' }, isAdmin: true });
    expect(await screen.findByRole('link', { name: en.nav.admin })).toHaveAttribute('href', '/en/admin/');
    expect(screen.getByRole('button', { name: en.auth.signOut })).toBeInTheDocument();
  });
});
