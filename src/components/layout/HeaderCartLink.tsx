'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/features/cart/store';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { CART_BUMP } from '@/lib/motion/motion';
import { headerPill } from './Header';

export function HeaderCartLink({ lang, label }: { lang: Lang; label: string }) {
  const { count } = useCart();
  const icon = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wiggle = () => {
      const el = icon.current;
      if (!el) return;
      el.classList.remove('animate-wiggle');
      void el.offsetWidth; // restart the animation
      el.classList.add('animate-wiggle');
    };
    window.addEventListener(CART_BUMP, wiggle);
    return () => window.removeEventListener(CART_BUMP, wiggle);
  }, []);

  return (
    <Link href={localHref(lang, '/cart/')} className={`relative ${headerPill}`}>
      <span ref={icon} data-cart-target className="inline-flex">
        <ShoppingCart aria-hidden className="h-5 w-5" />
      </span>
      <span className="sr-only sm:not-sr-only">{label}</span>
      {count > 0 && (
        <span
          key={count}
          data-testid="cart-count"
          className="absolute -right-1 -top-1 min-w-5 animate-pop rounded-full bg-accent px-1 text-center text-xs font-bold leading-5 text-ink shadow"
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}
