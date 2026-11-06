'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { SelectField, TextField, buttonPrimary } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { formatRupees } from '@/lib/money';
import { listOrders, type OrderFilter, type OrderListRow } from '../admin-api';

const STATUSES = ['Order Placed', 'Order Confirmed', 'Processing', 'Dispatched', 'Out for Delivery', 'Delivered', 'Cancelled'] as const;

export function OrdersAdmin({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const o = t.admin.ordersPage;
  const initialStatus = useSearchParams().get('status') ?? '';
  const [form, setForm] = useState<Required<OrderFilter>>({ status: initialStatus, zone: '', from: '', to: '', search: '' });
  const [filter, setFilter] = useState<OrderFilter>(() => ({ status: initialStatus || undefined }));
  const [rows, setRows] = useState<OrderListRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    listOrders(filter).then(
      (r) => {
        if (!active) return;
        setFailed(false);
        setRows(r);
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [filter]);

  const set = (k: keyof OrderFilter) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const status = (s: string) => t.order.statuses[s as keyof typeof t.order.statuses] ?? s;
  const area = (r: OrderListRow) => (r.fulfilment === 'pickup' ? o.zones.pickup : r.zone ? o.zones[r.zone] : '');
  const dateFmt = new Intl.DateTimeFormat(lang === 'hi' ? 'hi-IN' : 'en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

  return (
    <section>
      <h1 className="text-2xl font-bold">{o.title}</h1>
      <form
        className="mt-4 grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={(e) => {
          e.preventDefault();
          setRows(null);
          const next: OrderFilter = {};
          for (const [k, v] of Object.entries(form)) if (v.trim()) next[k as keyof OrderFilter] = v.trim();
          setFilter(next);
        }}
      >
        <SelectField
          label={o.filterStatus}
          value={form.status}
          onChange={set('status')}
          options={[{ value: '', label: o.allStatuses }, ...STATUSES.map((s) => ({ value: s, label: status(s) }))]}
        />
        <SelectField
          label={o.filterZone}
          value={form.zone}
          onChange={set('zone')}
          options={[
            { value: '', label: o.allZones },
            { value: 'nanded', label: o.zones.nanded },
            { value: 'outside', label: o.zones.outside },
            { value: 'pickup', label: o.zones.pickup },
          ]}
        />
        <TextField label={o.search} value={form.search} onChange={set('search')} maxLength={60} />
        <TextField label={o.from} type="date" value={form.from} onChange={set('from')} />
        <TextField label={o.to} type="date" value={form.to} onChange={set('to')} />
        <div className="flex items-end">
          <button type="submit" className={buttonPrimary}>
            {o.apply}
          </button>
        </div>
      </form>

      <div className="mt-4">
        {failed ? (
          <p role="alert">{t.admin.loadFailed}</p>
        ) : rows === null ? (
          <Spinner label={t.auth.loading} />
        ) : rows.length === 0 ? (
          <p className="rounded-2xl bg-white p-6 text-ink/70">{o.noOrders}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <Link
                  href={localHref(lang, `/admin/orders/view/?id=${encodeURIComponent(r.id)}`)}
                  className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 hover:border-brand/40"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-3">
                      <span className="font-semibold">{r.number}</span>
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-sm font-medium text-brand-dark">{status(r.status)}</span>
                    </span>
                    <span className="block text-sm text-ink/70">
                      {[r.customer, r.phone, area(r)].filter(Boolean).join(' · ')}
                    </span>
                    <span className="block text-sm text-ink/60">
                      {o.placed}: {dateFmt.format(new Date(r.created_at))} · {t.order.paymentStatus[r.payment_status]}
                    </span>
                  </span>
                  <span className="text-right font-bold text-brand-dark">{formatRupees(r.total)}</span>
                  <ChevronRight aria-hidden className="h-5 w-5 shrink-0 text-ink/40" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
