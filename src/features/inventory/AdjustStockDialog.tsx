'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SelectField, TextField, buttonPrimary, buttonSecondary } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { errorCode, fill } from '@/lib/errors';
import { adjustStock, type AdjustKind, type StockRow } from './api';

const KINDS: AdjustKind[] = ['incoming', 'damaged', 'expired', 'adjustment'];

export function AdjustStockDialog({
  lang,
  row,
  open,
  onClose,
  onSaved,
}: {
  lang: Lang;
  row: StockRow;
  open: boolean;
  onClose: () => void;
  onSaved: (newQty: number) => void;
}) {
  const t = getDictionary(lang);
  const s = t.admin.stock;
  const toast = useToast();
  const [kind, setKind] = useState<AdjustKind>('incoming');
  const [qtyText, setQtyText] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qty = qtyText.trim() === '' ? NaN : Number(qtyText);
  const valid = Number.isFinite(qty) && (kind === 'adjustment' ? qty !== 0 : qty > 0);
  const unit = row.stockUnit === 'kg' ? s.kg : s.packs;
  const name = `${row.productName} ${row.label}`;

  async function save() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const next = await adjustStock(row.variantId, kind, qty, note);
      toast.success(fill(s.newQuantity, { qty: String(next), unit }));
      onSaved(next);
    } catch (e) {
      const code = errorCode(e) as keyof typeof t.admin.errors;
      setError(t.admin.errors[code] ?? t.admin.errors.unknown);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={fill(s.adjustNamed, { name })}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonSecondary} onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="button" className={buttonPrimary} onClick={save} disabled={!valid || busy}>
            {busy ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <p className="mb-3 text-ink/70">
        {s.inStock}: <strong>{row.stockQty}</strong> {unit}
      </p>
      <div className="grid gap-3">
        <SelectField label={s.kind} value={kind} onChange={(v) => setKind(v as AdjustKind)} options={KINDS.map((k) => ({ value: k, label: s.kinds[k] }))} />
        <TextField
          label={fill(s.quantity, { unit })}
          value={qtyText}
          onChange={setQtyText}
          inputMode={kind === 'adjustment' ? 'text' : 'decimal'}
          hint={kind === 'adjustment' ? s.adjustmentHint : undefined}
        />
        <TextField label={s.note} value={note} onChange={setNote} maxLength={300} />
        {error && (
          <p role="alert" className="rounded-lg bg-brand-light px-3 py-2 text-brand-dark">
            {error}
          </p>
        )}
      </div>
    </Dialog>
  );
}
