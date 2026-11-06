'use client';

import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart, type CartItem } from '@/features/cart/store';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { flyToCart } from '@/lib/motion/motion';

export function AddToCartButton({ lang, item, disabled }: { lang: Lang; item: CartItem | null; disabled?: boolean }) {
  const t = getDictionary(lang).shop;
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || !item}
      onClick={(e) => {
        if (!item) return;
        const root = e.currentTarget.closest('[data-product-root]');
        flyToCart(root?.querySelector('[data-fly-source]') ?? e.currentTarget);
        add(item);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2000);
      }}
      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-lg font-semibold text-white shadow-[0_4px_0_var(--color-brand-dark)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_0_var(--color-brand-dark)] active:translate-y-1 active:scale-95 active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${added ? 'bg-leaf shadow-[0_4px_0_#1f5a22]' : 'bg-brand hover:bg-brand-dark'}`}
    >
      {added ? <Check aria-hidden className="h-5 w-5 animate-stamp" /> : <ShoppingCart aria-hidden className="h-5 w-5" />}
      {disabled ? t.outOfStock : added ? t.added : t.addToCart}
    </button>
  );
}
