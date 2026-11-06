'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireSignIn } from '@/components/auth/RequireSignIn';
import { Spinner } from '@/components/ui/Spinner';
import { useSession } from '@/lib/auth/session';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { getMyOrder, getPaymentSettings, type MyOrder, type PaymentSettings } from './api';
import { OrderDetails } from './OrderDetails';

function Loader({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const params = useSearchParams();
  const id = params.get('id');
  const placed = params.get('placed') === '1';
  const { user } = useSession();
  const [order, setOrder] = useState<MyOrder | null | undefined>(undefined);
  const [payment, setPayment] = useState<PaymentSettings>({ upi_id: null, upi_qr_url: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    Promise.all([getMyOrder(id), getPaymentSettings().catch(() => ({ upi_id: null, upi_qr_url: null }))]).then(
      ([o, p]) => {
        if (!active) return;
        setOrder(o);
        setPayment(p);
      },
      () => active && setOrder(null),
    );
    return () => {
      active = false;
    };
  }, [id, user, version]);

  if (!id || order === null) return <p role="alert" className="rounded-2xl bg-white p-6">{t.order.notFound}</p>;
  if (order === undefined) return <Spinner label={t.auth.loading} />;
  return <OrderDetails lang={lang} order={order} payment={payment} placed={placed} onChanged={() => setVersion((v) => v + 1)} />;
}

export function OrderPage({ lang }: { lang: Lang }) {
  return (
    <RequireSignIn lang={lang}>
      <Loader lang={lang} />
    </RequireSignIn>
  );
}
