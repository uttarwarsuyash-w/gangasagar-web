'use client';

import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';

export function HeaderCartLink({ lang, label }: { lang: Lang; label: string }) {
  return (
    <Link
      href={localHref(lang, '/cart/')}
      className="relative inline-flex items-center gap-1.5 rounded-full px-3 py-2 font-medium hover:bg-brand-light"
    >
      <ShoppingCart aria-hidden className="h-5 w-5" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </Link>
  );
}
