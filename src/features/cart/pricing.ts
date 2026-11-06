import { getSupabase } from '@/lib/supabase/client';
import { check } from '@/lib/errors';
import { BUSINESS } from '@/config/business';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { formatWeight } from '@/lib/money';
import { waLink } from '@/lib/whatsapp';
import type { StockLabel } from '@/features/catalog/types';
import type { CartItem } from './store';

export type Fulfilment = 'pickup' | 'delivery' | 'courier' | 'transport';

export interface PricedLine {
  variant_id: string;
  name_en: string | null;
  name_hi: string | null;
  label_en: string | null;
  label_hi: string | null;
  qty: number | null;
  grams: number | null;
  unit_price: number | null;
  line_total: number | null;
  weight_g: number;
  stock_label: StockLabel | null;
  is_loose?: boolean;
  /** Loose lines only: the smallest amount and the step in grams. */
  loose_min_g?: number | null;
  loose_step_g?: number | null;
}

export interface CartPrice {
  lines: PricedLine[];
  weight_g: number;
  subtotal: number;
  zone: 'nanded' | 'outside' | null;
  delivery_fee: number | null;
  total: number | null;
  requires_quotation: boolean;
  errors: Array<{ code: string; variant_id?: string }>;
}

export function toRpcItems(items: CartItem[]) {
  return items.map((i) => (i.grams !== undefined ? { variant_id: i.variantId, grams: i.grams } : { variant_id: i.variantId, qty: i.qty }));
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** All amounts come from the database's price_cart; the browser only displays them. */
export async function priceCart(items: CartItem[], pincode: string | null, fulfilment: Fulfilment): Promise<CartPrice> {
  const data = check(
    await getSupabase().rpc('price_cart', { p_items: toRpcItems(items), p_pincode: pincode, p_fulfilment: fulfilment }),
  ) as CartPrice;
  return {
    ...data,
    subtotal: Number(data.subtotal ?? 0),
    delivery_fee: n(data.delivery_fee),
    total: n(data.total),
    lines: (data.lines ?? []).map((l) => ({ ...l, unit_price: n(l.unit_price), line_total: n(l.line_total) })),
    errors: data.errors ?? [],
  };
}

/** Until Plan 2's quotation form: a WhatsApp message listing the cart. */
export function buildQuotationWhatsAppLink(
  lines: Array<Pick<PricedLine, 'name_en' | 'name_hi' | 'label_en' | 'label_hi' | 'qty' | 'grams'>>,
  lang: Lang,
): string {
  const t = getDictionary(lang).cart;
  const rows = lines.map((l) => {
    const r = l as unknown as Record<string, unknown>;
    const name = [pick(r, 'name', lang), pick(r, 'label', lang)].filter(Boolean).join(' ');
    return `- ${name} ${l.grams ? formatWeight(l.grams) : `× ${l.qty ?? 1}`}`;
  });
  return waLink(BUSINESS.whatsapp.main, [t.quotationMessage, ...rows].join('\n'));
}
