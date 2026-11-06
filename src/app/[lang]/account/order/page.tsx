import { Suspense } from 'react';
import type { Metadata } from 'next';
import { OrderPage } from '@/features/orders/OrderPage';
import { Spinner } from '@/components/ui/Spinner';
import { isLang } from '@/i18n/types';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AccountOrderPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Suspense fallback={<Spinner label="…" />}>
        <OrderPage lang={isLang(lang) ? lang : 'en'} />
      </Suspense>
    </div>
  );
}
