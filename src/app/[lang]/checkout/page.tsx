import { Suspense } from 'react';
import type { Metadata } from 'next';
import { CheckoutForm } from '@/features/checkout/CheckoutForm';
import { RequireSignIn } from '@/components/auth/RequireSignIn';
import { Spinner } from '@/components/ui/Spinner';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLang, type Lang } from '@/i18n/types';

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  return { title: getDictionary(isLang(lang) ? lang : 'en').checkout.title, robots: { index: false } };
}

export default async function CheckoutPage({ params }: Props) {
  const { lang: raw } = await params;
  const lang: Lang = isLang(raw) ? raw : 'en';
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-3xl font-bold">{getDictionary(lang).checkout.title}</h1>
      <RequireSignIn lang={lang}>
        <Suspense fallback={<Spinner label="…" />}>
          <CheckoutForm lang={lang} />
        </Suspense>
      </RequireSignIn>
    </div>
  );
}
