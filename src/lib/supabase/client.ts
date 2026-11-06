import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** The one browser Supabase client. Uses only the public URL and anon key. */
export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key';
    client = createClient(url, key, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    });
  }
  return client;
}
