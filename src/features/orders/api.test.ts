import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ rpc }) }));

import { placeOrder, type PlaceOrderInput } from './api';

const input: PlaceOrderInput = {
  items: [{ variantId: 'v1', qty: 1 }],
  pincode: '431602',
  fulfilment: 'delivery',
  paymentMethod: 'cash',
  address: { name: 'A', phone: '9403951524', line1: 'x', city: 'Nanded', pincode: '431602' },
  note: null,
};

describe('placeOrder', () => {
  beforeEach(() => {
    sessionStorage.clear();
    rpc.mockReset();
  });

  it('reuses the same client_request_id when retrying after a network error', async () => {
    rpc.mockImplementationOnce(async () => {
      throw new TypeError('Failed to fetch');
    });
    rpc.mockImplementationOnce(async () => ({ data: 'order-1', error: null }));
    await expect(placeOrder(input)).rejects.toMatchObject({ code: 'network' });
    await expect(placeOrder(input)).resolves.toBe('order-1');
    const ids = rpc.mock.calls.map((c) => (c[1] as { p_client_request_id: string }).p_client_request_id);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
  });

  it('starts a fresh client_request_id after a successful order', async () => {
    rpc.mockImplementation(async () => ({ data: 'order-x', error: null }));
    await placeOrder(input);
    await placeOrder(input);
    const ids = rpc.mock.calls.map((c) => (c[1] as { p_client_request_id: string }).p_client_request_id);
    expect(ids[1]).not.toBe(ids[0]);
  });

  it('sends the database argument names', async () => {
    rpc.mockResolvedValue({ data: 'o', error: null });
    await placeOrder(input);
    expect(rpc).toHaveBeenCalledWith('place_order', {
      p_client_request_id: expect.any(String),
      p_items: [{ variant_id: 'v1', qty: 1 }],
      p_pincode: '431602',
      p_fulfilment: 'delivery',
      p_payment_method: 'cash',
      p_address: input.address,
      p_note: null,
    });
  });

  it('turns a database error into our code', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'invalid_payment_method', code: 'P0001' } });
    await expect(placeOrder(input)).rejects.toMatchObject({ code: 'invalid_payment_method' });
  });
});
