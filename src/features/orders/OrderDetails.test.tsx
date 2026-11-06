import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDictionary } from '@/i18n/get-dictionary';

vi.mock('./api', () => ({ submitPaymentReference: vi.fn() }));

import { OrderDetails } from './OrderDetails';
import type { MyOrder } from './api';

const en = getDictionary('en');
const order = (over: Partial<MyOrder> = {}): MyOrder => ({
  id: 'o1', number: 'GKS-2611-00001', status: 'Order Confirmed', zone: 'outside', fulfilment: 'courier',
  address: { name: 'Asha', phone: '9403951524', line1: 'x', city: 'Pune', pincode: '411001' }, pincode: '411001',
  weight_g: 500, subtotal: 100, delivery_fee: 179, total: 279, payment_method: 'upi_prepaid', payment_status: 'unpaid',
  upi_reference: null, customer_note: null, invoice_number: null, created_at: '2026-11-06T10:00:00Z',
  items: [{ id: 'i1', product_name_en: 'Peanuts', product_name_hi: null, label_en: '500 g', label_hi: null, qty: 1, grams: null, unit_price: 100, line_total: 100 }],
  history: [{ status: 'Order Placed', created_at: '2026-11-06T10:00:00Z', note: null }],
  ...over,
});
const settings = { upi_id: 'gangasagar@upi', upi_qr_url: 'https://cdn.example/qr.webp' };

describe('OrderDetails UPI box', () => {
  it('shows UPI ID, QR and the reference form for an unpaid confirmed outside order', () => {
    render(<OrderDetails lang="en" order={order()} payment={settings} onChanged={vi.fn()} />);
    expect(screen.getByText('gangasagar@upi')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: en.order.upiQr })).toHaveAttribute('src', settings.upi_qr_url);
    expect(screen.getByLabelText(en.order.reference)).toBeInTheDocument();
  });
  it.each([
    ['a Nanded order', { zone: 'nanded' as const, fulfilment: 'delivery' as const, payment_method: 'cash' as const }],
    ['an order not yet confirmed', { status: 'Order Placed' }],
    ['an order already being processed', { status: 'Processing' }],
    ['a submitted payment', { payment_status: 'submitted' as const }],
    ['a paid order', { payment_status: 'paid' as const }],
  ])('is hidden for %s', (_n, over) => {
    render(<OrderDetails lang="en" order={order(over as Partial<MyOrder>)} payment={settings} onChanged={vi.fn()} />);
    expect(screen.queryByLabelText(en.order.reference)).not.toBeInTheDocument();
    expect(screen.queryByText('gangasagar@upi')).not.toBeInTheDocument();
  });
  it('explains when the shop has not added UPI details yet', () => {
    render(<OrderDetails lang="en" order={order()} payment={{ upi_id: null, upi_qr_url: null }} onChanged={vi.fn()} />);
    expect(screen.getByText(en.order.upiMissing)).toBeInTheDocument();
  });
  it('shows the order number, status and total', () => {
    render(<OrderDetails lang="en" order={order({ zone: 'nanded' })} payment={settings} onChanged={vi.fn()} />);
    expect(screen.getByText(/GKS-2611-00001/)).toBeInTheDocument();
    expect(screen.getAllByText('Order Confirmed').length).toBeGreaterThan(0);
    expect(screen.getByText('₹279')).toBeInTheDocument();
  });
});
