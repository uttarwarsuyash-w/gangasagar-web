'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogIn, LogOut, Shield } from 'lucide-react';
import { useIsAdmin } from '@/lib/auth/admin';
import { signInWithGoogle, signOut, useSession } from '@/lib/auth/session';
import { localHref } from '@/i18n/localized';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

const pill = 'inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-medium hover:bg-brand-light disabled:opacity-60';

/** Sign in for visitors; Sign out (and Admin for allowlisted admins) once signed in. */
export function HeaderAccount({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const { user, loading } = useSession();
  const isAdmin = useIsAdmin();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);

  if (loading) return null;

  if (!user) {
    return (
      <button
        type="button"
        className={pill}
        disabled={busy}
        aria-label={t.auth.signIn}
        onClick={async () => {
          setBusy(true);
          try {
            await signInWithGoogle(`${pathname || `/${lang}/`}${window.location.search}`);
          } catch {
            setBusy(false);
          }
        }}
      >
        <LogIn aria-hidden className="h-5 w-5" />
        <span aria-hidden className="hidden sm:inline">{t.auth.signIn}</span>
      </button>
    );
  }

  return (
    <>
      {isAdmin && (
        <Link href={localHref(lang, '/admin/')} className={pill}>
          <Shield aria-hidden className="h-5 w-5" />
          <span className="sr-only sm:not-sr-only">{t.nav.admin}</span>
        </Link>
      )}
      <button
        type="button"
        className={pill}
        disabled={busy}
        aria-label={t.auth.signOut}
        title={user.email ?? undefined}
        onClick={async () => {
          setBusy(true);
          try {
            await signOut();
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut aria-hidden className="h-5 w-5" />
        <span aria-hidden className="hidden sm:inline">{t.auth.signOut}</span>
      </button>
    </>
  );
}
