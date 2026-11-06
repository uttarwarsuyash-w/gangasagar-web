import { Suspense } from 'react';
import { AdminOrderView } from '@/features/orders/admin/AdminOrderView';
import { Spinner } from '@/components/ui/Spinner';
import { isLang } from '@/i18n/types';

export default async function AdminOrderViewPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <Suspense fallback={<Spinner label="…" />}>
      <AdminOrderView lang={isLang(lang) ? lang : 'en'} />
    </Suspense>
  );
}
