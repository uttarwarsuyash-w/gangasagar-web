'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

interface SessionState {
  user: User | null;
  loading: boolean;
}

const SessionContext = createContext<SessionState>({ user: null, loading: true });

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, loading: true });

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setState({ user: data.session?.user ?? null, loading: false });
      })
      .catch(() => {
        if (active) setState({ user: null, loading: false });
      });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ user: session?.user ?? null, loading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const base = env && env.trim() !== '' ? env : typeof window !== 'undefined' ? window.location.origin : '';
  return base.replace(/\/+$/, '');
}

/** Starts Google sign-in; Supabase returns the visitor to /<lang>/auth/callback/?next=<next>. */
export async function signInWithGoogle(next: string): Promise<void> {
  const lang = next.startsWith('/hi/') || next === '/hi' ? 'hi' : 'en';
  const redirectTo = `${siteUrl()}/${lang}/auth/callback/?next=${encodeURIComponent(next)}`;
  const { error } = await getSupabase().auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}
