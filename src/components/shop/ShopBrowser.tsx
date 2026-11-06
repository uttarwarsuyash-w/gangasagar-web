'use client';

import { Reveal } from '@/lib/motion/Reveal';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Store } from 'lucide-react';
import { filterProducts } from '@/features/catalog/search';
import { useLiveVariants } from '@/features/catalog/live';
import type { Catalog } from '@/features/catalog/types';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { Checkbox, SelectField } from '@/components/ui/Field';
import { ProductCard } from './ProductCard';

export function ShopBrowser({ lang, catalog, categorySlug }: { lang: Lang; catalog: Catalog; categorySlug?: string }) {
  const t = getDictionary(lang).shop;
  const [query, setQuery] = useState('');
  const [brand, setBrand] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [looseOnly, setLooseOnly] = useState(false);

  const ids = useMemo(() => catalog.products.map((p) => p.id), [catalog.products]);
  const live = useLiveVariants(ids);
  const products = useMemo(
    () => (live ? catalog.products.map((p) => ({ ...p, variants: live[p.id] ?? [] })) : catalog.products),
    [catalog.products, live],
  );

  const brands = useMemo(
    () => [...new Set(catalog.products.map((p) => p.brand).filter((b): b is string => !!b))].sort(),
    [catalog.products],
  );

  if (catalog.products.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-brand/15 bg-white p-8 text-center">
        <Store aria-hidden className="mx-auto h-10 w-10 text-brand/50" />
        <p className="mt-3 text-xl font-semibold">{t.noProducts}</p>
        <p className="mt-1 text-ink/70">{t.noProductsHint}</p>
      </div>
    );
  }

  const shown = filterProducts(
    products,
    { query, categorySlug, brand: brand || null, availability: availableOnly ? 'available' : 'all', loose: looseOnly },
    catalog.categories,
  );
  const topCategories = catalog.categories.filter((c) => !c.parent_id);

  return (
    <div>
      {topCategories.length > 0 && (
        <nav aria-label={t.category} className="-mx-4 mb-4 overflow-x-auto px-4">
          <ul className="flex gap-2">
            <li>
              <Link
                href={localHref(lang, '/shop/')}
                aria-current={!categorySlug ? 'page' : undefined}
                className={`inline-block whitespace-nowrap rounded-full px-4 py-2 font-medium transition duration-200 hover:-translate-y-0.5 active:scale-90 ${!categorySlug ? 'bg-brand text-white shadow-[0_3px_0_var(--color-brand-dark)]' : 'bg-white ring-1 ring-ink/15 hover:bg-brand-light'}`}
              >
                {t.allCategories}
              </Link>
            </li>
            {topCategories.map((c) => (
              <li key={c.id}>
                <Link
                  href={localHref(lang, `/shop/${c.slug}/`)}
                  aria-current={categorySlug === c.slug ? 'page' : undefined}
                  className={`inline-block whitespace-nowrap rounded-full px-4 py-2 font-medium transition duration-200 hover:-translate-y-0.5 active:scale-90 ${categorySlug === c.slug ? 'bg-brand text-white shadow-[0_3px_0_var(--color-brand-dark)]' : 'bg-white ring-1 ring-ink/15 hover:bg-brand-light'}`}
                >
                  {pick(c as unknown as Record<string, unknown>, 'name', lang)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-ink/10 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="sr-only">{t.search}</span>
          <span className="relative block">
            <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.search}
              className="block w-full rounded-full border border-ink/20 py-2.5 pl-10 pr-4 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </span>
        </label>
        {brands.length > 1 && (
          <SelectField label={t.brand} value={brand} onChange={setBrand} options={[{ value: '', label: t.allBrands }, ...brands.map((b) => ({ value: b, label: b }))]} />
        )}
        <div className="flex flex-wrap gap-4 sm:col-span-2">
          <Checkbox label={t.availableOnly} checked={availableOnly} onChange={setAvailableOnly} />
          <Checkbox label={t.looseOnly} checked={looseOnly} onChange={setLooseOnly} />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-6 text-center text-ink/70">{t.noMatches}</p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((p, i) => (
            <Reveal key={p.id} index={i % 8}>
              <ProductCard lang={lang} product={p} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
