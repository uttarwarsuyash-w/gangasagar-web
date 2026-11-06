import { getSupabase } from '@/lib/supabase/client';
import { check } from '@/lib/errors';

export interface StockRow {
  variantId: string;
  productName: string;
  productNameHi: string | null;
  label: string;
  labelHi: string | null;
  stockQty: number;
  stockUnit: 'packs' | 'kg';
  minStock: number | null;
  limitedBelow: number | null;
}

export type AdjustKind = 'incoming' | 'damaged' | 'expired' | 'adjustment';

export interface Movement {
  id: string;
  kind: string;
  qty: number;
  note: string | null;
  orderId: string | null;
  createdAt: string;
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function listStock(): Promise<StockRow[]> {
  const rows = check(
    await getSupabase()
      .from('variants')
      .select('id, label_en, label_hi, stock_qty, stock_unit, min_stock, limited_below, sort, product:products(name_en, name_hi)')
      .order('sort'),
  ) as unknown as Array<Record<string, unknown>>;
  return rows
    .map((r) => {
      const p = (r.product ?? {}) as { name_en?: string; name_hi?: string | null };
      return {
        variantId: r.id as string,
        productName: p.name_en ?? '',
        productNameHi: p.name_hi ?? null,
        label: r.label_en as string,
        labelHi: (r.label_hi as string) ?? null,
        stockQty: Number(r.stock_qty),
        stockUnit: r.stock_unit as 'packs' | 'kg',
        minStock: n(r.min_stock),
        limitedBelow: n(r.limited_below),
      };
    })
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

/** Calls admin_adjust_stock; returns the new quantity. */
export async function adjustStock(variantId: string, kind: AdjustKind, qty: number, note: string): Promise<number> {
  const data = check(
    await getSupabase().rpc('admin_adjust_stock', { p_variant: variantId, p_kind: kind, p_qty: qty, p_note: note }),
  );
  return Number(data);
}

export async function listMovements(variantId: string): Promise<Movement[]> {
  const rows = check(
    await getSupabase()
      .from('stock_movements')
      .select('id, kind, qty, note, order_id, created_at')
      .eq('variant_id', variantId)
      .order('created_at', { ascending: false })
      .limit(100),
  ) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    kind: r.kind as string,
    qty: Number(r.qty),
    note: (r.note as string) ?? null,
    orderId: (r.order_id as string) ?? null,
    createdAt: r.created_at as string,
  }));
}

export const isLow = (r: StockRow) => r.minStock !== null && r.stockQty < r.minStock;
