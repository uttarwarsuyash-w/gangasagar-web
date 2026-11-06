'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardCounts, type DashboardCounts } from '../admin-api';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { Spinner } from '@/components/ui/Spinner';

export function AdminDashboard({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const [counts, setCounts] = useState<DashboardCounts | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    dashboardCounts().then(setCounts, () => setFailed(true));
  }, []);
  if (failed) return <p role="alert">{t.admin.loadFailed}</p>;
  if (!counts) return <Spinner label={t.auth.loading} />;
  const tiles = [
    { label: t.admin.activeProducts, value: counts.activeProducts, href: '/admin/products/' },
    { label: t.admin.newOrders, value: counts.newOrders, href: '/admin/orders/?status=Order%20Placed' },
    { label: t.admin.lowStock, value: counts.lowStock, href: '/admin/inventory/?low=1' },
  ];
  return (
    <section>
      <h1 className="font-display text-4xl leading-none font-semibold text-brand-dark animate-rise">{t.admin.dashboard}</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {tiles.map((tile) => (
          <Link key={tile.href} href={localHref(lang, tile.href)} className="rounded-2xl border border-ink/10 bg-white p-5 hover:border-brand/40">
            <span className="block text-4xl font-bold text-brand">{tile.value}</span>
            <span className="mt-1 block text-ink/70">{tile.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
