import { ProductsAdmin } from '@/features/catalog/admin/ProductsAdmin';
import { isLang } from '@/i18n/types';

export default async function AdminProductsPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <ProductsAdmin lang={isLang(lang) ? lang : 'en'} />;
}
