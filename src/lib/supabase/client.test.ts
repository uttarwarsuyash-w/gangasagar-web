import { afterEach, describe, expect, it, vi } from 'vitest';

const createClient = vi.fn(() => ({ marker: Math.random() }));
vi.mock('@supabase/supabase-js', () => ({ createClient }));

describe('getSupabase', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is a PKCE singleton built from the public env vars', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon-key');
    const { getSupabase } = await import('./client');
    const a = getSupabase();
    const b = getSupabase();
    expect(a).toBe(b);
    expect(createClient).toHaveBeenCalledTimes(1);
    expect(createClient).toHaveBeenCalledWith('https://abc.supabase.co', 'anon-key', {
      auth: expect.objectContaining({ flowType: 'pkce', detectSessionInUrl: true, persistSession: true }),
    });
  });
});
