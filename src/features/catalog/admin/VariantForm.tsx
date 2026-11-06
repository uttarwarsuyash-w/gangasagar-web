'use client';

import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Checkbox, TextField, buttonPrimary, buttonSecondary, fromNum, toNum } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import type { Dictionary } from '@/i18n/get-dictionary';
import { errorCode, fill } from '@/lib/errors';
import { saveVariant, type VariantRow } from '../admin-api';
import { validateVariant, type VariantInput } from '../validation';

type Draft = Record<
  'label_en' | 'label_hi' | 'net_weight_g' | 'pack_type' | 'retail_price' | 'mrp' | 'sale_price' | 'sale_ends_at' |
  'loose_min_g' | 'loose_step_g' | 'min_stock' | 'limited_below' | 'sort',
  string
> & { is_loose: boolean; is_active: boolean };

function toDraft(v: Partial<VariantRow> | null): Draft {
  return {
    label_en: v?.label_en ?? '',
    label_hi: v?.label_hi ?? '',
    net_weight_g: fromNum(v?.net_weight_g),
    pack_type: v?.pack_type ?? '',
    retail_price: fromNum(v?.retail_price),
    mrp: fromNum(v?.mrp),
    sale_price: fromNum(v?.sale_price),
    sale_ends_at: v?.sale_ends_at ? toLocalInput(v.sale_ends_at) : '',
    loose_min_g: fromNum(v?.loose_min_g ?? 250),
    loose_step_g: fromNum(v?.loose_step_g ?? 250),
    min_stock: fromNum(v?.min_stock),
    limited_below: fromNum(v?.limited_below),
    sort: fromNum(v?.sort ?? 0),
    is_loose: v?.is_loose ?? false,
    is_active: v?.is_active ?? true,
  };
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VariantForm({
  t,
  productId,
  variant,
  open,
  onClose,
  onSaved,
}: {
  t: Dictionary;
  productId: string;
  variant: VariantRow | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [d, setD] = useState<Draft>(() => toDraft(variant));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const f = t.admin.fields;
  const err = (k: string) => (errors[k] ? t.admin.errors[errors[k] as keyof typeof t.admin.errors] : undefined);
  const set = (k: keyof Draft) => (v: string | boolean) => setD((x) => ({ ...x, [k]: v }));

  async function save() {
    const input: VariantInput = {
      id: variant?.id,
      product_id: productId,
      label_en: d.label_en.trim(),
      label_hi: d.label_hi.trim() || null,
      net_weight_g: d.is_loose ? 1000 : (toNum(d.net_weight_g) ?? NaN),
      pack_type: d.pack_type.trim() || null,
      retail_price: toNum(d.retail_price) ?? NaN,
      mrp: toNum(d.mrp),
      sale_price: toNum(d.sale_price),
      sale_ends_at: d.sale_ends_at ? new Date(d.sale_ends_at).toISOString() : null,
      is_loose: d.is_loose,
      loose_min_g: d.is_loose ? toNum(d.loose_min_g) : null,
      loose_step_g: d.is_loose ? toNum(d.loose_step_g) : null,
      min_stock: toNum(d.min_stock),
      limited_below: toNum(d.limited_below),
      is_active: d.is_active,
      sort: toNum(d.sort) ?? 0,
    };
    const found = validateVariant(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await saveVariant(input);
      toast.success(t.admin.saved);
      onSaved();
    } catch (e) {
      const code = errorCode(e) as keyof typeof t.admin.errors;
      toast.error(fill(t.admin.saveFailed, { reason: t.admin.errors[code] ?? t.admin.errors.unknown }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      title={variant ? `${t.admin.variants}: ${variant.label_en}` : t.admin.addVariant}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={buttonSecondary} onClick={onClose}>
            {t.common.cancel}
          </button>
          <button type="button" className={buttonPrimary} onClick={save} disabled={busy}>
            {busy ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Checkbox label={f.isLoose} checked={d.is_loose} onChange={set('is_loose')} />
        </div>
        <TextField label={f.labelEn} value={d.label_en} onChange={set('label_en')} error={err('label_en')} />
        <TextField label={f.labelHi} value={d.label_hi} onChange={set('label_hi')} lang="hi" />
        {!d.is_loose && (
          <TextField label={f.netWeight} value={d.net_weight_g} onChange={set('net_weight_g')} inputMode="numeric" error={err('net_weight_g')} />
        )}
        <TextField label={f.packType} value={d.pack_type} onChange={set('pack_type')} />
        <TextField
          label={d.is_loose ? f.retailPricePerKg : f.retailPrice}
          value={d.retail_price}
          onChange={set('retail_price')}
          inputMode="decimal"
          error={err('retail_price')}
        />
        <TextField label={f.mrp} value={d.mrp} onChange={set('mrp')} inputMode="decimal" error={err('mrp')} />
        <TextField label={f.salePrice} value={d.sale_price} onChange={set('sale_price')} inputMode="decimal" error={err('sale_price')} />
        <TextField label={f.saleEndsAt} type="datetime-local" value={d.sale_ends_at} onChange={set('sale_ends_at')} error={err('sale_ends_at')} />
        {d.is_loose && (
          <>
            <TextField label={f.looseMin} value={d.loose_min_g} onChange={set('loose_min_g')} inputMode="numeric" error={err('loose_min_g')} />
            <TextField label={f.looseStep} value={d.loose_step_g} onChange={set('loose_step_g')} inputMode="numeric" error={err('loose_step_g')} />
          </>
        )}
        <TextField label={f.minStock} value={d.min_stock} onChange={set('min_stock')} inputMode="decimal" error={err('min_stock')} />
        <TextField label={f.limitedBelow} value={d.limited_below} onChange={set('limited_below')} inputMode="decimal" error={err('limited_below')} />
        <TextField label={f.sort} value={d.sort} onChange={set('sort')} inputMode="numeric" />
        <div className="sm:col-span-2">
          <Checkbox label={f.isActive} checked={d.is_active} onChange={set('is_active')} />
        </div>
      </div>
    </Dialog>
  );
}
