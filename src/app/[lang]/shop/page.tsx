import type { Metadata } from 'next';
import { fetchCatalog } from '@/features/catalog/public-api';
import { ShopBrowser } from '@/components/shop/ShopBrowser';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLang, type Lang } from '@/i18n/types';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(isLang(lang) ? lang : 'en').shop.title };
}

export default async function ShopPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  const catalog = await fetchCatalog();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-bold">{getDictionary(lang).shop.title}</h1>
      <ShopBrowser lang={lang} catalog={catalog} />
    </div>
  );
}
