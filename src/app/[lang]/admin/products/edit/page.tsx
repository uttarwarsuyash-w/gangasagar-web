import { Suspense } from 'react';
import { ProductEditor } from '@/features/catalog/admin/ProductEditor';
import { Spinner } from '@/components/ui/Spinner';
import { isLang } from '@/i18n/types';

export default async function AdminProductEditPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = isLang(lang) ? lang : 'en';
  return (
    <Suspense fallback={<Spinner label="…" />}>
      <ProductEditor lang={l} />
    </Suspense>
  );
}
