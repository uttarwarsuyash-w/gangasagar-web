import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDictionary } from '@/i18n/get-dictionary';

const { placeOrder, priceForMode, push } = vi.hoisted(() => ({
  placeOrder: vi.fn(),
  priceForMode: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/features/orders/api', () => ({ placeOrder }));
vi.mock('@/components/cart/CartView', () => ({ priceForMode }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: push }), useSearchParams: () => new URLSearchParams('f=delivery&pin=431602') }));

import { CheckoutForm } from './CheckoutForm';
import { PaymentOptions } from './PaymentOptions';
import { add, clear } from '@/features/cart/store';

const en = getDictionary('en');
const nandedPrice = {
  price: {
    lines: [{ variant_id: 'v1', name_en: 'Peanuts', name_hi: null, label_en: '500 g', label_hi: null, qty: 1, grams: null, unit_price: 300, line_total: 300, weight_g: 1500, stock_label: 'Available' }],
    weight_g: 1500, subtotal: 300, zone: 'nanded', delivery_fee: 89, total: 389, requires_quotation: false, errors: [],
  },
  fulfilment: 'delivery',
};

describe('PaymentOptions', () => {
  it('offers only “UPI after we confirm” outside Nanded', () => {
    render(<PaymentOptions lang="en" zone="outside" fulfilment="courier" value="upi_prepaid" onChange={vi.fn()} />);
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(1);
    expect(screen.getByLabelText(en.checkout.upiPrepaid, { exact: false })).toBeInTheDocument();
  });
  it('offers cash or UPI at delivery or pickup in Nanded', () => {
    render(<PaymentOptions lang="en" zone="nanded" fulfilment="delivery" value="cash" onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByLabelText(en.checkout.cash)).toBeInTheDocument();
    expect(screen.getByLabelText(en.checkout.upiOnDelivery)).toBeInTheDocument();
  });
  it('offers cash or UPI for pickup', () => {
    render(<PaymentOptions lang="en" zone={null} fulfilment="pickup" value="cash" onChange={vi.fn()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(2);
  });
});

describe('CheckoutForm', () => {
  beforeEach(() => {
    localStorage.clear();
    clear();
    add({ variantId: 'v1', qty: 1 });
    placeOrder.mockReset();
    priceForMode.mockReset();
    push.mockReset();
    priceForMode.mockResolvedValue(nandedPrice);
  });

  async function fill(user: ReturnType<typeof userEvent.setup>) {
    await user.type(await screen.findByLabelText(en.checkout.name), 'Asha Patil');
    await user.type(screen.getByLabelText(en.checkout.phone), '+91 94039 51524');
    await user.type(screen.getByLabelText(en.checkout.line1), '12 Station Road');
    await user.type(screen.getByLabelText(en.checkout.city), 'Nanded');
  }

  it('disables Place Order while submitting and a double click places one order', async () => {
    const user = userEvent.setup();
    let resolve: (id: string) => void = () => {};
    placeOrder.mockImplementation(() => new Promise<string>((r) => (resolve = r)));
    render(<CheckoutForm lang="en" />);
    await fill(user);
    const button = await screen.findByRole('button', { name: en.checkout.placeOrder });
    await user.dblClick(button);
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: en.checkout.placing })).toBeDisabled();
    resolve('order-9');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/account/order/?id=order-9&placed=1'));
    expect(placeOrder.mock.calls[0][0]).toMatchObject({
      fulfilment: 'delivery',
      pincode: '431602',
      paymentMethod: 'cash',
      address: { phone: '9403951524', pincode: '431602' },
    });
  });

  it('shows a readable error and lets the customer try again', async () => {
    const user = userEvent.setup();
    placeOrder.mockImplementationOnce(async () => {
      throw Object.assign(new Error('network'), { code: 'network' });
    });
    placeOrder.mockImplementationOnce(async () => 'order-2');
    render(<CheckoutForm lang="en" />);
    await fill(user);
    await user.click(await screen.findByRole('button', { name: en.checkout.placeOrder }));
    expect(await screen.findByText(en.checkout.errors.network)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/en/account/order/?id=order-2&placed=1'));
  });

  it('never places an order with a pickup/delivery choice that is still being priced', async () => {
    const user = userEvent.setup();
    const pickupPrice = { price: { ...nandedPrice.price, zone: null, delivery_fee: 0, total: 300 }, fulfilment: 'pickup' };
    let resolvePickup: (v: unknown) => void = () => {};
    render(<CheckoutForm lang="en" />);
    await fill(user);
    expect(await screen.findByText('₹389')).toBeInTheDocument();
    priceForMode.mockImplementation(() => new Promise((r) => (resolvePickup = r)));
    await user.click(screen.getByLabelText(en.cart.pickup));
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    expect(placeOrder).not.toHaveBeenCalled();
    resolvePickup(pickupPrice);
    placeOrder.mockResolvedValue('order-p');
    await waitFor(() => expect(screen.queryByText('₹389')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1));
    expect(placeOrder.mock.calls[0][0]).toMatchObject({ fulfilment: 'pickup', pincode: null });
  });

  it('re-prices instead of using an old price when the last price check failed', async () => {
    const user = userEvent.setup();
    const pickupPrice = { price: { ...nandedPrice.price, zone: null, delivery_fee: 0, total: 300 }, fulfilment: 'pickup' };
    render(<CheckoutForm lang="en" />);
    await fill(user);
    expect(await screen.findByText('₹389')).toBeInTheDocument();
    priceForMode.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    priceForMode.mockResolvedValue(pickupPrice);
    await user.click(screen.getByLabelText(en.cart.pickup));
    expect(await screen.findByText(en.checkout.errors.network)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    expect(placeOrder).not.toHaveBeenCalled();
    placeOrder.mockResolvedValue('order-r');
    await waitFor(() => expect(screen.queryByText('₹389')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    await waitFor(() => expect(placeOrder).toHaveBeenCalledTimes(1));
    expect(placeOrder.mock.calls[0][0]).toMatchObject({ fulfilment: 'pickup' });
  });

  it('does not submit an invalid phone', async () => {
    const user = userEvent.setup();
    render(<CheckoutForm lang="en" />);
    await user.type(await screen.findByLabelText(en.checkout.name), 'Asha');
    await user.type(screen.getByLabelText(en.checkout.phone), '12345');
    await user.click(screen.getByRole('button', { name: en.checkout.placeOrder }));
    expect(await screen.findByText(en.checkout.errors.phone)).toBeInTheDocument();
    expect(placeOrder).not.toHaveBeenCalled();
  });
});
