'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { deleteProduct, listProducts, type ProductRow } from '../admin-api';
import { ProductList } from '../ProductList';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { buttonPrimary } from '@/components/ui/Field';
import { errorCode, fill } from '@/lib/errors';

export function ProductsAdmin({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const toast = useToast();
  const [rows, setRows] = useState<ProductRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listProducts().then(setRows, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const reason = (e: unknown) => t.admin.errors[errorCode(e) as keyof typeof t.admin.errors] ?? t.admin.errors.unknown;

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold">{t.admin.products}</h1>
        <Link href={localHref(lang, '/admin/products/edit/')} className={buttonPrimary}>
          <Plus aria-hidden className="h-5 w-5" /> {t.admin.addProduct}
        </Link>
      </div>
      <div className="mt-4">
        {failed ? (
          <p role="alert">{t.admin.loadFailed}</p>
        ) : rows === null ? (
          <Spinner label={t.auth.loading} />
        ) : (
          <ProductList
            lang={lang}
            products={rows}
            onDelete={async (id) => {
              try {
                await deleteProduct(id);
                toast.success(t.admin.deleted);
                load();
              } catch (e) {
                toast.error(fill(t.admin.deleteFailed, { reason: reason(e) }));
              }
            }}
          />
        )}
      </div>
    </section>
  );
}
