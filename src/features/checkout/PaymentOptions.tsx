'use client';

import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import type { Fulfilment } from '@/features/cart/pricing';
import type { PaymentMethod } from '@/features/orders/api';

/** Outside Nanded: only UPI after confirmation. Nanded delivery and pickup: cash or UPI at handover. */
export function allowedPaymentMethods(zone: 'nanded' | 'outside' | null, fulfilment: Fulfilment | null): PaymentMethod[] {
  if (zone === 'outside' || fulfilment === 'courier' || fulfilment === 'transport') return ['upi_prepaid'];
  return ['cash', 'upi_on_delivery'];
}

export function PaymentOptions({
  lang,
  zone,
  fulfilment,
  value,
  onChange,
}: {
  lang: Lang;
  zone: 'nanded' | 'outside' | null;
  fulfilment: Fulfilment | null;
  value: PaymentMethod;
  onChange: (m: PaymentMethod) => void;
}) {
  const t = getDictionary(lang).checkout;
  const labels: Record<PaymentMethod, string> = { cash: t.cash, upi_on_delivery: t.upiOnDelivery, upi_prepaid: t.upiPrepaid };
  const methods = allowedPaymentMethods(zone, fulfilment);
  return (
    <fieldset className="rounded-2xl border border-ink/10 bg-white p-4">
      <legend className="px-1 font-semibold">{t.payment}</legend>
      <div className="space-y-2">
        {methods.map((m) => (
          <label key={m} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-brand-light/50">
            <input type="radio" name="payment" value={m} checked={value === m} onChange={() => onChange(m)} className="mt-1 h-4 w-4 accent-brand" />
            <span>
              <span className="font-medium">{labels[m]}</span>
              {m === 'upi_prepaid' && <span className="block text-sm text-ink/60">{t.upiPrepaidHint}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
