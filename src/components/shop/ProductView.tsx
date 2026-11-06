'use client';

import { useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { useLiveVariants } from '@/features/catalog/live';
import type { PublicProduct } from '@/features/catalog/types';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { VariantPicker } from './VariantPicker';
import { WhatsAppEnquiryButton } from './WhatsAppEnquiryButton';

export function ProductView({ lang, product }: { lang: Lang; product: PublicProduct }) {
  const ids = useMemo(() => [product.id], [product.id]);
  const live = useLiveVariants(ids);
  const variants = live ? (live[product.id] ?? []) : product.variants;
  const row = product as unknown as Record<string, unknown>;
  const name = pick(row, 'name', lang);
  const description = pick(row, 'description', lang);
  const [active, setActive] = useState(0);
  const image = product.images[active];

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-brand-light/50">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt={name} className="h-full w-full object-cover" />
          ) : (
            <Package aria-hidden className="h-16 w-16 text-brand/40" />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {product.images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${name} ${i + 1}`}
                aria-pressed={i === active}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg ring-2 ${i === active ? 'ring-brand' : 'ring-transparent'}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src.replace(/\.webp$/, '-thumb.webp')} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {product.brand && <p className="text-sm font-semibold uppercase tracking-wide text-ink/60">{product.brand}</p>}
        <h1 className="text-3xl font-bold">{name}</h1>
        {description && <p className="mt-3 whitespace-pre-line text-ink/80">{description}</p>}
        <div className="mt-6">
          <VariantPicker key={variants.map((v) => v.id).join(',')} lang={lang} variants={variants} />
        </div>
        <div className="mt-4">
          <WhatsAppEnquiryButton lang={lang} name={name} path={localHref(lang, `/product/${product.slug}/`)} />
        </div>
      </div>
    </div>
  );
}
