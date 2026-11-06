'use client';

import { useState } from 'react';
import { CheckCircle2, Clock, MessageCircle } from 'lucide-react';
import { TextField, buttonPrimary, buttonSecondary } from '@/components/ui/Field';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { errorCode, fill } from '@/lib/errors';
import { statusMessage, waLink } from '@/lib/whatsapp';
import type { OrderStatus } from '@/features/orders/api';
import type { Fulfilment } from '@/features/cart/pricing';

export interface ActionOrder {
  id: string;
  number: string;
  total: number;
  status: OrderStatus;
  fulfilment: Fulfilment;
  zone: 'nanded' | 'outside' | null;
  payment_status: 'unpaid' | 'submitted' | 'paid';
  upi_reference: string | null;
  phone: string | null;
}

/** Mirrors admin_set_order_status: one step forward; pickup skips Dispatched/Out for Delivery. */
export function nextStatus(o: Pick<ActionOrder, 'status' | 'fulfilment'>): OrderStatus | null {
  switch (o.status) {
    case 'Order Confirmed':
      return 'Processing';
    case 'Processing':
      return o.fulfilment === 'pickup' ? 'Delivered' : 'Dispatched';
    case 'Dispatched':
      return 'Out for Delivery';
    case 'Out for Delivery':
      return 'Delivered';
    default:
      return null;
  }
}

export function OrderStatusActions({
  lang,
  order,
  confirm,
  recordPayment,
  setStatus,
  onChanged,
}: {
  lang: Lang;
  order: ActionOrder;
  confirm: (id: string) => Promise<void>;
  recordPayment: (id: string, reference: string) => Promise<void>;
  setStatus: (id: string, status: OrderStatus, note: string) => Promise<void>;
  onChanged: () => void;
}) {
  const t = getDictionary(lang);
  const o = t.admin.ordersPage;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [reference, setReference] = useState(order.upi_reference ?? '');

  const statusLabel = (s: string) => t.order.statuses[s as keyof typeof t.order.statuses] ?? s;
  const waitingForPayment = order.zone === 'outside' && order.status === 'Order Confirmed' && order.payment_status !== 'paid';
  const next = nextStatus(order);
  const canRecordPayment = order.payment_status !== 'paid' && order.status !== 'Order Placed' && order.status !== 'Cancelled';

  async function run(fn: () => Promise<void>, success: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      await fn();
      setDone(success);
      setNote('');
      onChanged();
    } catch (e) {
      const code = errorCode(e) as keyof typeof t.admin.errors;
      setError(t.admin.errors[code] ?? t.admin.errors.unknown);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="order-actions" className="space-y-3 rounded-2xl border border-ink/10 bg-white p-4">
      <h2 id="order-actions" className="font-semibold">{o.actions}</h2>

      {order.status === 'Order Placed' && (
        <div>
          <button type="button" className={buttonPrimary} disabled={busy} onClick={() => run(() => confirm(order.id), fill(o.statusChanged, { status: statusLabel('Order Confirmed') }))}>
            {o.confirm}
          </button>
          <p className="mt-1 text-sm text-ink/60">{o.confirmHint}</p>
        </div>
      )}

      {waitingForPayment && (
        <div className="rounded-xl bg-accent/15 p-3">
          <p className="flex items-center gap-2 font-semibold">
            <Clock aria-hidden className="h-5 w-5" /> {o.waitingForPayment}
          </p>
          <p className="text-sm text-ink/70">{o.waitingHint}</p>
          {order.payment_status === 'submitted' && order.upi_reference && (
            <p className="mt-1 text-sm font-medium">{fill(o.submittedRef, { ref: order.upi_reference })}</p>
          )}
        </div>
      )}

      {next && !waitingForPayment && (
        <div className="space-y-2">
          <TextField label={o.note} value={note} onChange={setNote} maxLength={300} />
          <button
            type="button"
            className={buttonPrimary}
            disabled={busy}
            onClick={() => run(() => setStatus(order.id, next, note.trim()), fill(o.statusChanged, { status: statusLabel(next) }))}
          >
            {fill(o.moveTo, { status: statusLabel(next) })}
          </button>
        </div>
      )}

      {canRecordPayment && (
        <div className="flex flex-col gap-2 border-t border-ink/10 pt-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <TextField label={o.paymentReference} value={reference} onChange={setReference} maxLength={30} />
          </div>
          <button type="button" className={buttonSecondary} disabled={busy} onClick={() => run(() => recordPayment(order.id, reference.trim()), o.paymentRecorded)}>
            {o.recordPayment}
          </button>
        </div>
      )}
      {order.payment_status === 'paid' && (
        <p className="flex items-center gap-2 text-green-800">
          <CheckCircle2 aria-hidden className="h-5 w-5" /> {o.paid}
        </p>
      )}
      {order.status === 'Delivered' && <p className="text-ink/70">{o.done}</p>}

      {error && (
        <p role="alert" className="rounded-lg bg-brand-light px-3 py-2 text-brand-dark">
          {error}
        </p>
      )}
      {done && (
        <p role="status" className="rounded-lg bg-green-50 px-3 py-2 text-green-900">
          {done}
        </p>
      )}

      <div className="border-t border-ink/10 pt-3">
        {order.phone ? (
          <a
            href={waLink(order.phone, statusMessage(order, order.status, lang))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-800"
          >
            <MessageCircle aria-hidden className="h-5 w-5" /> {o.sendWhatsApp}
          </a>
        ) : (
          <p className="text-sm text-ink/60">{o.noPhone}</p>
        )}
      </div>
    </section>
  );
}
