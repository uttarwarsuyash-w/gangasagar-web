'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle2, MessageCircle, QrCode } from 'lucide-react';
import { TextField, buttonPrimary } from '@/components/ui/Field';
import { BUSINESS } from '@/config/business';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { errorCode, fill } from '@/lib/errors';
import { formatRupees, formatWeight } from '@/lib/money';
import { waLink } from '@/lib/whatsapp';
import { submitPaymentReference, type MyOrder, type PaymentSettings } from './api';

const REF_RE = /^[A-Za-z0-9]{6,30}$/;

/** The UPI box shows only for an outside-Nanded order that is confirmed and not yet paid. */
export function needsUpiPayment(o: Pick<MyOrder, 'zone' | 'status' | 'payment_status'>): boolean {
  return o.zone === 'outside' && o.status === 'Order Confirmed' && o.payment_status === 'unpaid';
}

function UpiBox({ lang, order, payment, onChanged }: { lang: Lang; order: MyOrder; payment: PaymentSettings; onChanged: () => void }) {
  const t = getDictionary(lang);
  const o = t.order;
  const [ref, setRef] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function send() {
    const v = ref.trim();
    if (!REF_RE.test(v)) {
      setError(o.referenceInvalid);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitPaymentReference(order.id, v);
      setSent(true);
      onChanged();
    } catch (e) {
      const code = errorCode(e);
      setError(code === 'invalid_reference' ? o.referenceInvalid : t.admin.errors[code as keyof typeof t.admin.errors] ?? t.common.somethingWrong);
    } finally {
      setBusy(false);
    }
  }

  if (sent) return <p role="status" className="rounded-2xl bg-green-50 p-4 text-green-900">{o.referenceSent}</p>;

  return (
    <section aria-labelledby="pay-now" className="rounded-2xl border-2 border-accent bg-accent/10 p-4">
      <h2 id="pay-now" className="flex items-center gap-2 text-xl font-bold">
        <QrCode aria-hidden className="h-6 w-6" /> {o.payNow}
      </h2>
      {payment.upi_id || payment.upi_qr_url ? (
        <>
          <p className="mt-2">{fill(o.payNowText, { amount: formatRupees(order.total) })}</p>
          {payment.upi_id && (
            <p className="mt-3">
              <span className="text-sm text-ink/70">{o.upiId}: </span>
              <span className="select-all rounded bg-white px-2 py-1 font-mono text-lg font-semibold">{payment.upi_id}</span>
            </p>
          )}
          {payment.upi_qr_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={payment.upi_qr_url} alt={o.upiQr} className="mt-3 h-56 w-56 rounded-xl bg-white object-contain p-2" />
          )}
        </>
      ) : (
        <p className="mt-2">{o.upiMissing}</p>
      )}
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="flex-1">
          <TextField label={o.reference} value={ref} onChange={setRef} hint={o.referenceHint} error={error ?? undefined} maxLength={30} />
        </div>
        <button type="submit" className={buttonPrimary} disabled={busy}>
          {o.sendReference}
        </button>
      </form>
    </section>
  );
}

export function OrderDetails({
  lang,
  order,
  payment,
  placed = false,
  onChanged,
  adminActions,
}: {
  lang: Lang;
  order: MyOrder;
  payment: PaymentSettings;
  placed?: boolean;
  onChanged: () => void;
  /** Admin view: shows these actions instead of the customer's UPI box and help link, plus notes and weight. */
  adminActions?: ReactNode;
}) {
  const admin = adminActions !== undefined;
  const t = getDictionary(lang);
  const o = t.order;
  const status = (s: string) => o.statuses[s as keyof typeof o.statuses] ?? s;
  const dateFmt = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });
  const payLabel: Record<MyOrder['payment_method'], string> = {
    cash: t.checkout.cash,
    upi_on_delivery: t.checkout.upiOnDelivery,
    upi_prepaid: t.checkout.upiPrepaid,
  };
  const a = order.address ?? {};

  return (
    <div className="space-y-5">
      {placed && (
        <p role="status" className="flex items-center gap-2 rounded-2xl bg-green-50 p-4 text-lg font-semibold text-green-900">
          <CheckCircle2 aria-hidden className="h-6 w-6" /> {o.thanks}
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold">{fill(o.title, { number: order.number })}</h1>
        <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">{status(order.status)}</span>
      </div>
      <p className="text-sm text-ink/60">
        {o.placedOn}: {dateFmt.format(new Date(order.created_at))}
        {order.invoice_number ? ` · ${o.invoice}: ${order.invoice_number}` : ''}
      </p>

      {admin ? adminActions : needsUpiPayment(order) && <UpiBox lang={lang} order={order} payment={payment} onChanged={onChanged} />}

      <section className="rounded-2xl border border-ink/10 bg-white p-4">
        <h2 className="font-semibold">{o.items}</h2>
        <ul className="mt-2 divide-y divide-ink/10">
          {order.items.map((i) => {
            const r = i as unknown as Record<string, unknown>;
            return (
              <li key={i.id} className="flex justify-between gap-3 py-2">
                <span>
                  {pick(r, 'product_name', lang)} {pick(r, 'label', lang)} {i.grams ? formatWeight(i.grams) : `× ${i.qty}`}
                </span>
                <span className="font-semibold">{formatRupees(i.line_total)}</span>
              </li>
            );
          })}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-ink/10 pt-2">
          <div className="flex justify-between">
            <dt>{t.cart.subtotal}</dt>
            <dd>{formatRupees(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>{t.cart.delivery}</dt>
            <dd>{order.delivery_fee === 0 ? t.cart.free : formatRupees(order.delivery_fee)}</dd>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <dt>{t.cart.total}</dt>
            <dd className="text-brand-dark">{formatRupees(order.total)}</dd>
          </div>
        </dl>
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">{order.fulfilment === 'pickup' ? o.pickupAtShop : o.deliverTo}</h2>
          <p className="mt-1 whitespace-pre-line text-ink/80">
            {[a.name, a.phone, a.line1, a.line2, a.landmark, [a.city, a.pincode].filter(Boolean).join(' '), a.state].filter(Boolean).join('\n')}
          </p>
          {admin && (
            <p className="mt-2 text-sm text-ink/70">
              {t.admin.ordersPage.fulfilment[order.fulfilment]} · {t.admin.ordersPage.weight}: {formatWeight(order.weight_g)}
            </p>
          )}
        </section>
        <section className="rounded-2xl border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">{o.payment}</h2>
          <p className="mt-1">{payLabel[order.payment_method]}</p>
          <p className="text-sm text-ink/70">{o.paymentStatus[order.payment_status]}</p>
          {admin && order.upi_reference && <p className="text-sm text-ink/70">{o.reference}: {order.upi_reference}</p>}
        </section>
      </div>

      {admin && order.customer_note && (
        <section className="rounded-2xl border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">{t.admin.ordersPage.customerNote}</h2>
          <p className="mt-1 whitespace-pre-line">{order.customer_note}</p>
        </section>
      )}

      {order.history.length > 0 && (
        <section className="rounded-2xl border border-ink/10 bg-white p-4">
          <h2 className="font-semibold">{o.history}</h2>
          <ol className="mt-2 space-y-1">
            {order.history.map((h, i) => (
              <li key={i} className="flex justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{status(h.status)}</span>
                  {admin && h.note && <span className="text-ink/70"> · {h.note}</span>}
                </span>
                <span className="text-ink/60">{dateFmt.format(new Date(h.created_at))}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!admin && (
      <a
        href={waLink(BUSINESS.whatsapp.main, `${o.questions} ${order.number}`)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 font-semibold text-green-800 underline"
      >
        <MessageCircle aria-hidden className="h-5 w-5" /> {o.questions}
      </a>
      )}
    </div>
  );
}
