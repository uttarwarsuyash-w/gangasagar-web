import { Suspense } from 'react';
import { OrdersAdmin } from '@/features/orders/admin/OrdersAdmin';
import { Spinner } from '@/components/ui/Spinner';
import { isLang } from '@/i18n/types';

export default async function AdminOrdersPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <Suspense fallback={<Spinner label="…" />}>
      <OrdersAdmin lang={isLang(lang) ? lang : 'en'} />
    </Suspense>
  );
}
