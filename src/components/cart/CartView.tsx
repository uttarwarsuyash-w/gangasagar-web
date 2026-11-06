'use client';

import { AnimatedNumber } from '@/lib/motion/AnimatedNumber';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/features/cart/store';
import { buildQuotationWhatsAppLink, priceCart, type CartPrice, type Fulfilment } from '@/features/cart/pricing';
import { getSupabase } from '@/lib/supabase/client';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { formatRupees, formatWeight } from '@/lib/money';
import { normalizePincode } from '@/features/checkout/pincode';
import { CartLines } from './CartLines';
import { DEFAULT_RULES, DeliveryNotice, type DeliveryRules } from './DeliveryNotice';
import { Spinner } from '@/components/ui/Spinner';
import { TextField, buttonPrimary } from '@/components/ui/Field';

export type Mode = 'pickup' | 'ship' | null;
export type OutsideMethod = 'courier' | 'transport';

/** Prices via price_cart: delivery first; if the pincode is outside Nanded, the chosen outside method. */
export async function priceForMode(
  items: Parameters<typeof priceCart>[0],
  mode: Mode,
  pin: string | null,
  outside: OutsideMethod,
): Promise<{ price: CartPrice; fulfilment: Fulfilment | null }> {
  if (mode === 'pickup') return { price: await priceCart(items, null, 'pickup'), fulfilment: 'pickup' };
  if (mode === 'ship' && pin) {
    const first = await priceCart(items, pin, 'delivery');
    if (first.zone === 'outside') return { price: await priceCart(items, pin, outside), fulfilment: outside };
    return { price: first, fulfilment: 'delivery' };
  }
  // No choice yet: price the lines only and keep the fee hidden.
  return { price: await priceCart(items, null, 'pickup'), fulfilment: null };
}

export function useDeliveryRules(): DeliveryRules {
  const [rules, setRules] = useState<DeliveryRules>(DEFAULT_RULES);
  useEffect(() => {
    Promise.resolve(getSupabase().from('site_settings').select('value').eq('key', 'delivery').maybeSingle())
      .then(({ data }) => {
        if (data?.value) setRules({ ...DEFAULT_RULES, ...(data.value as Partial<DeliveryRules>) });
      })
      .catch(() => undefined);
  }, []);
  return rules;
}

export function CartView({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const c = t.cart;
  const router = useRouter();
  const { items, setQuantity, remove } = useCart();
  const rules = useDeliveryRules();
  const [mode, setMode] = useState<Mode>(null);
  const [pinText, setPinText] = useState('');
  const [outside, setOutside] = useState<OutsideMethod>('courier');
  const [result, setResult] = useState<{ price: CartPrice; fulfilment: Fulfilment | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const req = useRef(0);

  const pin = normalizePincode(pinText);
  const itemsKey = JSON.stringify(items);

  useEffect(() => {
    if (items.length === 0) return;
    const id = ++req.current;
    priceForMode(items, mode, pin, outside).then(
      (r) => {
        if (id !== req.current) return;
        setResult(r);
        setFailed(false);
      },
      () => id === req.current && setFailed(true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, mode, pin, outside]);

  const price = result?.price ?? null;
  const lineErrors = useMemo(
    () => Object.fromEntries((price?.errors ?? []).filter((e) => e.variant_id).map((e) => [e.variant_id as string, e.code])),
    [price],
  );

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-brand/15 bg-white p-8 text-center">
        <ShoppingBag aria-hidden className="mx-auto h-14 w-14 animate-bob text-brand/60" />
        <p className="mt-3 text-xl font-semibold">{c.empty}</p>
        <Link href={localHref(lang, '/shop/')} className={`${buttonPrimary} mt-4`}>
          {c.continueShopping}
        </Link>
      </div>
    );
  }

  if (!price) return failed ? <p role="alert">{c.priceError}</p> : <Spinner label={c.updating} />;

  const hasLineErrors = Object.keys(lineErrors).length > 0;
  const feeKnown = result?.fulfilment !== null && price.delivery_fee !== null && price.errors.length === 0;
  const showPinError = mode === 'ship' && pinText.trim() !== '' && !pin;
  const quotationLink = buildQuotationWhatsAppLink(price.lines.filter((l) => l.name_en), lang);

  function goToCheckout() {
    const q = new URLSearchParams();
    if (mode === 'pickup') q.set('f', 'pickup');
    if (mode === 'ship' && result?.fulfilment) {
      q.set('f', result.fulfilment);
      if (pin) q.set('pin', pin);
    }
    const qs = q.toString();
    router.push(localHref(lang, `/checkout/${qs ? `?${qs}` : ''}`));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <div className="space-y-4">
        <CartLines lang={lang} items={items} lines={price.lines} lineErrors={lineErrors} onSet={setQuantity} onRemove={remove} />
        {lineErrors && Object.values(lineErrors).includes('unavailable') && (
          <p role="alert" className="rounded-xl bg-brand-light px-4 py-3 text-brand-dark">
            {c.removeToContinue}
          </p>
        )}
        <DeliveryNotice
          lang={lang}
          weightG={price.weight_g}
          subtotal={price.subtotal}
          zone={price.zone}
          requiresQuotation={price.requires_quotation}
          rules={rules}
          quotationLink={quotationLink}
        />
      </div>

      <aside className="space-y-4">
        <fieldset className="animate-rise rounded-2xl border border-ink/10 bg-white p-4">
          <legend className="px-1 font-semibold">{c.howToGet}</legend>
          <div className="space-y-2">
            {(['pickup', 'ship'] as const).map((m) => (
              <label key={m} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-brand-light/50">
                <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} className="mt-1 h-4 w-4 accent-brand" />
                <span>
                  <span className="font-medium">{m === 'pickup' ? c.pickup : c.ship}</span>
                  {m === 'pickup' && <span className="block text-sm text-ink/60">{c.pickupHint}</span>}
                </span>
              </label>
            ))}
          </div>
          {mode === 'ship' && (
            <div className="mt-3 space-y-3">
              <TextField
                label={c.pincode}
                value={pinText}
                onChange={setPinText}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={10}
                hint={c.pincodeHint}
                error={showPinError ? c.invalidPincode : undefined}
              />
              {price.zone === 'outside' && (
                <div>
                  <p className="text-sm text-ink/70">{c.outsideNanded}</p>
                  <div className="mt-2 flex gap-4">
                    {(['courier', 'transport'] as const).map((m) => (
                      <label key={m} className="flex items-center gap-2">
                        <input type="radio" name="outside" checked={outside === m} onChange={() => setOutside(m)} className="h-4 w-4 accent-brand" />
                        {m === 'courier' ? c.courier : c.transport}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              {price.zone === 'nanded' && <p className="text-sm text-ink/70">{c.nandedDelivery}</p>}
            </div>
          )}
        </fieldset>

        <dl className="space-y-1 rounded-2xl border border-ink/10 bg-white p-4 shadow-[0_6px_0_var(--color-accent)]">
          <div className="flex justify-between">
            <dt>{c.subtotal}</dt>
            <dd className="font-semibold">
              <AnimatedNumber value={price.subtotal} format={formatRupees} />
            </dd>
          </div>
          <div className="flex justify-between text-sm text-ink/70">
            <dt>{c.weight}</dt>
            <dd>
              <AnimatedNumber value={price.weight_g} format={formatWeight} />
            </dd>
          </div>
          {!price.requires_quotation && (
            <div className="flex justify-between">
              <dt>{c.delivery}</dt>
              <dd className="font-semibold">
                {feeKnown ? (
                  price.delivery_fee === 0 ? (
                    <span className="inline-block animate-stamp rounded-full bg-leaf px-2 text-white">{c.free}</span>
                  ) : (
                    <span key={price.delivery_fee} className="inline-block animate-pop">{formatRupees(price.delivery_fee as number)}</span>
                  )
                ) : (
                  <span className="text-sm font-normal text-ink/60">{mode === 'ship' ? c.enterPincodeForFee : '—'}</span>
                )}
              </dd>
            </div>
          )}
          {feeKnown && price.total !== null && (
            <div className="flex justify-between border-t border-ink/10 pt-2 text-lg">
              <dt className="font-semibold">{c.total}</dt>
              <dd className="font-display text-3xl leading-none text-brand-dark">
                <AnimatedNumber value={price.total} format={formatRupees} />
              </dd>
            </div>
          )}
        </dl>

        {!price.requires_quotation && (
          <button type="button" className={`${buttonPrimary} w-full`} disabled={hasLineErrors} onClick={goToCheckout}>
            {c.checkout}
          </button>
        )}
      </aside>
    </div>
  );
}
