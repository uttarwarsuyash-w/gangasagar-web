'use client';

import { reducedMotion } from '@/lib/motion/motion';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import type { CartItem } from '@/features/cart/store';
import type { PricedLine } from '@/features/cart/pricing';
import { fill } from '@/lib/errors';
import { formatRupees, formatWeight } from '@/lib/money';

/** Slides the line out to the right and folds it away, then removes it. */
function removeWithFlourish(li: HTMLElement | null, done: () => void) {
  if (!li || typeof li.animate !== 'function' || reducedMotion()) return done();
  const h = li.offsetHeight;
  li.animate(
    [
      { transform: 'none', opacity: 1, height: `${h}px` },
      { offset: 0.5, transform: 'translateX(60%) rotate(4deg)', opacity: 0, height: `${h}px` },
      { transform: 'translateX(60%)', opacity: 0, height: '0px', paddingTop: '0', paddingBottom: '0' },
    ],
    { duration: 420, easing: 'cubic-bezier(.5,0,.5,1)', fill: 'forwards' },
  ).onfinish = done;
}

const stepBtn =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand/30 bg-white text-brand-dark transition duration-150 hover:scale-110 hover:bg-brand-light active:scale-75 disabled:opacity-40 disabled:hover:scale-100';

export function CartLines({
  lang,
  items,
  lines,
  lineErrors,
  onSet,
  onRemove,
}: {
  lang: Lang;
  items: CartItem[];
  lines: PricedLine[];
  lineErrors: Record<string, string>;
  onSet: (variantId: string, value: number) => void;
  onRemove: (variantId: string) => void;
}) {
  const t = getDictionary(lang);
  const sh = t.shop;
  return (
    <ul className="divide-y divide-ink/10 overflow-hidden rounded-2xl border border-ink/10 bg-white">
      {items.map((item, index) => {
        const line = lines.find((l) => l.variant_id === item.variantId);
        const row = (line ?? {}) as unknown as Record<string, unknown>;
        const name = line?.name_en ? pick(row, 'name', lang) : '';
        const label = line?.label_en ? pick(row, 'label', lang) : '';
        const err = lineErrors[item.variantId];
        const unavailable = err === 'unavailable';
        const loose = item.grams !== undefined;
        const step = line?.loose_step_g || 250;
        const min = line?.loose_min_g || step;
        return (
          <li
            key={item.variantId}
            data-line={item.variantId}
            style={{ animationDelay: `${index * 70}ms` }}
            className={`flex animate-slide-in flex-wrap items-center gap-3 px-4 py-3 ${unavailable ? 'bg-ink/5' : ''}`}
          >
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${unavailable ? 'text-ink/50 line-through' : ''}`}>{name || '—'}</p>
              {label && <p className="text-sm text-ink/60">{label}</p>}
              {unavailable ? (
                <p className="mt-1 inline-block rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">{t.cart.noLongerAvailable}</p>
              ) : err === 'invalid_quantity' ? (
                <p className="mt-1 text-sm text-brand-dark">{t.cart.invalidQuantity}</p>
              ) : (
                line?.unit_price != null && (
                  <p className="text-sm text-ink/60">
                    {formatRupees(line.unit_price)} {loose ? sh.perKg : t.cart.each}
                  </p>
                )
              )}
            </div>
            {!unavailable && (
              <div className="flex items-center gap-2" role="group" aria-label={loose ? sh.weight : sh.quantity}>
                <button
                  type="button"
                  className={stepBtn}
                  aria-label={sh.less}
                  onClick={() => onSet(item.variantId, loose ? Math.max(min, (item.grams ?? min) - step) : (item.qty ?? 1) - 1)}
                  disabled={loose ? (item.grams ?? 0) <= min : false}
                >
                  <Minus aria-hidden className="h-4 w-4" />
                </button>
                <span key={loose ? item.grams : item.qty} className="min-w-14 animate-pop text-center font-semibold">
                  {loose ? formatWeight(item.grams ?? 0) : item.qty}
                </span>
                <button
                  type="button"
                  className={stepBtn}
                  aria-label={sh.more}
                  onClick={() => onSet(item.variantId, loose ? (item.grams ?? 0) + step : (item.qty ?? 0) + 1)}
                >
                  <Plus aria-hidden className="h-4 w-4" />
                </button>
              </div>
            )}
            <span className="w-20 text-right font-bold">{line?.line_total != null ? formatRupees(line.line_total) : ''}</span>
            <button
              type="button"
              onClick={(e) => removeWithFlourish(e.currentTarget.closest('li'), () => onRemove(item.variantId))}
              aria-label={fill(t.cart.removeNamed, { name: name || t.cart.remove })}
              className="rounded-full p-2 text-brand-dark transition duration-200 hover:rotate-12 hover:scale-110 hover:bg-brand-light active:scale-75"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
