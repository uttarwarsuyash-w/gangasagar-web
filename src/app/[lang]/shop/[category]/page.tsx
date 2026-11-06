import type { Metadata } from 'next';
import { fetchCatalog } from '@/features/catalog/public-api';
import { ShopBrowser } from '@/components/shop/ShopBrowser';
import { NotFoundNotice } from '@/components/shop/NotFoundNotice';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import { isLang, type Lang } from '@/i18n/types';

type Props = { params: Promise<{ lang: string; category: string }> };

export const dynamicParams = false;

/** One page per active category; a placeholder "_" page keeps the build working with none. */
export async function generateStaticParams(): Promise<Array<{ category: string }>> {
  const { categories } = await fetchCatalog();
  return categories.length ? categories.map((c) => ({ category: c.slug })) : [{ category: '_' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, category } = await params;
  const l: Lang = isLang(lang) ? lang : 'en';
  const c = (await fetchCatalog()).categories.find((x) => x.slug === category);
  return { title: c ? pick(c as unknown as Record<string, unknown>, 'name', l) : getDictionary(l).shop.title };
}

export default async function CategoryPage({ params }: Props) {
  const { lang: raw, category } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  const catalog = await fetchCatalog();
  const c = catalog.categories.find((x) => x.slug === category);
  const t = getDictionary(lang);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {c ? (
        <>
          <h1 className="mb-4 text-3xl font-bold">{pick(c as unknown as Record<string, unknown>, 'name', lang)}</h1>
          <ShopBrowser lang={lang} catalog={catalog} categorySlug={c.slug} />
        </>
      ) : (
        <NotFoundNotice lang={lang} message={t.shop.categoryNotFound} />
      )}
    </div>
  );
}
