'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdjustStockDialog } from './AdjustStockDialog';
import { StockTable } from './StockTable';
import { listMovements, listStock, type Movement, type StockRow } from './api';
import { Dialog } from '@/components/ui/Dialog';
import { Spinner } from '@/components/ui/Spinner';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';

export function InventoryAdmin({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const s = t.admin.stock;
  const low = useSearchParams().get('low') === '1';
  const [rows, setRows] = useState<StockRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [adjusting, setAdjusting] = useState<StockRow | null>(null);
  const [history, setHistory] = useState<{ row: StockRow; items: Movement[] | null } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listStock().then(
      (r) => active && setRows(r),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [version]);

  const openHistory = useCallback((row: StockRow) => {
    setHistory({ row, items: null });
    listMovements(row.variantId).then(
      (items) => setHistory((h) => (h && h.row.variantId === row.variantId ? { row, items } : h)),
      () => setHistory((h) => (h ? { row, items: [] } : h)),
    );
  }, []);

  const dateFmt = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <section>
      <h1 className="font-display text-4xl leading-none font-semibold text-brand-dark animate-rise">{s.title}</h1>
      <div className="mt-4">
        {failed ? (
          <p role="alert">{t.admin.loadFailed}</p>
        ) : rows === null ? (
          <Spinner label={t.auth.loading} />
        ) : (
          <StockTable lang={lang} rows={rows} initialLowOnly={low} onAdjust={setAdjusting} onHistory={openHistory} />
        )}
      </div>

      {adjusting && (
        <AdjustStockDialog
          key={adjusting.variantId}
          lang={lang}
          row={adjusting}
          open
          onClose={() => setAdjusting(null)}
          onSaved={() => {
            setAdjusting(null);
            setVersion((v) => v + 1);
          }}
        />
      )}

      <Dialog
        open={history !== null}
        title={history ? fill(s.historyNamed, { name: `${history.row.productName} ${history.row.label}` }) : ''}
        closeLabel={t.common.close}
        onClose={() => setHistory(null)}
      >
        {history?.items === null ? (
          <Spinner label={t.auth.loading} />
        ) : history && history.items.length === 0 ? (
          <p className="text-ink/60">{s.noMovements}</p>
        ) : (
          <ul className="divide-y divide-ink/10">
            {history?.items?.map((m) => (
              <li key={m.id} className="flex items-baseline gap-3 py-2">
                <span className={`w-20 shrink-0 font-semibold ${m.qty < 0 ? 'text-brand-dark' : 'text-green-700'}`}>
                  {m.qty > 0 ? '+' : ''}
                  {m.qty}
                </span>
                <span className="flex-1">
                  {s.kinds[m.kind as keyof typeof s.kinds] ?? m.kind}
                  {m.note && <span className="block text-sm text-ink/60">{m.note}</span>}
                </span>
                <span className="text-sm text-ink/60">{dateFmt.format(new Date(m.createdAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </Dialog>
    </section>
  );
}
