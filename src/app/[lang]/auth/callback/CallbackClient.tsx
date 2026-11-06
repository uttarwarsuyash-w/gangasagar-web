'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { safeNext } from '@/lib/auth/safe-next';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { Spinner } from '@/components/ui/Spinner';

/** Waits for Supabase to finish the PKCE exchange, then goes to ?next=. */
export function CallbackClient({ lang }: { lang: Lang }) {
  const router = useRouter();
  const t = getDictionary(lang).auth;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    const next = safeNext(new URLSearchParams(window.location.search).get('next'), lang);
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      router.replace(next);
    };
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) go();
    });
    supabase.auth.getSession().then(({ data: s }) => {
      if (s.session) go();
    });
    const timer = window.setTimeout(() => {
      if (!done) setFailed(true);
    }, 15000);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, [lang, router]);

  return (
    <main className="mx-auto max-w-md px-4 py-16 text-center">
      {failed ? <p role="alert">{t.signInFailed}</p> : <Spinner label={t.signingIn} />}
      {!failed && <p className="text-ink/70">{t.signingIn}</p>}
    </main>
  );
}
