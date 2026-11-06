import type { Metadata } from 'next';
import { fetchCatalog } from '@/features/catalog/public-api';
import { ProductView } from '@/components/shop/ProductView';
import { NotFoundNotice } from '@/components/shop/NotFoundNotice';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import { isLang, type Lang } from '@/i18n/types';

type Props = { params: Promise<{ lang: string; slug: string }> };

export const dynamicParams = false;

/** One page per active product; a placeholder "_" page keeps the build working with none. */
export async function generateStaticParams(): Promise<Array<{ slug: string }>> {
  const { products } = await fetchCatalog();
  return products.length ? products.map((p) => ({ slug: p.slug })) : [{ slug: '_' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params;
  const l: Lang = isLang(lang) ? lang : 'en';
  const p = (await fetchCatalog()).products.find((x) => x.slug === slug);
  if (!p) return { title: getDictionary(l).shop.title, robots: { index: false } };
  const row = p as unknown as Record<string, unknown>;
  return {
    title: pick(row, 'seo_title', l) || pick(row, 'name', l),
    description: pick(row, 'seo_description', l) || pick(row, 'description', l) || undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const { lang: raw, slug } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  const product = (await fetchCatalog()).products.find((x) => x.slug === slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {product ? (
        <ProductView lang={lang} product={product} />
      ) : (
        <NotFoundNotice lang={lang} message={getDictionary(lang).shop.notFound} />
      )}
    </div>
  );
}
