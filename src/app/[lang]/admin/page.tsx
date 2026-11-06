import { AdminDashboard } from '@/features/catalog/admin/AdminDashboard';
import { isLang } from '@/i18n/types';

export default async function AdminHome({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <AdminDashboard lang={isLang(lang) ? lang : 'en'} />;
}
