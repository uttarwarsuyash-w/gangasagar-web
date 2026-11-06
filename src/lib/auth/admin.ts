'use client';

import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useSession } from './session';

/** null while checking; false when signed out or not on the admin allowlist. */
export function useIsAdmin(): boolean | null {
  const { user, loading } = useSession();
  const [result, setResult] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    getSupabase()
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (active) setResult({ userId, isAdmin: !error && data === true });
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (loading) return null;
  if (!userId) return false;
  if (!result || result.userId !== userId) return null;
  return result.isAdmin;
}
