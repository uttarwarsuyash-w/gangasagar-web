import Link from 'next/link';
import { Store } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { BUSINESS } from '@/config/business';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HeaderCartLink } from './HeaderCartLink';
import { HeaderAccount } from './HeaderAccount';

export function Header({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <header className="sticky top-0 z-30 border-b border-brand/10 bg-paper/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link href={localHref(lang, '/')} className="flex items-center gap-2 text-xl font-bold text-brand">
          <Store aria-hidden className="h-6 w-6" />
          <span>{lang === 'hi' ? 'गंगासागर' : BUSINESS.name}</span>
        </Link>
        <nav aria-label={t.nav.menu} className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href={localHref(lang, '/shop/')} className="rounded-full px-3 py-2 font-medium hover:bg-brand-light">
            {t.nav.shop}
          </Link>
          <HeaderCartLink lang={lang} label={t.nav.cart} />
          <HeaderAccount lang={lang} />
          <LanguageSwitcher lang={lang} />
        </nav>
      </div>
    </header>
  );
}
