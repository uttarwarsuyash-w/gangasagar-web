'use client';

import { Bike, Store, Truck } from 'lucide-react';
import { useDeliveryRules } from '@/components/cart/CartView';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';
import { Reveal } from '@/lib/motion/Reveal';
import { formatRupees, formatWeight } from '@/lib/money';

/** Pickup, delivery in Nanded and outside Nanded, with the fees the shop has set. */
export function HomeWays({ lang }: { lang: Lang }) {
  const h = getDictionary(lang).home;
  const r = useDeliveryRules();
  const ways = [
    { icon: Store, title: h.pickupTitle, text: h.pickupText, tone: 'bg-leaf text-white' },
    {
      icon: Bike,
      title: h.deliveryTitle,
      text: fill(h.deliveryText, {
        light: formatRupees(r.nanded_light_fee),
        heavy: formatRupees(r.nanded_heavy_fee),
        kg: formatWeight(r.nanded_heavy_min_g),
        free: formatRupees(r.nanded_free_min_value),
      }),
      tone: 'bg-brand text-white',
    },
    { icon: Truck, title: h.outsideTitle, text: fill(h.outsideText, { fee: formatRupees(r.outside_fee) }), tone: 'bg-accent text-ink' },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <Reveal as="h2" className="font-display text-4xl leading-none font-semibold text-brand-dark sm:text-5xl">
        {h.waysTitle}
      </Reveal>
      <ul className="mt-8 grid gap-x-8 gap-y-6 md:grid-cols-3">
        {ways.map((w, i) => (
          <Reveal as="li" key={w.title} index={i + 1} className="group flex gap-4 md:flex-col">
            <span
              className={`grid h-16 w-16 shrink-0 place-items-center rounded-full ${w.tone} shadow-[0_5px_0_rgba(43,27,18,.25)] transition duration-300 group-hover:-translate-y-1 group-hover:-rotate-12`}
            >
              <w.icon aria-hidden className="h-8 w-8" />
            </span>
            <span>
              <span className="block font-display text-2xl leading-tight font-semibold">{w.title}</span>
              <span className="mt-1 block text-ink/75">{w.text}</span>
            </span>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
