'use client';

import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import type { PublicVariant } from '@/features/catalog/types';
import type { CartItem } from '@/features/cart/store';
import { fill } from '@/lib/errors';
import { formatRupees, formatWeight } from '@/lib/money';
import { AddToCartButton } from './AddToCartButton';
import { StockBadge } from './StockBadge';

const stepBtn =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-brand/30 bg-white text-brand-dark hover:bg-brand-light disabled:opacity-40';

export function LooseQuantity({
  lang,
  grams,
  min,
  step,
  onChange,
}: {
  lang: Lang;
  grams: number;
  min: number;
  step: number;
  onChange: (g: number) => void;
}) {
  const t = getDictionary(lang).shop;
  return (
    <div className="flex items-center gap-3" role="group" aria-label={t.weight}>
      <button type="button" className={stepBtn} aria-label={t.less} onClick={() => onChange(Math.max(min, grams - step))}>
        <Minus aria-hidden className="h-5 w-5" />
      </button>
      <output data-testid="loose-grams" aria-live="polite" className="min-w-20 text-center text-lg font-semibold">
        {formatWeight(grams)}
      </output>
      <button type="button" className={stepBtn} aria-label={t.more} onClick={() => onChange(Math.min(100000, grams + step))}>
        <Plus aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}

function PackQuantity({ lang, qty, onChange }: { lang: Lang; qty: number; onChange: (q: number) => void }) {
  const t = getDictionary(lang).shop;
  return (
    <div className="flex items-center gap-3" role="group" aria-label={t.quantity}>
      <button type="button" className={stepBtn} aria-label={t.less} onClick={() => onChange(Math.max(1, qty - 1))} disabled={qty <= 1}>
        <Minus aria-hidden className="h-5 w-5" />
      </button>
      <output aria-live="polite" className="min-w-10 text-center text-lg font-semibold">
        {qty}
      </output>
      <button type="button" className={stepBtn} aria-label={t.more} onClick={() => onChange(Math.min(999, qty + 1))}>
        <Plus aria-hidden className="h-5 w-5" />
      </button>
    </div>
  );
}

const DEFAULT_MIN = 250;
const DEFAULT_STEP = 250;

export function VariantPicker({ lang, variants }: { lang: Lang; variants: PublicVariant[] }) {
  const t = getDictionary(lang).shop;
  const firstAvailable = variants.find((v) => v.stock_label !== 'Out of Stock') ?? variants[0];
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);
  const selected = variants.find((v) => v.id === selectedId) ?? firstAvailable;
  const min = selected?.loose_min_g ?? DEFAULT_MIN;
  const step = selected?.loose_step_g ?? DEFAULT_STEP;
  const [qty, setQty] = useState(1);
  const [grams, setGrams] = useState(min);

  if (!selected) return <p className="text-ink/70">{t.noVariants}</p>;

  const soldOut = selected.stock_label === 'Out of Stock';
  const item: CartItem = selected.is_loose ? { variantId: selected.id, grams } : { variantId: selected.id, qty };
  const price = selected.is_loose ? (selected.price * grams) / 1000 : selected.price * qty;
  const onSale = selected.price < selected.retail_price;

  return (
    <div className="space-y-4">
      {variants.length > 1 && (
        <fieldset>
          <legend className="text-sm font-medium text-ink/80">{t.chooseSize}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`cursor-pointer rounded-full border px-4 py-2 font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                  v.id === selected.id ? 'border-brand bg-brand text-white' : 'border-ink/20 bg-white hover:border-brand/50'
                } ${v.stock_label === 'Out of Stock' ? 'opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === selected.id}
                  onChange={() => {
                    setSelectedId(v.id);
                    setQty(1);
                    setGrams(v.loose_min_g ?? DEFAULT_MIN);
                  }}
                  className="sr-only"
                />
                {pick(v as unknown as Record<string, unknown>, 'label', lang)}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span key={selected.id} className="inline-block animate-pop font-display text-5xl leading-none text-brand-dark">
          {selected.is_loose ? fill(t.loosePrice, { price: formatRupees(selected.price) }) : formatRupees(selected.price)}
        </span>
        {onSale && <span className="text-ink/50 line-through">{formatRupees(selected.retail_price)}</span>}
        {selected.mrp && selected.mrp > selected.price && !onSale && (
          <span className="text-sm text-ink/60">
            {t.mrp} <span className="line-through">{formatRupees(selected.mrp)}</span>
          </span>
        )}
        {onSale && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-ink">{t.onSale}</span>}
        <StockBadge lang={lang} label={selected.stock_label} />
      </div>

      {!selected.is_loose && (
        <p className="text-sm text-ink/60">
          {t.netWeight}: {formatWeight(selected.net_weight_g)}
          {selected.pack_type ? ` · ${selected.pack_type}` : ''}
        </p>
      )}

      {selected.is_loose ? (
        <LooseQuantity lang={lang} grams={grams} min={min} step={step} onChange={setGrams} />
      ) : (
        <PackQuantity lang={lang} qty={qty} onChange={setQty} />
      )}
      {(selected.is_loose || qty > 1) && <p className="text-lg font-semibold">= {formatRupees(Math.round(price * 100) / 100)}</p>}

      <AddToCartButton lang={lang} item={item} disabled={soldOut} />
    </div>
  );
}
