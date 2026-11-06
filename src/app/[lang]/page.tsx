import Image from 'next/image';
import Link from 'next/link';
import { Clock, MapPin, MessageCircle, Phone, ShoppingBag } from 'lucide-react';
import { HomeWays } from '@/components/home/HomeWays';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import { isLang, type Lang } from '@/i18n/types';
import { BUSINESS, DIRECTIONS_URL } from '@/config/business';
import { Reveal } from '@/lib/motion/Reveal';
import { telLink, waLink } from '@/lib/whatsapp';

const COUNTER = [
  ['peanuts', 'peanuts'],
  ['roasted-chana-salted', 'chanaSalted'],
  ['roasted-chana-plain', 'chanaPlain'],
  ['masala-green-peas', 'greenPeas'],
  ['roasted-yellow-peas', 'yellowPeas'],
  ['orange-candy', 'orangeCandy'],
  ['peanut-chikki', 'chikki'],
] as const;

const pill =
  'inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-lg font-semibold transition duration-200 hover:-translate-y-0.5 active:translate-y-0.5 active:scale-95';
const pillLight = `${pill} border-2 border-brand/25 bg-white text-brand-dark hover:border-brand hover:bg-brand-light`;

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  const t = getDictionary(lang);
  const h = t.home;

  const counterRow = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className={`flex shrink-0 gap-4 pr-4 motion-reduce:shrink motion-reduce:flex-wrap motion-reduce:justify-center ${copy ? 'motion-reduce:hidden' : ''}`}>
      {COUNTER.map(([file, key]) => (
        <li key={file} className="group flex w-36 shrink-0 flex-col items-center text-center sm:w-44">
          <span className="block overflow-hidden rounded-full border-4 border-white shadow-[0_6px_0_rgba(43,27,18,.2)] transition duration-300 group-hover:-translate-y-2 group-hover:rotate-6">
            <Image
              src={`/images/counter/${file}.webp`}
              alt={copy ? '' : h.counter[key]}
              width={400}
              height={400}
              className="h-32 w-32 object-cover transition duration-500 group-hover:scale-110 sm:h-40 sm:w-40"
            />
          </span>
          <span className="mt-2 font-semibold leading-tight">{h.counter[key]}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-14 md:grid-cols-[1.15fr_1fr] md:pt-16">
        <div>
          <h1 className="font-display text-6xl leading-[0.85] font-semibold text-brand sm:text-8xl">
            {h.title.split(' ').map((w, i) => (
              <span key={i} className="inline-block animate-rise" style={{ animationDelay: `${120 + i * 140}ms` }}>
                {w}&nbsp;
              </span>
            ))}
          </h1>
          <p className="mt-5 max-w-xl animate-rise text-xl text-ink/80 [animation-delay:560ms]">{h.lead}</p>
          <p className="mt-4 flex animate-rise items-center gap-2 font-medium text-leaf [animation-delay:640ms]">
            <Clock aria-hidden className="h-5 w-5" /> {h.hours}
          </p>
          <div className="mt-8 flex animate-rise flex-wrap gap-3 [animation-delay:720ms]">
            <Link
              href={localHref(lang, '/shop/')}
              className={`${pill} bg-brand text-white shadow-[0_5px_0_var(--color-brand-dark)] hover:bg-brand-dark hover:shadow-[0_7px_0_var(--color-brand-dark)]`}
            >
              <ShoppingBag aria-hidden className="h-5 w-5" /> {h.shopNow}
            </Link>
            <a href={waLink(BUSINESS.whatsapp.main, h.whatsappHello)} target="_blank" rel="noopener noreferrer" className={pillLight}>
              <MessageCircle aria-hidden className="h-5 w-5" /> {h.whatsapp}
            </a>
            <a href={telLink(BUSINESS.phones.main)} className={pillLight}>
              <Phone aria-hidden className="h-5 w-5" /> {h.call}
            </a>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-sm animate-pop [animation-delay:200ms] md:max-w-none">
          <div className="rotate-2 overflow-hidden rounded-3xl border-8 border-white shadow-[0_18px_40px_rgba(43,27,18,.25)] transition duration-500 hover:rotate-0">
            <Image
              src="/images/shop/storefront.webp"
              alt={h.title}
              width={459}
              height={1020}
              priority
              className="aspect-[4/5] w-full animate-ken-burns object-cover object-[50%_62%]"
            />
          </div>
          <span className="absolute -bottom-5 -left-4 grid h-24 w-24 -rotate-12 animate-stamp place-items-center rounded-full border-4 border-dashed border-brand-dark/40 bg-accent text-center font-display leading-none font-semibold text-ink shadow-lg [animation-delay:900ms]">
            <span className="px-2 text-2xl">{h.since}</span>
          </span>
        </div>
      </section>

      <section aria-labelledby="counter-title" className="overflow-hidden bg-accent py-10">
        <h2 id="counter-title" className="mx-auto max-w-6xl px-4 font-display text-4xl leading-none font-semibold text-ink sm:text-5xl">
          {h.counterTitle}
        </h2>
        <div className="mt-6 flex w-max animate-marquee hover:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center">
          {counterRow(false)}
          {counterRow(true)}
        </div>
      </section>

      <HomeWays lang={lang} />

      <section className="bg-ink text-white">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-14 md:grid-cols-2">
          <Reveal className="overflow-hidden rounded-3xl border-4 border-white/90 shadow-2xl">
            <Image
              src="/images/shop/interior.webp"
              alt={h.visitTitle}
              width={1200}
              height={900}
              className="h-full w-full object-cover transition duration-700 hover:scale-105"
            />
          </Reveal>
          <Reveal index={1}>
            <h2 className="font-display text-5xl leading-none font-semibold">{h.visitTitle}</h2>
            <p className="mt-3 text-lg text-white/85">{h.visitText}</p>
            <p className="mt-4 flex items-center gap-2 font-medium text-accent">
              <Clock aria-hidden className="h-5 w-5" /> {h.hours}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={DIRECTIONS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${pill} bg-accent text-ink shadow-[0_5px_0_rgba(0,0,0,.3)] hover:bg-accent-light`}
              >
                <MapPin aria-hidden className="h-5 w-5" /> {h.directions}
              </a>
              <a href={telLink(BUSINESS.phones.main)} className={`${pill} border-2 border-white/40 text-white hover:border-white hover:bg-white/10`}>
                <Phone aria-hidden className="h-5 w-5" /> {h.call}
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
