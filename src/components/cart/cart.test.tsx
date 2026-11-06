import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDictionary } from '@/i18n/get-dictionary';
import type { CartPrice, PricedLine } from '@/features/cart/pricing';

const { priceCart } = vi.hoisted(() => ({ priceCart: vi.fn() }));
vi.mock('@/features/cart/pricing', async (orig) => ({ ...(await orig<typeof import('@/features/cart/pricing')>()), priceCart }));
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/en/cart/', useRouter: () => ({ push: vi.fn() }) }));

import { DeliveryNotice, DEFAULT_RULES } from './DeliveryNotice';
import { CartView } from './CartView';
import { add, clear } from '@/features/cart/store';

const en = getDictionary('en');

const line = (over: Partial<PricedLine> = {}): PricedLine => ({
  variant_id: 'v1', name_en: 'Peanuts', name_hi: null, label_en: '500 g', label_hi: null, qty: 1, grams: null,
  unit_price: 120, line_total: 120, weight_g: 500, stock_label: 'Available', is_loose: false, ...over,
});
const price = (over: Partial<CartPrice> = {}): CartPrice => ({
  lines: [line()], weight_g: 500, subtotal: 120, zone: null, delivery_fee: 0, total: 120,
  requires_quotation: false, errors: [], ...over,
});

describe('DeliveryNotice', () => {
  const show = (weightG: number, subtotal: number, requiresQuotation = false) =>
    render(<DeliveryNotice lang="en" weightG={weightG} subtotal={subtotal} zone="nanded" requiresQuotation={requiresQuotation} rules={DEFAULT_RULES} quotationLink="https://wa.me/919403951524?text=x" />);

  it('1.5 kg and ₹300: shows both the 2 kg hint and the ₹499 hint', () => {
    show(1500, 300);
    expect(screen.getByTestId('heavy-hint')).toHaveTextContent('2 kg');
    expect(screen.getByTestId('free-hint')).toHaveTextContent('₹199');
  });
  it('2.5 kg and ₹300: shows only the ₹499 hint', () => {
    show(2500, 300);
    expect(screen.queryByTestId('heavy-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('free-hint')).toBeInTheDocument();
  });
  it('₹499 or more: shows no hints', () => {
    show(1500, 499);
    expect(screen.queryByTestId('heavy-hint')).not.toBeInTheDocument();
    expect(screen.queryByTestId('free-hint')).not.toBeInTheDocument();
  });
  it('20 kg: shows the quotation notice with the WhatsApp link', () => {
    show(20000, 900, true);
    expect(screen.getByText(en.cart.quotationTitle)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.cart.quotationButton })).toHaveAttribute('href', expect.stringMatching(/^https:\/\/wa\.me\/919403951524\?text=/));
  });
});

describe('CartView', () => {
  beforeEach(() => {
    localStorage.clear();
    clear();
    priceCart.mockReset();
  });

  it('flags an unavailable line and blocks checkout until it is removed', async () => {
    const user = userEvent.setup();
    add({ variantId: 'v1', qty: 1 });
    add({ variantId: 'gone', qty: 1 });
    priceCart.mockImplementation(async (items: Array<{ variantId: string }>) =>
      items.some((i) => i.variantId === 'gone')
        ? price({
            lines: [line(), line({ variant_id: 'gone', name_en: null, unit_price: null, line_total: null, weight_g: 0, stock_label: null })],
            errors: [{ code: 'unavailable', variant_id: 'gone' }],
            total: null,
            delivery_fee: null,
          })
        : price(),
    );
    render(<CartView lang="en" />);
    expect(await screen.findByText(en.cart.noLongerAvailable)).toBeInTheDocument();
    const checkout = screen.getByRole('button', { name: en.cart.checkout });
    expect(checkout).toBeDisabled();
    const flagged = screen.getByText(en.cart.noLongerAvailable).closest('li')!;
    await user.click(within(flagged).getByRole('button', { name: /Remove/ }));
    await waitFor(() => expect(screen.queryByText(en.cart.noLongerAvailable)).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('button', { name: en.cart.checkout })).toBeEnabled());
  });

  it('shows the current (repriced) price from the server', async () => {
    add({ variantId: 'v1', qty: 2 });
    priceCart.mockResolvedValue(price({ lines: [line({ qty: 2, unit_price: 135, line_total: 270 })], subtotal: 270, total: 270 }));
    render(<CartView lang="en" />);
    expect((await screen.findAllByText('₹270')).length).toBeGreaterThan(0);
    expect(screen.getByText(/₹135/)).toBeInTheDocument();
  });

  it('shows the quotation link instead of Checkout at 20 kg', async () => {
    add({ variantId: 'v1', qty: 40 });
    priceCart.mockResolvedValue(price({ lines: [line({ qty: 40, weight_g: 20000 })], weight_g: 20000, requires_quotation: true, total: null, delivery_fee: null }));
    render(<CartView lang="en" />);
    expect(await screen.findByRole('link', { name: en.cart.quotationButton })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: en.cart.checkout })).not.toBeInTheDocument();
  });

  it('shows the delivery fee only after a pincode is entered', async () => {
    const user = userEvent.setup();
    add({ variantId: 'v1', qty: 1 });
    priceCart.mockImplementation(async (_items: unknown, pin: string | null, f: string) =>
      f === 'pickup'
        ? price({ delivery_fee: 0 })
        : pin && pin.replace(/\D/g, '').length === 6
          ? price({ zone: 'nanded', delivery_fee: 89, total: 209 })
          : price({ zone: null, delivery_fee: null, total: null, errors: [{ code: 'invalid_pincode' }] }),
    );
    render(<CartView lang="en" />);
    await user.click(await screen.findByLabelText(en.cart.ship));
    expect(await screen.findByText(en.cart.enterPincodeForFee)).toBeInTheDocument();
    expect(screen.queryByText('₹89')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText(en.cart.pincode), '431 602');
    expect(await screen.findByText('₹89')).toBeInTheDocument();
  });

  it('steps a loose line by its own minimum and step, not a fixed 250 g', async () => {
    const user = userEvent.setup();
    add({ variantId: 'v1', grams: 1000 });
    priceCart.mockImplementation(async (items: Array<{ grams?: number }>) =>
      price({ lines: [line({ qty: null, grams: items[0].grams ?? 0, is_loose: true, loose_min_g: 500, loose_step_g: 500 })] }),
    );
    render(<CartView lang="en" />);
    const group = await screen.findByRole('group', { name: en.shop.weight });
    await user.click(within(group).getByRole('button', { name: en.shop.more }));
    expect(await within(group).findByText('1.5 kg')).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: en.shop.less }));
    await user.click(within(group).getByRole('button', { name: en.shop.less }));
    expect(await within(group).findByText('500 g')).toBeInTheDocument();
    expect(within(group).getByRole('button', { name: en.shop.less })).toBeDisabled();
  });

  it('shows the empty state', () => {
    render(<CartView lang="en" />);
    expect(screen.getByText(en.cart.empty)).toBeInTheDocument();
  });
});
