import { vi } from 'vitest';

/** A tiny stand-in for the Supabase client, for component tests. */
export function makeSupabaseMock(opts: { user?: { id: string; email: string } | null; isAdmin?: boolean | Promise<boolean> } = {}) {
  const session = opts.user ? { user: opts.user } : null;
  const rpc = vi.fn(async (name: string) => {
    if (name === 'is_admin') return { data: await opts.isAdmin, error: null };
    return { data: null, error: null };
  });
  return {
    rpc,
    auth: {
      getSession: vi.fn(async () => ({ data: { session }, error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithOAuth: vi.fn(async () => ({ data: {}, error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn(),
  };
}
