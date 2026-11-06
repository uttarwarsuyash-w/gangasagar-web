import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';

export function NotFoundNotice({ lang, message }: { lang: Lang; message: string }) {
  const t = getDictionary(lang);
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-brand/15 bg-white p-8 text-center">
      <SearchX aria-hidden className="mx-auto h-10 w-10 text-brand/50" />
      <p className="mt-3 text-xl font-semibold">{message}</p>
      <Link href={localHref(lang, '/shop/')} className="mt-4 inline-block font-semibold text-brand-dark underline">
        {t.common.backToShop}
      </Link>
    </div>
  );
}
