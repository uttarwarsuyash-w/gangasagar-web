import Link from 'next/link';
import { Package } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import type { PublicProduct, PublicVariant, StockLabel } from '@/features/catalog/types';
import { thumbUrl } from '@/lib/images/upload';
import { formatRupees } from '@/lib/money';
import { StockBadge } from './StockBadge';

function bestLabel(variants: PublicVariant[]): StockLabel {
  if (variants.some((v) => v.stock_label === 'Available')) return 'Available';
  if (variants.some((v) => v.stock_label === 'Limited Stock')) return 'Limited Stock';
  return 'Out of Stock';
}

/** Shows name, photo, lowest price and a stock label. Never a stock quantity. */
export function ProductCard({ lang, product }: { lang: Lang; product: PublicProduct }) {
  const t = getDictionary(lang).shop;
  const name = pick(product as unknown as Record<string, unknown>, 'name', lang);
  const variants = product.variants;
  const cheapest = variants.length ? variants.reduce((a, b) => (a.price <= b.price ? a : b)) : null;
  const image = product.images[0];
  return (
    <article className="group overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-sm transition hover:shadow-md">
      <Link href={localHref(lang, `/product/${product.slug}/`)} className="block">
        <div className="flex aspect-square items-center justify-center bg-brand-light/50">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl(image)} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package aria-hidden className="h-12 w-12 text-brand/40" />
          )}
        </div>
        <div className="p-3">
          {product.brand && <p className="text-xs font-semibold uppercase tracking-wide text-ink/60">{product.brand}</p>}
          <h3 className="font-semibold leading-snug group-hover:text-brand">{name}</h3>
          {cheapest && (
            <p className="mt-1">
              {variants.length > 1 && <span className="text-sm text-ink/60">{t.from} </span>}
              <span className="font-bold text-brand-dark">{formatRupees(cheapest.price)}</span>
              {cheapest.is_loose && <span className="text-sm text-ink/60"> {t.perKg}</span>}
            </p>
          )}
          <div className="mt-2">
            <StockBadge lang={lang} label={variants.length ? bestLabel(variants) : 'Out of Stock'} />
          </div>
        </div>
      </Link>
    </article>
  );
}
