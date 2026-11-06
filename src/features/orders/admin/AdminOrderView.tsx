'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { OrderStatusActions } from '@/components/admin/OrderStatusActions';
import { Spinner } from '@/components/ui/Spinner';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import type { MyOrder } from '../api';
import { OrderDetails } from '../OrderDetails';
import { confirmOrder, getOrder, recordPayment, setOrderStatus } from '../admin-api';

const NO_PAYMENT = { upi_id: null, upi_qr_url: null };

export function AdminOrderView({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const id = useSearchParams().get('id');
  const [order, setOrder] = useState<MyOrder | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id) return;
    let active = true;
    getOrder(id).then(
      (o) => active && setOrder(o),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [id, version]);

  const back = (
    <Link href={localHref(lang, '/admin/orders/')} className="inline-flex items-center gap-1 font-medium text-brand-dark underline">
      <ArrowLeft aria-hidden className="h-4 w-4" /> {t.admin.ordersPage.back}
    </Link>
  );

  if (failed) return <p role="alert">{t.admin.loadFailed}</p>;
  if (!id || order === null)
    return (
      <div className="space-y-4">
        {back}
        <p role="alert" className="rounded-2xl bg-white p-6">{t.order.notFound}</p>
      </div>
    );
  if (order === undefined) return <Spinner label={t.auth.loading} />;

  const refresh = () => setVersion((v) => v + 1);
  return (
    <div className="space-y-4">
      {back}
      <OrderDetails
        lang={lang}
        order={order}
        payment={NO_PAYMENT}
        onChanged={refresh}
        adminActions={
          <OrderStatusActions
            lang={lang}
            order={{ ...order, phone: order.address?.phone ?? null }}
            confirm={confirmOrder}
            recordPayment={recordPayment}
            setStatus={setOrderStatus}
            onChanged={refresh}
          />
        }
      />
    </div>
  );
}
