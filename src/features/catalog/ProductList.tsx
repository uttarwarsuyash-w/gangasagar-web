'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';
import type { ProductRow } from './admin-api';

export function ProductList({
  lang,
  products,
  onDelete,
}: {
  lang: Lang;
  products: ProductRow[];
  onDelete: (id: string) => Promise<void> | void;
}) {
  const t = getDictionary(lang);
  const [pending, setPending] = useState<ProductRow | null>(null);
  const [busy, setBusy] = useState(false);

  if (products.length === 0) return <p className="rounded-xl bg-white p-6 text-ink/70">{t.admin.noProducts}</p>;

  return (
    <>
      <ul className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-white">
        {products.map((p) => {
          const name = pick(p as unknown as Record<string, unknown>, 'name', lang);
          return (
            <li key={p.id} className="flex items-center gap-3 px-4 py-3">
              <Link href={localHref(lang, `/admin/products/edit/?id=${p.id}`)} className="min-w-0 flex-1 hover:underline">
                <span className="block truncate font-semibold">{name}</span>
                <span className="block truncate text-sm text-ink/60">
                  {[p.brand, p.category_name, `${p.variant_count} ${t.admin.variants}`].filter(Boolean).join(' · ')}
                </span>
              </Link>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  p.is_active ? 'bg-green-100 text-green-800' : 'bg-ink/10 text-ink/70'
                }`}
              >
                {p.is_active ? t.admin.active : t.admin.hidden}
              </span>
              <Link
                href={localHref(lang, `/admin/products/edit/?id=${p.id}`)}
                aria-label={fill(t.admin.editNamed, { name })}
                className="rounded-full p-2 hover:bg-brand-light"
              >
                <Pencil aria-hidden className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setPending(p)}
                aria-label={fill(t.admin.deleteNamed, { name })}
                className="rounded-full p-2 text-brand-dark hover:bg-brand-light"
              >
                <Trash2 aria-hidden className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pending !== null}
        title={t.admin.deleteProductTitle}
        message={t.admin.deleteProductMessage}
        confirmLabel={t.admin.deleteLabel}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        busy={busy}
        onClose={() => setPending(null)}
        onConfirm={async () => {
          if (!pending) return;
          setBusy(true);
          try {
            await onDelete(pending.id);
          } finally {
            setBusy(false);
            setPending(null);
          }
        }}
      />
    </>
  );
}
