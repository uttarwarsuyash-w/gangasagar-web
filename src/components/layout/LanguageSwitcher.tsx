'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Languages } from 'lucide-react';
import { switchPath } from '@/i18n/localized';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

export function LanguageSwitcher({ lang }: { lang: Lang }) {
  const pathname = usePathname() || `/${lang}/`;
  const router = useRouter();
  const to: Lang = lang === 'en' ? 'hi' : 'en';
  const t = getDictionary(lang).lang;
  const href = switchPath(pathname, to);
  return (
    <Link
      href={href}
      hrefLang={to}
      lang={to}
      aria-label={t.switchLabel}
      className="inline-flex items-center gap-1.5 rounded-full border border-brand/25 px-3 py-1.5 text-sm font-medium text-brand-dark hover:bg-brand-light"
      onClick={(e) => {
        // Keep the query string (e.g. ?id=) when switching language.
        const search = window.location.search;
        if (search) {
          e.preventDefault();
          router.push(`${href}${search}`);
        }
      }}
    >
      <Languages aria-hidden className="h-4 w-4" />
      {t.switchTo}
    </Link>
  );
}
