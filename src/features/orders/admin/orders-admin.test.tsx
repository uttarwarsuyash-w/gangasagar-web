import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDictionary } from '@/i18n/get-dictionary';
import type { MyOrder } from '../api';
import type { OrderListRow } from '../admin-api';

const { listOrders, getOrder, search } = vi.hoisted(() => ({
  listOrders: vi.fn(),
  getOrder: vi.fn(),
  search: { value: '' },
}));
vi.mock('../admin-api', () => ({
  listOrders,
  getOrder,
  confirmOrder: vi.fn(),
  recordPayment: vi.fn(),
  setOrderStatus: vi.fn(),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search.value) }));

import { OrdersAdmin } from './OrdersAdmin';
import { AdminOrderView } from './AdminOrderView';

const en = getDictionary('en');

const listRow: OrderListRow = {
  id: 'o1',
  number: 'GKS-2611-00001',
  status: 'Order Placed',
  zone: 'nanded',
  fulfilment: 'delivery',
  total: 240,
  payment_method: 'cash',
  payment_status: 'unpaid',
  created_at: '2026-11-06T06:30:00Z',
  customer: 'Asha Patil',
  phone: '9403951524',
};

const order: MyOrder = {
  id: 'o1',
  number: 'GKS-2611-00001',
  status: 'Order Placed',
  zone: 'nanded',
  fulfilment: 'delivery',
  address: { name: 'Asha Patil', phone: '9403951524', line1: 'Shivaji Nagar', city: 'Nanded', pincode: '431602' },
  pincode: '431602',
  weight_g: 1500,
  subtotal: 240,
  delivery_fee: 0,
  total: 240,
  payment_method: 'cash',
  payment_status: 'unpaid',
  upi_reference: null,
  customer_note: 'Ring the bell',
  invoice_number: null,
  created_at: '2026-11-06T06:30:00Z',
  items: [
    { id: 'i1', product_name_en: 'Peanuts', product_name_hi: null, label_en: '500 g', label_hi: null, qty: 3, grams: null, unit_price: 80, line_total: 240 },
  ],
  history: [{ status: 'Order Placed', created_at: '2026-11-06T06:30:00Z', note: null }],
};

describe('OrdersAdmin', () => {
  beforeEach(() => {
    listOrders.mockReset();
    search.value = '';
  });

  it('starts with the status from the address bar (dashboard link)', async () => {
    search.value = 'status=Order%20Placed';
    listOrders.mockResolvedValue([listRow]);
    render(<OrdersAdmin lang="en" />);
    expect(await screen.findByText('GKS-2611-00001')).toBeInTheDocument();
    expect(listOrders).toHaveBeenCalledWith(expect.objectContaining({ status: 'Order Placed' }));
    expect(screen.getByLabelText(en.admin.ordersPage.filterStatus)).toHaveValue('Order Placed');
  });

  it('links each order to its page', async () => {
    listOrders.mockResolvedValue([listRow]);
    render(<OrdersAdmin lang="en" />);
    const link = await screen.findByRole('link', { name: /GKS-2611-00001/ });
    expect(link).toHaveAttribute('href', '/en/admin/orders/view/?id=o1');
    expect(link).toHaveTextContent('Asha Patil');
  });

  it('applies area and search filters', async () => {
    const user = userEvent.setup();
    listOrders.mockResolvedValue([]);
    render(<OrdersAdmin lang="en" />);
    expect(await screen.findByText(en.admin.ordersPage.noOrders)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(en.admin.ordersPage.filterZone), 'outside');
    await user.type(screen.getByLabelText(en.admin.ordersPage.search), '9403');
    await user.click(screen.getByRole('button', { name: en.admin.ordersPage.apply }));
    expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ zone: 'outside', search: '9403' }));
  });

  it('says so when orders cannot load', async () => {
    listOrders.mockRejectedValue(new Error('x'));
    render(<OrdersAdmin lang="en" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.admin.loadFailed);
  });
});

describe('AdminOrderView', () => {
  beforeEach(() => {
    getOrder.mockReset();
    search.value = 'id=o1';
  });

  it('shows the order with its next step and a WhatsApp update to the customer phone', async () => {
    getOrder.mockResolvedValue(order);
    render(<AdminOrderView lang="en" />);
    expect(await screen.findByRole('heading', { name: /GKS-2611-00001/ })).toBeInTheDocument();
    expect(screen.getByText('Ring the bell')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: en.admin.ordersPage.confirm })).toBeInTheDocument();
    const wa = screen.getByRole('link', { name: en.admin.ordersPage.sendWhatsApp });
    expect(wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919403951524\?text=/);
    expect(screen.queryByText(en.order.questions)).not.toBeInTheDocument();
  });

  it('says not found for an unknown id', async () => {
    getOrder.mockResolvedValue(null);
    render(<AdminOrderView lang="en" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(en.order.notFound);
  });
});
