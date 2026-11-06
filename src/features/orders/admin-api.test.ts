import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rpc, from, calls, result } = vi.hoisted(() => {
  const calls: Array<[string, ...unknown[]]> = [];
  const result: { value: { data: unknown; error: unknown } } = { value: { data: [], error: null } };
  const builder: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'gte', 'lte', 'or', 'order', 'limit', 'maybeSingle']) {
    builder[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return builder;
    };
  }
  builder.then = (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve(result.value).then(ok, bad);
  return { rpc: vi.fn(), from: vi.fn(() => builder), calls, result };
});
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ rpc, from }) }));

import { confirmOrder, getOrder, listOrders, recordPayment, setOrderStatus } from './admin-api';

const filters = () => calls.filter(([m]) => m === 'eq' || m === 'gte' || m === 'lte' || m === 'or');

describe('listOrders', () => {
  beforeEach(() => {
    calls.length = 0;
    result.value = { data: [], error: null };
    from.mockClear();
  });

  it('lists newest first with no filters by default', async () => {
    await listOrders({});
    expect(from).toHaveBeenCalledWith('orders');
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false }]);
    expect(filters()).toEqual([]);
  });

  it('filters by status', async () => {
    await listOrders({ status: 'Order Placed' });
    expect(filters()).toEqual([['eq', 'status', 'Order Placed']]);
  });

  it('filters by area, with pickup meaning the pickup fulfilment', async () => {
    await listOrders({ zone: 'outside' });
    expect(filters()).toEqual([['eq', 'zone', 'outside']]);
    calls.length = 0;
    await listOrders({ zone: 'pickup' });
    expect(filters()).toEqual([['eq', 'fulfilment', 'pickup']]);
  });

  it('treats dates as whole days in India time', async () => {
    await listOrders({ from: '2026-11-01', to: '2026-11-06' });
    expect(filters()).toEqual([
      ['gte', 'created_at', '2026-11-01T00:00:00+05:30'],
      ['lte', 'created_at', '2026-11-06T23:59:59.999+05:30'],
    ]);
  });

  it('searches number, name and phone and strips characters that would break the filter', async () => {
    await listOrders({ search: ' GKS-2611,(x) ' });
    expect(filters()).toEqual([
      ['or', 'number.ilike.*GKS-2611 x*,address->>name.ilike.*GKS-2611 x*,address->>phone.ilike.*GKS-2611 x*'],
    ]);
  });

  it('ignores a search that is only punctuation', async () => {
    await listOrders({ search: ',()' });
    expect(filters()).toEqual([]);
  });

  it('returns rows with numeric totals and the phone from the address', async () => {
    result.value = {
      data: [{ id: 'o1', number: 'GKS-2611-00001', total: '120.50', address: { name: 'Asha', phone: '9403951524' } }],
      error: null,
    };
    const rows = await listOrders({});
    expect(rows[0]).toMatchObject({ id: 'o1', total: 120.5, customer: 'Asha', phone: '9403951524' });
  });

  it('turns a database error into our code', async () => {
    result.value = { data: null, error: { message: 'Failed to fetch', name: 'TypeError' } };
    await expect(listOrders({})).rejects.toMatchObject({ code: 'network' });
  });
});

describe('getOrder', () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it('returns null for an unknown id', async () => {
    result.value = { data: null, error: null };
    await expect(getOrder('nope')).resolves.toBeNull();
    expect(calls).toContainEqual(['eq', 'id', 'nope']);
  });

  it('returns items and history sorted oldest first', async () => {
    result.value = {
      data: {
        id: 'o1',
        total: '50',
        subtotal: '50',
        delivery_fee: '0',
        address: { phone: '9372188080' },
        items: [{ id: 'i1', unit_price: '25', line_total: '50' }],
        history: [
          { status: 'Order Confirmed', created_at: '2026-11-06T10:00:00Z', note: null },
          { status: 'Order Placed', created_at: '2026-11-06T09:00:00Z', note: null },
        ],
      },
      error: null,
    };
    const o = await getOrder('o1');
    expect(o?.total).toBe(50);
    expect(o?.items[0].line_total).toBe(50);
    expect(o?.history.map((h) => h.status)).toEqual(['Order Placed', 'Order Confirmed']);
  });
});

describe('order actions', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it('confirms through admin_confirm_order', async () => {
    await confirmOrder('o1');
    expect(rpc).toHaveBeenCalledWith('admin_confirm_order', { p_order: 'o1' });
  });

  it('records payment through admin_record_payment', async () => {
    await recordPayment('o1', ' UTR123456 ');
    expect(rpc).toHaveBeenCalledWith('admin_record_payment', { p_order: 'o1', p_reference: 'UTR123456' });
  });

  it('moves status through admin_set_order_status', async () => {
    await setOrderStatus('o1', 'Processing', 'packed');
    expect(rpc).toHaveBeenCalledWith('admin_set_order_status', { p_order: 'o1', p_status: 'Processing', p_note: 'packed' });
  });

  it('surfaces insufficient_stock as its code', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'insufficient_stock', code: 'P0001' } });
    await expect(confirmOrder('o1')).rejects.toMatchObject({ code: 'insufficient_stock' });
  });
});

describe('listOrders search in Hindi', () => {
  it('keeps Devanagari vowel signs', async () => {
    calls.length = 0;
    result.value = { data: [], error: null };
    await listOrders({ search: 'आशा' });
    expect(filters()[0][1]).toContain('address->>name.ilike.*आशा*');
  });
});
