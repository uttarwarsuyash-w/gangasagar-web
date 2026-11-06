'use client';

import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useIsAdmin } from '@/lib/auth/admin';
import { useSession } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { Spinner } from '@/components/ui/Spinner';
import { RequireSignIn } from '@/components/auth/RequireSignIn';

function AdminCheck({ lang, children }: { lang: Lang; children: ReactNode }) {
  const isAdmin = useIsAdmin();
  const t = getDictionary(lang).auth;
  if (isAdmin === null) return <Spinner label={t.loading} />;
  if (!isAdmin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-brand/15 bg-white p-8 text-center">
        <ShieldAlert aria-hidden className="h-8 w-8 text-brand" />
        <p className="text-lg">{t.adminsOnly}</p>
      </div>
    );
  }
  return <>{children}</>;
}

export function AdminGuard({ lang, children }: { lang: Lang; children: ReactNode }) {
  const { user } = useSession();
  return (
    <RequireSignIn lang={lang}>{user ? <AdminCheck lang={lang}>{children}</AdminCheck> : null}</RequireSignIn>
  );
}
