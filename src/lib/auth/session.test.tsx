import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { makeSupabaseMock } from '@/test/supabase-mock';

const mock = makeSupabaseMock();
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => mock }));

import { signInWithGoogle } from './session';

describe('signInWithGoogle', () => {
  beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://example.pages.dev'));
  afterEach(() => vi.unstubAllEnvs());

  it('redirects to the language callback with the encoded next path', async () => {
    await signInWithGoogle('/en/checkout/');
    expect(mock.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://example.pages.dev/en/auth/callback/?next=%2Fen%2Fcheckout%2F' },
    });
  });

  it('uses the Hindi callback for Hindi pages', async () => {
    await signInWithGoogle('/hi/cart/');
    expect(mock.auth.signInWithOAuth).toHaveBeenLastCalledWith({
      provider: 'google',
      options: { redirectTo: 'https://example.pages.dev/hi/auth/callback/?next=%2Fhi%2Fcart%2F' },
    });
  });
});
