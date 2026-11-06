import { afterEach, describe, expect, it, vi } from 'vitest';

describe('fetchCatalog', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it('returns an empty catalogue when Supabase is not configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('CATALOG_FIXTURE', '');
    const { fetchCatalog } = await import('./public-api');
    expect(await fetchCatalog()).toEqual({ categories: [], products: [] });
  });
});
