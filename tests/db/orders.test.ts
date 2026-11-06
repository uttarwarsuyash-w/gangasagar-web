// @vitest-environment node
import { randomUUID } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, CUSTOMER, CUSTOMER_B, createTestDb, createUser, type TestDb, type Who } from './harness';
import { makeVariant } from './fixtures';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN);
  await createUser(db, CUSTOMER);
  await createUser(db, CUSTOMER_B);
  await db.admin(`insert into public.delivery_areas (pincode, area) values ('431602', 'Gokul Nagar')`);
});

const ADDRESS = { name: 'Asha Patil', phone: '9876543210', line1: '12 Station Road', city: 'Nanded' };

interface OrderArgs {
  crid?: string;
  items: unknown[];
  pin?: string | null;
  f?: string;
  pay?: string;
  address?: unknown;
  note?: string | null;
}

const place = (who: Who, a: OrderArgs) =>
  db
    .as(who, (q) =>
      q<{ id: string }>('select public.place_order($1, $2::jsonb, $3, $4, $5, $6::jsonb, $7) as id', [
        a.crid ?? randomUUID(),
        JSON.stringify(a.items),
        a.pin === undefined ? '431602' : a.pin,
        a.f ?? 'delivery',
        a.pay ?? 'cash',
        a.address === undefined ? JSON.stringify(ADDRESS) : JSON.stringify(a.address),
        a.note ?? null,
      ]),
    )
    .then((r) => r[0].id);

const call = (who: Who, sql: string, params: unknown[]) => db.as(who, (q) => q(sql, params));
const confirm = (who: Who, id: string) => call(who, 'select public.admin_confirm_order($1)', [id]);
const setStatus = (who: Who, id: string, s: string) =>
  call(who, 'select public.admin_set_order_status($1, $2, $3)', [id, s, null]);
const order = async (id: string) => (await db.admin<Record<string, unknown>>('select * from public.orders where id = $1', [id]))[0];
const stock = async (id: string) =>
  Number((await db.admin<{ q: string }>('select stock_qty as q from public.variants where id = $1', [id]))[0].q);

describe('place_order', () => {
  it('refuses anon', async () => {
    const v = await makeVariant(db);
    await expect(place('anon', { items: [{ variant_id: v, qty: 1 }] })).rejects.toThrow(/not_signed_in|permission denied/);
  });

  it('creates a Nanded order whose total equals price_cart', async () => {
    const v = await makeVariant(db, { net_weight_g: 1500, retail_price: 300 });
    const items = [{ variant_id: v, qty: 1 }];
    const id = await place(CUSTOMER, { items, pin: '431 602' });
    const o = await order(id);
    const [p] = await db.admin<{ p: { total: number } }>(`select public.price_cart($1::jsonb, '431602', 'delivery') as p`, [
      JSON.stringify(items),
    ]);
    expect(Number(o.total)).toBe(Number(p.p.total));
    expect(Number(o.total)).toBe(389);
    expect(Number(o.delivery_fee)).toBe(89);
    expect(o).toMatchObject({ status: 'Order Placed', zone: 'nanded', pincode: '431602', user_id: CUSTOMER.userId, payment_status: 'unpaid' });
    expect(String(o.number)).toMatch(/^GKS-\d{4}-\d{5}$/);
    const hist = await db.admin('select * from public.order_status_history where order_id = $1', [id]);
    expect(hist).toHaveLength(1);
    expect(hist[0].status).toBe('Order Placed');
    const lines = await db.admin<Record<string, unknown>>('select * from public.order_items where order_id = $1', [id]);
    expect(lines).toHaveLength(1);
    expect(Number(lines[0].line_total)).toBe(300);
  });

  it('returns the same order for a repeated client_request_id', async () => {
    const v = await makeVariant(db);
    const crid = randomUUID();
    const a = await place(CUSTOMER, { crid, items: [{ variant_id: v, qty: 1 }] });
    const b = await place(CUSTOMER, { crid, items: [{ variant_id: v, qty: 1 }] });
    expect(b).toBe(a);
    const rows = await db.admin('select id from public.orders where client_request_id = $1', [crid]);
    expect(rows).toHaveLength(1);
  });

  it('needs a quotation at 20 kg', async () => {
    const v = await makeVariant(db, { net_weight_g: 20000, retail_price: 900 });
    await expect(place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] })).rejects.toThrow('quotation_required');
  });

  it('allows only UPI prepaid outside Nanded', async () => {
    const v = await makeVariant(db);
    await expect(
      place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], pin: '411001', f: 'courier', pay: 'cash' }),
    ).rejects.toThrow('invalid_payment_method');
  });

  it('refuses upi_prepaid in Nanded', async () => {
    const v = await makeVariant(db);
    await expect(place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], pay: 'upi_prepaid' })).rejects.toThrow(
      'invalid_payment_method',
    );
  });

  it('passes price_cart errors through', async () => {
    const v = await makeVariant(db, { is_active: false });
    await expect(place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] })).rejects.toThrow('unavailable');
    await expect(place(CUSTOMER, { items: [] })).rejects.toThrow('empty_cart');
    const w = await makeVariant(db);
    await expect(place(CUSTOMER, { items: [{ variant_id: w, qty: 1 }], pin: '43160' })).rejects.toThrow('invalid_pincode');
  });

  it('requires a full address for delivery', async () => {
    const v = await makeVariant(db);
    for (const address of [
      { ...ADDRESS, phone: '12345' },
      { ...ADDRESS, line1: '' },
      { ...ADDRESS, city: undefined },
      { ...ADDRESS, name: ' ' },
      null,
    ]) {
      await expect(place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], address })).rejects.toThrow('invalid_address');
    }
  });

  it('accepts pickup with just a name and phone', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, {
      items: [{ variant_id: v, qty: 1 }],
      pin: null,
      f: 'pickup',
      address: { name: 'Asha', phone: '9876543210' },
    });
    const o = await order(id);
    expect(o).toMatchObject({ fulfilment: 'pickup', zone: null });
    expect(Number(o.delivery_fee)).toBe(0);
  });

  it('customers cannot read each other’s orders', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    const mine = await db.as(CUSTOMER, (q) => q('select id from public.orders where id = $1', [id]));
    expect(mine).toHaveLength(1);
    const theirs = await db.as(CUSTOMER_B, (q) => q('select id from public.orders where id = $1', [id]));
    expect(theirs).toHaveLength(0);
    const items = await db.as(CUSTOMER_B, (q) => q('select id from public.order_items where order_id = $1', [id]));
    expect(items).toHaveLength(0);
    const hist = await db.as(CUSTOMER_B, (q) => q('select id from public.order_status_history where order_id = $1', [id]));
    expect(hist).toHaveLength(0);
  });

  it('customers cannot write orders directly', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await expect(call(CUSTOMER, `update public.orders set total = 1 where id = $1`, [id])).rejects.toThrow(/permission denied/);
    await expect(
      call(CUSTOMER, `insert into public.order_status_history (order_id, status) values ($1, 'Delivered')`, [id]),
    ).rejects.toThrow(/permission denied/);
  });
});

describe('admin_confirm_order', () => {
  it('deducts packs and loose kg and writes sale movements', async () => {
    const pack = await makeVariant(db, { stock_qty: 10 });
    const loose = await makeVariant(db, { is_loose: true, retail_price: 200, stock_qty: 5 });
    const id = await place(CUSTOMER, { items: [{ variant_id: pack, qty: 3 }, { variant_id: loose, grams: 750 }] });
    await confirm(ADMIN, id);
    expect(await stock(pack)).toBe(7);
    expect(await stock(loose)).toBe(4.25);
    const moves = await db.admin<{ kind: string; qty: string; order_id: string }>(
      'select kind, qty, order_id from public.stock_movements where order_id = $1 order by qty',
      [id],
    );
    expect(moves.map((m) => [m.kind, Number(m.qty)])).toEqual([
      ['sale', -3],
      ['sale', -0.75],
    ]);
    const o = await order(id);
    expect(o.status).toBe('Order Confirmed');
    expect(o.confirmed_at).not.toBeNull();
    const hist = await db.admin('select status from public.order_status_history where order_id = $1 order by created_at, id', [id]);
    expect(hist.map((h) => h.status)).toContain('Order Confirmed');
  });

  it('changes nothing when stock is short', async () => {
    const a = await makeVariant(db, { stock_qty: 10 });
    const b = await makeVariant(db, { stock_qty: 2 });
    const id = await place(CUSTOMER, { items: [{ variant_id: a, qty: 1 }, { variant_id: b, qty: 1 }] });
    await db.admin('update public.variants set stock_qty = 0.5 where id = $1', [b]);
    await expect(confirm(ADMIN, id)).rejects.toThrow('insufficient_stock');
    expect(await stock(a)).toBe(10);
    expect(await stock(b)).toBe(0.5);
    expect((await order(id)).status).toBe('Order Placed');
    const moves = await db.admin('select * from public.stock_movements where order_id = $1', [id]);
    expect(moves).toHaveLength(0);
  });

  it('only confirms an Order Placed order once', async () => {
    const v = await makeVariant(db, { stock_qty: 10 });
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await confirm(ADMIN, id);
    await expect(confirm(ADMIN, id)).rejects.toThrow('invalid_transition');
    expect(await stock(v)).toBe(9);
  });
});

describe('payments and status flow', () => {
  const outsideOrder = async () => {
    const v = await makeVariant(db, { stock_qty: 10 });
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], pin: '411001', f: 'courier', pay: 'upi_prepaid' });
    await confirm(ADMIN, id);
    return id;
  };

  it('outside orders need payment before Processing', async () => {
    const id = await outsideOrder();
    await expect(setStatus(ADMIN, id, 'Processing')).rejects.toThrow('payment_required');
    await call(CUSTOMER, 'select public.submit_payment_reference($1, $2)', [id, 'UTR123456789']);
    expect(await order(id)).toMatchObject({ payment_status: 'submitted', upi_reference: 'UTR123456789' });
    await expect(setStatus(ADMIN, id, 'Processing')).rejects.toThrow('payment_required');
    await call(ADMIN, 'select public.admin_record_payment($1, $2)', [id, 'UTR123456789']);
    expect((await order(id)).payment_status).toBe('paid');
    await setStatus(ADMIN, id, 'Processing');
    expect((await order(id)).status).toBe('Processing');
  });

  it('payment references must be 6–30 letters or digits', async () => {
    const id = await outsideOrder();
    for (const ref of ['12345', 'abc 123456', 'x'.repeat(31), 'UTR-12345']) {
      await expect(call(CUSTOMER, 'select public.submit_payment_reference($1, $2)', [id, ref])).rejects.toThrow(
        'invalid_reference',
      );
    }
  });

  it('only the owner can submit a reference, and only for an outside confirmed order', async () => {
    const id = await outsideOrder();
    await expect(call(CUSTOMER_B, 'select public.submit_payment_reference($1, $2)', [id, 'UTR123456'])).rejects.toThrow(
      'not_allowed',
    );
    const v = await makeVariant(db);
    const nanded = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await confirm(ADMIN, nanded);
    await expect(call(CUSTOMER, 'select public.submit_payment_reference($1, $2)', [nanded, 'UTR123456'])).rejects.toThrow(
      'invalid_state',
    );
    const placed = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], pin: '411001', f: 'courier', pay: 'upi_prepaid' });
    await expect(call(CUSTOMER, 'select public.submit_payment_reference($1, $2)', [placed, 'UTR123456'])).rejects.toThrow(
      'invalid_state',
    );
  });

  it('refuses Placed → Delivered', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await expect(setStatus(ADMIN, id, 'Delivered')).rejects.toThrow('invalid_transition');
  });

  it('walks a delivery order forward to Delivered and issues an invoice', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await confirm(ADMIN, id);
    await expect(setStatus(ADMIN, id, 'Dispatched')).rejects.toThrow('invalid_transition');
    for (const s of ['Processing', 'Dispatched', 'Out for Delivery']) await setStatus(ADMIN, id, s);
    await expect(setStatus(ADMIN, id, 'Processing')).rejects.toThrow('invalid_transition');
    await setStatus(ADMIN, id, 'Delivered');
    const o = await order(id);
    expect(o.status).toBe('Delivered');
    expect(o.delivered_at).not.toBeNull();
    expect(String(o.invoice_number)).toMatch(/^INV-\d{4}-\d{5}$/);
    const hist = await db.admin<{ status: string }>(
      'select status from public.order_status_history where order_id = $1 order by created_at, id',
      [id],
    );
    expect(hist.map((h) => h.status)).toEqual([
      'Order Placed',
      'Order Confirmed',
      'Processing',
      'Dispatched',
      'Out for Delivery',
      'Delivered',
    ]);
  });

  it('lets a pickup order go Processing → Delivered', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }], pin: null, f: 'pickup', address: { name: 'A', phone: '9876543210' } });
    await confirm(ADMIN, id);
    await setStatus(ADMIN, id, 'Processing');
    await expect(setStatus(ADMIN, id, 'Dispatched')).rejects.toThrow('invalid_transition');
    await setStatus(ADMIN, id, 'Delivered');
    expect((await order(id)).status).toBe('Delivered');
  });

  it('refuses customers on every admin_ function', async () => {
    const v = await makeVariant(db);
    const id = await place(CUSTOMER, { items: [{ variant_id: v, qty: 1 }] });
    await expect(confirm(CUSTOMER, id)).rejects.toThrow('not_allowed');
    await expect(call(CUSTOMER, 'select public.admin_record_payment($1, $2)', [id, 'UTR123456'])).rejects.toThrow('not_allowed');
    await expect(setStatus(CUSTOMER, id, 'Processing')).rejects.toThrow('not_allowed');
    await expect(call(CUSTOMER, 'select public.admin_adjust_stock($1, $2, $3, $4)', [v, 'incoming', 1, null])).rejects.toThrow(
      'not_allowed',
    );
  });
});
