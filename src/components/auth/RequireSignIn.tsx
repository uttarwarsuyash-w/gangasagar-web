'use client';

import type { ReactNode } from 'react';
import { useSession } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { Spinner } from '@/components/ui/Spinner';
import { SignInButton } from './SignInButton';

export function RequireSignIn({ lang, children }: { lang: Lang; children: ReactNode }) {
  const { user, loading } = useSession();
  const t = getDictionary(lang).auth;
  if (loading) return <Spinner label={t.loading} />;
  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-brand/15 bg-white p-8 text-center">
        <p className="text-lg">{t.signInPrompt}</p>
        <SignInButton lang={lang} />
      </div>
    );
  }
  return <>{children}</>;
}
