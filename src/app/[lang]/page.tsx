import Link from 'next/link';
import { MapPin, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import { isLang, type Lang } from '@/i18n/types';
import { BUSINESS, DIRECTIONS_URL } from '@/config/business';
import { telLink, waLink } from '@/lib/whatsapp';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  const t = getDictionary(lang);
  const button =
    'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-lg font-semibold shadow-sm transition';
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:py-20">
      <p className="inline-block rounded-full bg-accent/20 px-3 py-1 text-sm font-semibold text-ink">{t.home.since}</p>
      <h1 className="mt-4 text-5xl font-bold text-brand sm:text-6xl">{lang === 'hi' ? 'गंगासागर' : BUSINESS.name}</h1>
      <p className="mt-3 text-lg text-ink/75">{t.home.hours}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link href={localHref(lang, '/shop/')} className={`${button} bg-brand text-white hover:bg-brand-dark`}>
          <ShoppingBag aria-hidden className="h-5 w-5" /> {t.home.shopNow}
        </Link>
        <a href={telLink(BUSINESS.phones.main)} className={`${button} border border-brand/30 bg-white text-brand-dark hover:bg-brand-light`}>
          <Phone aria-hidden className="h-5 w-5" /> {t.home.call}
        </a>
        <a
          href={waLink(BUSINESS.whatsapp.main, t.home.whatsappHello)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${button} border border-brand/30 bg-white text-brand-dark hover:bg-brand-light`}
        >
          <MessageCircle aria-hidden className="h-5 w-5" /> {t.home.whatsapp}
        </a>
        <a
          href={DIRECTIONS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${button} border border-brand/30 bg-white text-brand-dark hover:bg-brand-light`}
        >
          <MapPin aria-hidden className="h-5 w-5" /> {t.home.directions}
        </a>
      </div>
    </section>
  );
}
