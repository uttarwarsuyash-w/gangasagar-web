// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, CUSTOMER, createTestDb, createUser, type TestDb } from './harness';
import { makeProduct, makeVariant } from './fixtures';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN);
  await createUser(db, CUSTOMER);
  await db.admin(`insert into public.delivery_areas (pincode, area) values ('431602', 'Gokul Nagar')`);
});

interface Priced {
  lines: Array<Record<string, unknown>>;
  weight_g: number;
  subtotal: number;
  zone: 'nanded' | 'outside' | null;
  delivery_fee: number | null;
  total: number | null;
  requires_quotation: boolean;
  errors: Array<{ code: string; variant_id?: string }>;
}

const price = async (items: unknown[], pin: string | null, f: string): Promise<Priced> => {
  const [r] = await db.as('anon', (q) =>
    q<{ p: Priced }>('select public.price_cart($1::jsonb, $2, $3) as p', [JSON.stringify(items), pin, f]),
  );
  return r.p;
};

const cases = [
  ['1999 g, ₹300, delivery',   { g: 1999,  value: 300, pin: '431602', f: 'delivery' }, { fee: 89 }],
  ['2000 g, ₹300, delivery',   { g: 2000,  value: 300, pin: '431602', f: 'delivery' }, { fee: 49 }],
  ['1500 g, ₹499, delivery',   { g: 1500,  value: 499, pin: '431602', f: 'delivery' }, { fee: 0 }],
  ['1500 g, ₹498.99',          { g: 1500,  value: 498.99, pin: '431602', f: 'delivery' }, { fee: 89 }],
  ['pickup',                    { g: 500,   value: 100, pin: null, f: 'pickup' },   { fee: 0 }],
  ['outside 19999 g',           { g: 19999, value: 900, pin: '411001', f: 'courier' }, { fee: 179, zone: 'outside' }],
  ['20000 g any zone',          { g: 20000, value: 900, pin: '431602', f: 'delivery' }, { requires_quotation: true, total: null }],
  ['spaces in pincode',         { g: 500,   value: 100, pin: '431 602', f: 'delivery' }, { zone: 'nanded' }],
  ['short pincode',             { g: 500,   value: 100, pin: '43160', f: 'delivery' }, { error: 'invalid_pincode' }],
  ['delivery outside Nanded',   { g: 500,   value: 100, pin: '411001', f: 'delivery' }, { error: 'invalid_fulfilment' }],
] as const;

describe('price_cart delivery rules', () => {
  it.each(cases)('%s', async (_name, input, expected) => {
    const variantId = await makeVariant(db, { net_weight_g: input.g, retail_price: input.value });
    const p = await price([{ variant_id: variantId, qty: 1 }], input.pin, input.f);
    expect(p.weight_g).toBe(input.g);
    expect(Number(p.subtotal)).toBe(input.value);
    if ('fee' in expected) {
      expect(p.errors).toEqual([]);
      expect(Number(p.delivery_fee)).toBe(expected.fee);
      expect(Number(p.total)).toBeCloseTo(input.value + expected.fee, 2);
    }
    if ('zone' in expected) expect(p.zone).toBe(expected.zone);
    if ('requires_quotation' in expected) {
      expect(p.requires_quotation).toBe(true);
      expect(p.total).toBeNull();
      expect(p.delivery_fee).toBeNull();
    }
    if ('error' in expected) {
      expect(p.errors.map((e) => e.code)).toContain(expected.error);
      expect(p.total).toBeNull();
    }
  });
});

describe('price_cart lines', () => {
  it('rejects loose grams off the step', async () => {
    const id = await makeVariant(db, { is_loose: true, retail_price: 200, loose_min_g: 250, loose_step_g: 250 });
    const p = await price([{ variant_id: id, grams: 300 }], null, 'pickup');
    expect(p.errors).toContainEqual({ code: 'invalid_quantity', variant_id: id });
  });

  it('rejects loose grams below the minimum', async () => {
    const id = await makeVariant(db, { is_loose: true, retail_price: 200, loose_min_g: 500, loose_step_g: 250 });
    const p = await price([{ variant_id: id, grams: 250 }], null, 'pickup');
    expect(p.errors).toContainEqual({ code: 'invalid_quantity', variant_id: id });
  });

  it('prices 250 g of loose at ₹200/kg as ₹50.00', async () => {
    const id = await makeVariant(db, { is_loose: true, retail_price: 200 });
    const p = await price([{ variant_id: id, grams: 250 }], null, 'pickup');
    expect(p.errors).toEqual([]);
    expect(Number(p.lines[0].line_total)).toBe(50);
    expect(p.lines[0].weight_g).toBe(250);
    expect(p.weight_g).toBe(250);
  });

  it('rounds loose line totals to 2 decimals', async () => {
    const id = await makeVariant(db, { is_loose: true, retail_price: 133.33 });
    const p = await price([{ variant_id: id, grams: 750 }], null, 'pickup');
    expect(Number(p.lines[0].line_total)).toBe(100);
  });

  it('multiplies pack price and weight by quantity', async () => {
    const id = await makeVariant(db, { net_weight_g: 500, retail_price: 60 });
    const p = await price([{ variant_id: id, qty: 3 }], null, 'pickup');
    expect(Number(p.subtotal)).toBe(180);
    expect(p.weight_g).toBe(1500);
  });

  it('rejects zero, fractional or missing pack quantities', async () => {
    const id = await makeVariant(db);
    for (const item of [{ variant_id: id, qty: 0 }, { variant_id: id, qty: 1.5 }, { variant_id: id }, { variant_id: id, grams: 500 }]) {
      const p = await price([item], null, 'pickup');
      expect(p.errors).toContainEqual({ code: 'invalid_quantity', variant_id: id });
    }
  });

  it('flags an inactive variant as unavailable and keeps it out of the subtotal', async () => {
    const live = await makeVariant(db, { retail_price: 100 });
    const dead = await makeVariant(db, { retail_price: 50, is_active: false });
    const p = await price([{ variant_id: live, qty: 1 }, { variant_id: dead, qty: 1 }], null, 'pickup');
    expect(p.errors).toContainEqual({ code: 'unavailable', variant_id: dead });
    expect(Number(p.subtotal)).toBe(100);
    expect(p.lines.find((l) => l.variant_id === dead)).toMatchObject({ unit_price: null, line_total: null });
    expect(p.total).toBeNull();
  });

  it('flags a variant of an inactive product as unavailable', async () => {
    const productId = await makeProduct(db, { is_active: false });
    const id = await makeVariant(db, { product_id: productId });
    const p = await price([{ variant_id: id, qty: 1 }], null, 'pickup');
    expect(p.errors).toContainEqual({ code: 'unavailable', variant_id: id });
  });

  it('flags a sold-out variant as unavailable', async () => {
    const id = await makeVariant(db, { stock_qty: 0 });
    const p = await price([{ variant_id: id, qty: 1 }], null, 'pickup');
    expect(p.errors).toContainEqual({ code: 'unavailable', variant_id: id });
  });

  it('flags an unknown or malformed variant id as unavailable', async () => {
    const p = await price([{ variant_id: 'not-a-uuid', qty: 1 }], null, 'pickup');
    expect(p.errors.map((e) => e.code)).toContain('unavailable');
  });

  it('uses a running sale price', async () => {
    const id = await makeVariant(db, {
      retail_price: 120,
      sale_price: 90,
      sale_ends_at: new Date(Date.now() + 86400000).toISOString(),
    });
    const p = await price([{ variant_id: id, qty: 2 }], null, 'pickup');
    expect(Number(p.lines[0].unit_price)).toBe(90);
    expect(Number(p.subtotal)).toBe(180);
  });

  it('returns names, labels and the public stock label, never stock numbers', async () => {
    const productId = await makeProduct(db, { name_en: 'Peanuts', name_hi: 'मूंगफली' });
    const id = await makeVariant(db, { product_id: productId, label_en: '1 kg', stock_qty: 2, limited_below: 5 });
    const p = await price([{ variant_id: id, qty: 1 }], null, 'pickup');
    expect(p.lines[0]).toMatchObject({ name_en: 'Peanuts', name_hi: 'मूंगफली', label_en: '1 kg', stock_label: 'Limited Stock' });
    expect(JSON.stringify(p)).not.toContain('stock_qty');
  });

  it('reports empty_cart for no items', async () => {
    const p = await price([], null, 'pickup');
    expect(p.errors).toEqual([{ code: 'empty_cart' }]);
    expect(p.total).toBeNull();
  });

  it('rejects an unknown fulfilment', async () => {
    const id = await makeVariant(db);
    const p = await price([{ variant_id: id, qty: 1 }], '431602', 'drone');
    expect(p.errors.map((e) => e.code)).toContain('invalid_fulfilment');
  });

  it('rejects courier for a Nanded pincode', async () => {
    const id = await makeVariant(db);
    const p = await price([{ variant_id: id, qty: 1 }], '431602', 'courier');
    expect(p.errors.map((e) => e.code)).toContain('invalid_fulfilment');
  });

  it('needs a pincode for delivery', async () => {
    const id = await makeVariant(db);
    const p = await price([{ variant_id: id, qty: 1 }], null, 'delivery');
    expect(p.errors.map((e) => e.code)).toContain('invalid_pincode');
    expect(p.zone).toBeNull();
  });

  it('reads fees from site_settings', async () => {
    await db.admin(`update public.site_settings set value = jsonb_set(value, '{outside_fee}', '200') where key = 'delivery'`);
    const id = await makeVariant(db, { retail_price: 100 });
    const p = await price([{ variant_id: id, qty: 1 }], '411001', 'transport');
    expect(Number(p.delivery_fee)).toBe(200);
    await db.admin(`update public.site_settings set value = jsonb_set(value, '{outside_fee}', '179') where key = 'delivery'`);
  });
});

describe('normalize_pincode', () => {
  it.each([
    ['431602', '431602'],
    ['431 602', '431602'],
    [' 431-602 ', '431602'],
    ['43160', null],
    ['4316021', null],
    ['', null],
    [null, null],
  ])('%s → %s', async (input, out) => {
    const [r] = await db.as('anon', (q) => q<{ v: string | null }>('select public.normalize_pincode($1) as v', [input]));
    expect(r.v).toBe(out);
  });
});

describe('delivery_areas', () => {
  it('anon can read', async () => {
    const rows = await db.as('anon', (q) => q('select * from public.delivery_areas'));
    expect(rows.length).toBeGreaterThan(0);
  });
  it('a customer cannot write', async () => {
    await expect(
      db.as(CUSTOMER, (q) => q(`insert into public.delivery_areas (pincode, area) values ('431603', 'X')`)),
    ).rejects.toThrow(/row-level security|permission denied/);
  });
  it('an admin can write', async () => {
    await db.as(ADMIN, (q) => q(`insert into public.delivery_areas (pincode, area) values ('431605', 'Y')`));
    const rows = await db.admin(`select * from public.delivery_areas where pincode = '431605'`);
    expect(rows).toHaveLength(1);
  });
});
