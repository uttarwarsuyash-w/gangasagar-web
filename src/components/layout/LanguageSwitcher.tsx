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
      className="group inline-flex h-9 items-center gap-1 rounded-full bg-white px-2.5 text-sm font-semibold text-brand-dark shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-90 sm:px-3"
      onClick={(e) => {
        // Keep the query string (e.g. ?id=) when switching language.
        const search = window.location.search;
        if (search) {
          e.preventDefault();
          router.push(`${href}${search}`);
        }
      }}
    >
      <Languages aria-hidden className="h-4 w-4 transition-transform duration-500 group-hover:rotate-[360deg]" />
      {t.switchTo}
    </Link>
  );
}
