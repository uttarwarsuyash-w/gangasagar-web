import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/AdminShell';
import { isLang } from '@/i18n/types';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <AdminShell lang={isLang(lang) ? lang : 'en'}>{children}</AdminShell>;
}
