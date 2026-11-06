import type { Metadata } from 'next';
import { CartView } from '@/components/cart/CartView';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLang, type Lang } from '@/i18n/types';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(isLang(lang) ? lang : 'en').cart.title, robots: { index: false } };
}

export default async function CartPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-5 inline-block animate-rise border-b-4 border-accent pb-1 font-display text-5xl leading-none font-semibold text-brand-dark">{getDictionary(lang).cart.title}</h1>
      <CartView lang={lang} />
    </div>
  );
}
