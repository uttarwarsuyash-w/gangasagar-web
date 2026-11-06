'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { priceForMode, type Mode, type OutsideMethod } from '@/components/cart/CartView';
import type { CartPrice, Fulfilment } from '@/features/cart/pricing';
import { useCart } from '@/features/cart/store';
import { placeOrder, type PaymentMethod } from '@/features/orders/api';
import { TextArea, TextField, buttonPrimary } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { errorCode } from '@/lib/errors';
import { formatRupees, formatWeight } from '@/lib/money';
import { normalizePincode } from './pincode';
import { validateAddress, type AddressInput } from './validation';
import { PaymentOptions, allowedPaymentMethods } from './PaymentOptions';

function initialMode(f: string | null): Mode {
  if (f === 'pickup') return 'pickup';
  if (f === 'delivery' || f === 'courier' || f === 'transport') return 'ship';
  return null;
}

export function CheckoutForm({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const c = t.checkout;
  const router = useRouter();
  const params = useSearchParams();
  const { items, clear } = useCart();

  const [mode, setMode] = useState<Mode>(() => initialMode(params.get('f')));
  const [outside, setOutside] = useState<OutsideMethod>(params.get('f') === 'transport' ? 'transport' : 'courier');
  const [address, setAddress] = useState<AddressInput>({ name: '', phone: '', line1: '', line2: '', landmark: '', city: '', state: '', pincode: params.get('pin') ?? '' });
  const [note, setNote] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('cash');
  const [priced, setPriced] = useState<{ key: string; price: CartPrice; fulfilment: Fulfilment | null } | null>(null);
  const [retry, setRetry] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);

  const pin = normalizePincode(address.pincode);
  const itemsKey = JSON.stringify(items);
  // The price (and the pickup/delivery choice it carries) is only used for the inputs it was made for.
  const priceKey = JSON.stringify([itemsKey, mode, mode === 'ship' ? pin : null, outside]);

  useEffect(() => {
    if (items.length === 0) return;
    let active = true;
    priceForMode(items, mode, mode === 'ship' ? pin : null, outside).then(
      (r) => {
        if (!active) return;
        setPriced({ key: priceKey, ...r });
        setFormError(null);
      },
      () => active && setFormError(c.errors.network),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceKey, retry]);

  const current = priced?.key === priceKey ? priced : null;
  const zone = current?.price.zone ?? null;
  const fulfilment = current?.fulfilment ?? null;
  const allowed = allowedPaymentMethods(zone, fulfilment);
  const effectivePayment = allowed.includes(payment) ? payment : allowed[0];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-brand/15 bg-white p-8 text-center">
        <p className="text-xl font-semibold">{t.cart.empty}</p>
        <Link href={localHref(lang, '/shop/')} className={`${buttonPrimary} mt-4`}>
          {t.cart.continueShopping}
        </Link>
      </div>
    );
  }

  const set = (k: keyof AddressInput) => (v: string) => setAddress((a) => ({ ...a, [k]: v }));
  const err = (k: string) => (errors[k] ? c.errors[errors[k] as keyof typeof c.errors] : undefined);
  const price = priced?.price;

  async function submit() {
    if (inFlight.current) return;
    setFormError(null);
    if (mode && !current) {
      // Still pricing the latest choice (or the last check failed): price again, never submit the old choice.
      setFormError(t.cart.updating);
      setRetry((r) => r + 1);
      return;
    }
    if (!mode || !fulfilment) {
      setFormError(c.chooseHow);
      return;
    }
    const pickup = fulfilment === 'pickup';
    const { errors: found, value } = validateAddress(address, { pickup });
    setErrors(found);
    if (Object.keys(found).length) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const id = await placeOrder({
        items,
        pincode: pickup ? null : value.pincode,
        fulfilment,
        paymentMethod: effectivePayment,
        address: pickup
          ? { name: value.name, phone: value.phone }
          : Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined && v !== '')) as unknown as AddressInput,
        note: note.trim() || null,
      });
      clear();
      router.push(localHref(lang, `/account/order/?id=${id}&placed=1`));
    } catch (e) {
      const code = (e as { code?: string }).code;
      const key = (code && code in c.errors ? code : errorCode(e)) as keyof typeof c.errors;
      setFormError(c.errors[key] ?? c.errors.unknown);
      inFlight.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form
      noValidate
      className="grid gap-6 lg:grid-cols-[1fr_22rem]"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <div className="space-y-4">
        <fieldset className="rounded-2xl border border-ink/10 bg-white p-4">
          <legend className="px-1 font-semibold">{t.cart.howToGet}</legend>
          <div className="space-y-2">
            {(['pickup', 'ship'] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-brand-light/50">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} className="h-4 w-4 accent-brand" />
                <span className="font-medium">{m === 'pickup' ? t.cart.pickup : t.cart.ship}</span>
              </label>
            ))}
          </div>
          {zone === 'outside' && mode === 'ship' && (
            <div className="mt-3">
              <p className="text-sm text-ink/70">{t.cart.outsideNanded}</p>
              <div className="mt-2 flex gap-4">
                {(['courier', 'transport'] as const).map((m) => (
                  <label key={m} className="flex items-center gap-2">
                    <input type="radio" name="outside" checked={outside === m} onChange={() => setOutside(m)} className="h-4 w-4 accent-brand" />
                    {m === 'courier' ? t.cart.courier : t.cart.transport}
                  </label>
                ))}
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-white p-4 sm:grid-cols-2">
          <legend className="px-1 font-semibold">{mode === 'ship' ? c.address : c.contact}</legend>
          <TextField label={c.name} value={address.name} onChange={set('name')} autoComplete="name" error={err('name')} />
          <TextField label={c.phone} value={address.phone} onChange={set('phone')} type="tel" inputMode="tel" autoComplete="tel" hint={c.phoneHint} error={err('phone')} />
          {mode === 'ship' && (
            <>
              <div className="sm:col-span-2">
                <TextField label={c.line1} value={address.line1} onChange={set('line1')} autoComplete="address-line1" error={err('line1')} />
              </div>
              <TextField label={c.line2} value={address.line2 ?? ''} onChange={set('line2')} autoComplete="address-line2" />
              <TextField label={c.landmark} value={address.landmark ?? ''} onChange={set('landmark')} />
              <TextField label={c.city} value={address.city} onChange={set('city')} autoComplete="address-level2" error={err('city')} />
              <TextField
                label={t.cart.pincode}
                value={address.pincode}
                onChange={set('pincode')}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={10}
                hint={t.cart.pincodeHint}
                error={err('pincode') ?? (address.pincode.trim() && !pin ? c.errors.pincode : undefined)}
              />
              <TextField label={c.state} value={address.state ?? ''} onChange={set('state')} autoComplete="address-level1" />
            </>
          )}
          <div className="sm:col-span-2">
            <TextArea label={c.note} value={note} onChange={setNote} rows={2} />
          </div>
        </fieldset>

        <PaymentOptions lang={lang} zone={zone} fulfilment={fulfilment} value={effectivePayment} onChange={setPayment} />
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-ink/10 bg-white p-4">
          {!price ? (
            <Spinner label={t.cart.updating} />
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                {price.lines.map((l) => (
                  <li key={l.variant_id} className="flex justify-between gap-2">
                    <span>
                      {pick(l as unknown as Record<string, unknown>, 'name', lang)} {pick(l as unknown as Record<string, unknown>, 'label', lang)}{' '}
                      {l.grams ? formatWeight(l.grams) : `× ${l.qty}`}
                    </span>
                    <span>{l.line_total != null ? formatRupees(l.line_total) : '—'}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 space-y-1 border-t border-ink/10 pt-3">
                <div className="flex justify-between">
                  <dt>{t.cart.subtotal}</dt>
                  <dd>{formatRupees(price.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{t.cart.delivery}</dt>
                  <dd>{price.delivery_fee == null || !fulfilment ? '—' : price.delivery_fee === 0 ? t.cart.free : formatRupees(price.delivery_fee)}</dd>
                </div>
                {price.total != null && fulfilment && (
                  <div className="flex justify-between text-lg font-bold">
                    <dt>{t.cart.total}</dt>
                    <dd className="text-brand-dark">{formatRupees(price.total)}</dd>
                  </div>
                )}
              </dl>
            </>
          )}
        </div>
        {formError && (
          <p role="alert" className="rounded-xl bg-brand-light px-4 py-3 text-brand-dark">
            {formError}
          </p>
        )}
        <button type="submit" className={`${buttonPrimary} w-full py-3 text-lg`} disabled={submitting}>
          {submitting ? c.placing : c.placeOrder}
        </button>
        <Link href={localHref(lang, '/cart/')} className="block text-center text-brand-dark underline">
          {c.backToCart}
        </Link>
      </aside>
    </form>
  );
}
