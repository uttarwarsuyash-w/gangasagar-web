import { getSupabase } from '@/lib/supabase/client';
import { check } from '@/lib/errors';
import { getMyOrder, type MyOrder, type OrderStatus } from './api';

export interface OrderFilter {
  status?: string;
  /** 'nanded' | 'outside' | 'pickup' (pickup orders have no zone). */
  zone?: string;
  /** YYYY-MM-DD, a whole day in India time. */
  from?: string;
  to?: string;
  search?: string;
}

export interface OrderListRow {
  id: string;
  number: string;
  status: OrderStatus;
  zone: 'nanded' | 'outside' | null;
  fulfilment: MyOrder['fulfilment'];
  total: number;
  payment_method: MyOrder['payment_method'];
  payment_status: MyOrder['payment_status'];
  created_at: string;
  customer: string | null;
  phone: string | null;
}

const IST = '+05:30';
const LIST_LIMIT = 200;
const num = (v: unknown) => Number(v ?? 0);

/** Keeps only characters that cannot break a PostgREST or() filter. */
function cleanSearch(s: string): string {
  return s.replace(/[^\p{L}\p{M}\p{N}\s@.+-]/gu, ' ').replace(/\s+/g, ' ').trim();
}

export async function listOrders(filter: OrderFilter): Promise<OrderListRow[]> {
  let q = getSupabase()
    .from('orders')
    .select('id, number, status, zone, fulfilment, total, payment_method, payment_status, created_at, address');
  if (filter.status) q = q.eq('status', filter.status);
  if (filter.zone === 'pickup') q = q.eq('fulfilment', 'pickup');
  else if (filter.zone) q = q.eq('zone', filter.zone);
  if (filter.from) q = q.gte('created_at', `${filter.from}T00:00:00${IST}`);
  if (filter.to) q = q.lte('created_at', `${filter.to}T23:59:59.999${IST}`);
  const term = cleanSearch(filter.search ?? '');
  if (term) q = q.or(['number', 'address->>name', 'address->>phone'].map((c) => `${c}.ilike.*${term}*`).join(','));
  const rows = check(await q.order('created_at', { ascending: false }).limit(LIST_LIMIT)) as Array<
    Omit<OrderListRow, 'customer' | 'phone' | 'total'> & { total: unknown; address: { name?: string; phone?: string } | null }
  > | null;
  return (rows ?? []).map(({ address, ...r }) => ({
    ...r,
    total: num(r.total),
    customer: address?.name ?? null,
    phone: address?.phone ?? null,
  }));
}

/** Admins read any order through the same RLS-checked query customers use. */
export const getOrder = (id: string): Promise<MyOrder | null> => getMyOrder(id);

export async function confirmOrder(id: string): Promise<void> {
  check(await getSupabase().rpc('admin_confirm_order', { p_order: id }));
}

export async function recordPayment(id: string, reference: string): Promise<void> {
  check(await getSupabase().rpc('admin_record_payment', { p_order: id, p_reference: reference.trim() }));
}

export async function setOrderStatus(id: string, status: OrderStatus, note: string): Promise<void> {
  check(await getSupabase().rpc('admin_set_order_status', { p_order: id, p_status: status, p_note: note }));
}
