import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDictionary } from '@/i18n/get-dictionary';
import { AppError, fill } from '@/lib/errors';
import { OrderStatusActions, type ActionOrder } from './OrderStatusActions';

const en = getDictionary('en');
const o = en.admin.ordersPage;
const base: ActionOrder = {
  id: 'o1', number: 'GKS-2611-00001', total: 389, status: 'Order Placed', fulfilment: 'delivery', zone: 'nanded',
  payment_status: 'unpaid', upi_reference: null, phone: '9876543210',
};
const handlers = () => ({ confirm: vi.fn(async () => {}), recordPayment: vi.fn(async () => {}), setStatus: vi.fn(async () => {}), onChanged: vi.fn() });
const moveTo = (s: string) => fill(o.moveTo, { status: s });

describe('OrderStatusActions', () => {
  it('offers Confirm for a new order', () => {
    render(<OrderStatusActions lang="en" order={base} {...handlers()} />);
    expect(screen.getByRole('button', { name: o.confirm })).toBeInTheDocument();
  });

  it('offers Delivered for a pickup order in Processing', async () => {
    const user = userEvent.setup();
    const h = handlers();
    render(<OrderStatusActions lang="en" order={{ ...base, fulfilment: 'pickup', zone: null, status: 'Processing' }} {...h} />);
    expect(screen.queryByRole('button', { name: moveTo('Dispatched') })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: moveTo('Delivered') }));
    expect(h.setStatus).toHaveBeenCalledWith('o1', 'Delivered', '');
  });

  it('offers Dispatched for a delivery order in Processing', () => {
    render(<OrderStatusActions lang="en" order={{ ...base, status: 'Processing' }} {...handlers()} />);
    expect(screen.getByRole('button', { name: moveTo('Dispatched') })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: moveTo('Delivered') })).not.toBeInTheDocument();
  });

  it('hides Processing and shows “Waiting for payment” for an unpaid outside order', () => {
    render(
      <OrderStatusActions
        lang="en"
        order={{ ...base, zone: 'outside', fulfilment: 'courier', status: 'Order Confirmed', payment_status: 'unpaid' }}
        {...handlers()}
      />,
    );
    expect(screen.queryByRole('button', { name: moveTo('Processing') })).not.toBeInTheDocument();
    expect(screen.getByText(o.waitingForPayment)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: o.recordPayment })).toBeInTheDocument();
  });

  it('shows Processing once an outside order is paid', () => {
    render(
      <OrderStatusActions
        lang="en"
        order={{ ...base, zone: 'outside', fulfilment: 'courier', status: 'Order Confirmed', payment_status: 'paid' }}
        {...handlers()}
      />,
    );
    expect(screen.getByRole('button', { name: moveTo('Processing') })).toBeInTheDocument();
    expect(screen.queryByText(o.waitingForPayment)).not.toBeInTheDocument();
  });

  it('shows a readable message for insufficient_stock', async () => {
    const user = userEvent.setup();
    const h = handlers();
    h.confirm.mockImplementation(async () => {
      throw new AppError('insufficient_stock');
    });
    render(<OrderStatusActions lang="en" order={base} {...h} />);
    await user.click(screen.getByRole('button', { name: o.confirm }));
    expect(await screen.findByRole('alert')).toHaveTextContent(en.admin.errors.insufficient_stock);
  });

  it('links a WhatsApp update to the customer', () => {
    render(<OrderStatusActions lang="en" order={{ ...base, status: 'Dispatched' }} {...handlers()} />);
    const link = screen.getByRole('link', { name: o.sendWhatsApp });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/);
    expect(decodeURIComponent(link.getAttribute('href')!)).toContain('GKS-2611-00001');
  });
});
