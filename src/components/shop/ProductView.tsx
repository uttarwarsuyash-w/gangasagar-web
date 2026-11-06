'use client';

import { useMemo, useState } from 'react';
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
    <div className="grid gap-6 md:grid-cols-2" data-product-root>
      <div className="animate-rise">
        <div className="group flex aspect-square items-center justify-center overflow-hidden rounded-3xl bg-accent-light shadow-[0_6px_0_var(--color-accent)]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={image}
              src={image}
              alt={name}
              data-fly-source
              className="h-full w-full animate-fade-in object-cover transition duration-700 group-hover:scale-110"
            />
          ) : (
            <span data-fly-source aria-hidden className="font-display text-[9rem] leading-none text-brand/70 animate-bob">
              {name.slice(0, 1)}
            </span>
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
        <h1 className="animate-rise font-display text-5xl leading-none font-semibold text-brand-dark">{name}</h1>
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
