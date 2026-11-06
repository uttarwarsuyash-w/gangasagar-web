'use client';

import { useState } from 'react';
import { History, PackagePlus } from 'lucide-react';
import { Checkbox } from '@/components/ui/Field';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';
import { isLow, type StockRow } from './api';

export function StockTable({
  lang,
  rows,
  initialLowOnly = false,
  onAdjust,
  onHistory,
}: {
  lang: Lang;
  rows: StockRow[];
  initialLowOnly?: boolean;
  onAdjust: (row: StockRow) => void;
  onHistory: (row: StockRow) => void;
}) {
  const t = getDictionary(lang);
  const s = t.admin.stock;
  const [lowOnly, setLowOnly] = useState(initialLowOnly);
  const shown = lowOnly ? rows.filter(isLow) : rows;
  const name = (r: StockRow) => (lang === 'hi' && r.productNameHi?.trim() ? r.productNameHi : r.productName);
  const label = (r: StockRow) => (lang === 'hi' && r.labelHi?.trim() ? r.labelHi : r.label);

  return (
    <div>
      <Checkbox label={s.lowOnly} checked={lowOnly} onChange={setLowOnly} />
      <div className="mt-3 overflow-x-auto rounded-xl border border-ink/10 bg-white">
        <table className="w-full text-left">
          <thead className="bg-brand-light/60 text-sm">
            <tr>
              <th scope="col" className="px-3 py-2">{s.product}</th>
              <th scope="col" className="px-3 py-2">{s.inStock}</th>
              <th scope="col" className="px-3 py-2">{s.minimum}</th>
              <th scope="col" className="px-3 py-2"><span className="sr-only">{s.adjust}</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-ink/60">
                  {lowOnly ? s.noLowRows : s.noRows}
                </td>
              </tr>
            ) : (
              shown.map((r) => (
                <tr key={r.variantId}>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{name(r)}</span>
                    <span className="block text-sm text-ink/60">{label(r)}</span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.stockQty} {r.stockUnit === 'kg' ? s.kg : s.packs}
                    {isLow(r) && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white">{s.low}</span>}
                  </td>
                  <td className="px-3 py-2">{r.minStock ?? '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => onAdjust(r)} aria-label={fill(s.adjustNamed, { name: `${r.productName} ${r.label}` })} className="rounded-full p-2 hover:bg-brand-light">
                        <PackagePlus aria-hidden className="h-5 w-5" />
                      </button>
                      <button type="button" onClick={() => onHistory(r)} aria-label={fill(s.historyNamed, { name: `${r.productName} ${r.label}` })} className="rounded-full p-2 hover:bg-brand-light">
                        <History aria-hidden className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
