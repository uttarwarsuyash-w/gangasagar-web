'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Boxes, ClipboardList, FolderTree, LayoutDashboard, Package } from 'lucide-react';
import { AdminGuard } from './AdminGuard';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';

export function AdminShell({ lang, children }: { lang: Lang; children: ReactNode }) {
  const t = getDictionary(lang).admin;
  const pathname = usePathname() ?? '';
  const links = [
    { href: '/admin/', label: t.dashboard, icon: LayoutDashboard, exact: true },
    { href: '/admin/orders/', label: t.orders, icon: ClipboardList },
    { href: '/admin/products/', label: t.products, icon: Package },
    { href: '/admin/categories/', label: t.categories, icon: FolderTree },
    { href: '/admin/inventory/', label: t.inventory, icon: Boxes },
  ];
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <AdminGuard lang={lang}>
        <div className="flex flex-col gap-6 md:flex-row">
          <nav aria-label={t.title} className="md:w-52 md:shrink-0">
            <p className="mb-2 hidden text-sm font-semibold uppercase tracking-wide text-ink/60 md:block">{t.title}</p>
            <ul className="flex gap-1 overflow-x-auto md:flex-col">
              {links.map(({ href, label, icon: Icon, exact }) => {
                const full = localHref(lang, href);
                const current = exact ? pathname === full : pathname.startsWith(full);
                return (
                  <li key={href}>
                    <Link
                      href={full}
                      aria-current={current ? 'page' : undefined}
                      className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 font-medium ${
                        current ? 'bg-brand text-white' : 'hover:bg-brand-light'
                      }`}
                    >
                      <Icon aria-hidden className="h-4 w-4" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </AdminGuard>
    </div>
  );
}
