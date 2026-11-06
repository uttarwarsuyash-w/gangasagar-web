import { CategoriesAdmin } from '@/features/catalog/admin/CategoriesAdmin';
import { isLang } from '@/i18n/types';

export default async function AdminCategoriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <CategoriesAdmin lang={isLang(lang) ? lang : 'en'} />;
}
