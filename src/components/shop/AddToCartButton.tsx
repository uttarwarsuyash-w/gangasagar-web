'use client';

import { useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { useCart, type CartItem } from '@/features/cart/store';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

export function AddToCartButton({ lang, item, disabled }: { lang: Lang; item: CartItem | null; disabled?: boolean }) {
  const t = getDictionary(lang).shop;
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  return (
    <button
      type="button"
      disabled={disabled || !item}
      onClick={() => {
        if (!item) return;
        add(item);
        setAdded(true);
        window.setTimeout(() => setAdded(false), 2000);
      }}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-lg font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
    >
      {added ? <Check aria-hidden className="h-5 w-5" /> : <ShoppingCart aria-hidden className="h-5 w-5" />}
      {disabled ? t.outOfStock : added ? t.added : t.addToCart}
    </button>
  );
}
