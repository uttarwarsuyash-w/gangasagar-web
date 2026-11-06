'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useIsAdmin } from '@/lib/auth/admin';
import { localHref } from '@/i18n/localized';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

/** Shows the Admin link only to allowlisted admins. */
export function HeaderAccount({ lang }: { lang: Lang }) {
  const isAdmin = useIsAdmin();
  if (!isAdmin) return null;
  return (
    <Link
      href={localHref(lang, '/admin/')}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-medium hover:bg-brand-light"
    >
      <Shield aria-hidden className="h-5 w-5" />
      <span className="sr-only sm:not-sr-only">{getDictionary(lang).nav.admin}</span>
    </Link>
  );
}
