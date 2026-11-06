import { Suspense } from 'react';
import { InventoryAdmin } from '@/features/inventory/InventoryAdmin';
import { Spinner } from '@/components/ui/Spinner';
import { isLang } from '@/i18n/types';

export default async function AdminInventoryPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return (
    <Suspense fallback={<Spinner label="…" />}>
      <InventoryAdmin lang={isLang(lang) ? lang : 'en'} />
    </Suspense>
  );
}
