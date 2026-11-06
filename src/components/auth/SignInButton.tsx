'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

export function SignInButton({ lang, next, className }: { lang: Lang; next?: string; className?: string }) {
  const t = getDictionary(lang).auth;
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function onClick() {
    setBusy(true);
    setFailed(false);
    try {
      const search = typeof window !== 'undefined' ? window.location.search : '';
      await signInWithGoogle(next ?? `${pathname || `/${lang}/`}${search}`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className={
          className ??
          'inline-flex items-center gap-2 rounded-full bg-brand px-5 py-3 font-semibold text-white shadow-sm hover:bg-brand-dark disabled:opacity-60'
        }
      >
        <LogIn aria-hidden className="h-5 w-5" />
        {t.signInWithGoogle}
      </button>
      {failed && <p role="alert" className="text-sm text-brand-dark">{t.signInFailed}</p>}
    </div>
  );
}
