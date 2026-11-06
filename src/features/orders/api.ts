import { getSupabase } from '@/lib/supabase/client';
import { AppError, check, errorCode } from '@/lib/errors';
import { toRpcItems, type Fulfilment } from '@/features/cart/pricing';
import type { CartItem } from '@/features/cart/store';
import type { AddressInput } from '@/features/checkout/validation';

export type PaymentMethod = 'cash' | 'upi_on_delivery' | 'upi_prepaid';
export type OrderStatus =
  | 'Order Placed' | 'Order Confirmed' | 'Processing' | 'Dispatched' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface PlaceOrderInput {
  items: CartItem[];
  pincode: string | null;
  fulfilment: Fulfilment;
  paymentMethod: PaymentMethod;
  address: AddressInput | Pick<AddressInput, 'name' | 'phone'>;
  note: string | null;
}

export interface OrderItem {
  id: string;
  product_name_en: string | null;
  product_name_hi: string | null;
  label_en: string | null;
  label_hi: string | null;
  qty: number | null;
  grams: number | null;
  unit_price: number;
  line_total: number;
}

export interface MyOrder {
  id: string;
  number: string;
  status: OrderStatus;
  zone: 'nanded' | 'outside' | null;
  fulfilment: Fulfilment;
  address: Partial<AddressInput> | null;
  pincode: string | null;
  weight_g: number;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: 'unpaid' | 'submitted' | 'paid';
  upi_reference: string | null;
  customer_note: string | null;
  invoice_number: string | null;
  created_at: string;
  items: OrderItem[];
  history: Array<{ status: string; created_at: string; note: string | null }>;
}

export interface PaymentSettings {
  upi_id: string | null;
  upi_qr_url: string | null;
}

const REQUEST_KEY = 'gks-checkout-request-v1';

/** One client_request_id per checkout, kept in sessionStorage so a retry after a network error reuses it. */
function requestId(): string {
  try {
    const existing = sessionStorage.getItem(REQUEST_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(REQUEST_KEY, id);
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID());
  }
}
let memoryId: string | null = null;

function finishCheckout() {
  memoryId = null;
  try {
    sessionStorage.removeItem(REQUEST_KEY);
  } catch {
    // ignore
  }
}

export async function placeOrder(input: PlaceOrderInput): Promise<string> {
  const args = {
    p_client_request_id: requestId(),
    p_items: toRpcItems(input.items),
    p_pincode: input.pincode,
    p_fulfilment: input.fulfilment,
    p_payment_method: input.paymentMethod,
    p_address: input.address,
    p_note: input.note,
  };
  let res;
  try {
    res = await getSupabase().rpc('place_order', args);
  } catch (e) {
    throw new AppError(errorCode(e));
  }
  const id = check(res) as string;
  finishCheckout();
  return id;
}

const num = (v: unknown) => Number(v ?? 0);

export async function getMyOrder(id: string): Promise<MyOrder | null> {
  const row = check(
    await getSupabase()
      .from('orders')
      .select('*, items:order_items(*), history:order_status_history(status, created_at, note)')
      .eq('id', id)
      .maybeSingle(),
  ) as (MyOrder & { items: Array<Record<string, unknown>> }) | null;
  if (!row) return null;
  return {
    ...row,
    subtotal: num(row.subtotal),
    delivery_fee: num(row.delivery_fee),
    total: num(row.total),
    items: (row.items ?? []).map((i) => ({ ...(i as unknown as OrderItem), unit_price: num(i.unit_price), line_total: num(i.line_total) })),
    history: [...(row.history ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const row = check(await getSupabase().from('site_settings').select('value').eq('key', 'payment').maybeSingle()) as
    | { value: PaymentSettings }
    | null;
  return { upi_id: row?.value?.upi_id ?? null, upi_qr_url: row?.value?.upi_qr_url ?? null };
}

export async function submitPaymentReference(id: string, reference: string): Promise<void> {
  check(await getSupabase().rpc('submit_payment_reference', { p_order: id, p_reference: reference.trim() }));
}
