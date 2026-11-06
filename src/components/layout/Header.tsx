import Link from 'next/link';
import { ShoppingBasket } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { LanguageSwitcher } from './LanguageSwitcher';
import { HeaderCartLink } from './HeaderCartLink';
import { HeaderAccount } from './HeaderAccount';
import { headerPill } from './header-pill';


/** The shop's red signboard, as a sticky header. */
export function Header({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <header className="sticky top-0 z-30 bg-brand text-white shadow-[0_4px_0_var(--color-brand-dark)]">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-3 py-1.5 sm:px-4">
        <Link href={localHref(lang, '/')} className="group flex min-w-0 items-baseline gap-2 leading-none">
          <span
            lang="hi"
            className="font-display text-[2rem] font-semibold tracking-wide transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105 sm:text-4xl"
          >
            गंगासागर
          </span>
          <span className="hidden font-display text-xl text-white/80 md:inline">{lang === 'hi' ? 'किराणा स्टोर्स' : 'Kirana Stores'}</span>
        </Link>
        <nav aria-label={t.nav.menu} className="ml-auto flex items-center gap-0.5 sm:gap-1">
          <Link href={localHref(lang, '/shop/')} className={headerPill}>
            <ShoppingBasket aria-hidden className="h-5 w-5" />
            <span className="sr-only sm:not-sr-only">{t.nav.shop}</span>
          </Link>
          <HeaderCartLink lang={lang} label={t.nav.cart} />
          <HeaderAccount lang={lang} />
          <LanguageSwitcher lang={lang} />
        </nav>
      </div>
    </header>
  );
}
