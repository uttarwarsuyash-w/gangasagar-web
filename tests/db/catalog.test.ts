// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, CUSTOMER, createTestDb, createUser, type TestDb } from './harness';
import { makeCategory, makeProduct, makeVariant } from './fixtures';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN);
  await createUser(db, CUSTOMER);
});

const publicRow = async (id: string) => {
  const rows = await db.as('anon', (q) =>
    q<Record<string, unknown>>('select * from public.variant_public where id = $1', [id]),
  );
  return rows[0];
};

describe('variants privacy', () => {
  it('anon cannot read stock quantities', async () => {
    await expect(db.as('anon', (q) => q('select stock_qty from public.variants'))).rejects.toThrow(/permission denied/);
  });

  it('a customer sees no variant rows directly', async () => {
    await makeVariant(db);
    const rows = await db.as(CUSTOMER, (q) => q('select id from public.variants'));
    expect(rows).toEqual([]);
  });

  it('variant_public has no stock quantity column', async () => {
    const id = await makeVariant(db);
    const row = await publicRow(id);
    expect(row).toBeDefined();
    expect(Object.keys(row)).not.toContain('stock_qty');
    expect(Object.keys(row)).not.toContain('min_stock');
    expect(Object.keys(row)).not.toContain('limited_below');
  });
});

describe('stock_label', () => {
  it('quantity 0 is Out of Stock', async () => {
    const id = await makeVariant(db, { stock_qty: 0, limited_below: 5 });
    expect((await publicRow(id)).stock_label).toBe('Out of Stock');
  });
  it('3 with limited_below 5 is Limited Stock', async () => {
    const id = await makeVariant(db, { stock_qty: 3, limited_below: 5 });
    expect((await publicRow(id)).stock_label).toBe('Limited Stock');
  });
  it('5 with limited_below 5 is Available', async () => {
    const id = await makeVariant(db, { stock_qty: 5, limited_below: 5 });
    expect((await publicRow(id)).stock_label).toBe('Available');
  });
});

describe('variant_public visibility and price', () => {
  it('omits variants of an inactive product', async () => {
    const productId = await makeProduct(db, { is_active: false });
    const id = await makeVariant(db, { product_id: productId });
    expect(await publicRow(id)).toBeUndefined();
  });
  it('omits inactive variants', async () => {
    const id = await makeVariant(db, { is_active: false });
    expect(await publicRow(id)).toBeUndefined();
  });
  it('uses the sale price while the sale is running', async () => {
    const id = await makeVariant(db, {
      retail_price: 120,
      sale_price: 99.5,
      sale_ends_at: new Date(Date.now() + 86400000).toISOString(),
    });
    expect(Number((await publicRow(id)).price)).toBe(99.5);
  });
  it('uses the retail price after sale_ends_at', async () => {
    const id = await makeVariant(db, {
      retail_price: 120,
      sale_price: 99.5,
      sale_ends_at: new Date(Date.now() - 1000).toISOString(),
    });
    expect(Number((await publicRow(id)).price)).toBe(120);
  });
});

describe('catalogue writes', () => {
  it('a customer cannot insert a product', async () => {
    const categoryId = await makeCategory(db);
    await expect(
      db.as(CUSTOMER, (q) =>
        q(`insert into public.products (slug, category_id, name_en) values ('x-cust', $1, 'X')`, [categoryId]),
      ),
    ).rejects.toThrow(/row-level security|permission denied/);
  });
  it('an admin can insert a product', async () => {
    const categoryId = await makeCategory(db);
    const rows = await db.as(ADMIN, (q) =>
      q<{ id: string }>(
        `insert into public.products (slug, category_id, name_en) values ('x-admin', $1, 'X') returning id`,
        [categoryId],
      ),
    );
    expect(rows).toHaveLength(1);
  });
  it('anon can read active products but not inactive ones', async () => {
    await makeProduct(db, { slug: 'visible-p' });
    await makeProduct(db, { slug: 'hidden-p', is_active: false });
    const rows = await db.as('anon', (q) => q<{ slug: string }>('select slug from public.products'));
    const slugs = rows.map((r) => r.slug);
    expect(slugs).toContain('visible-p');
    expect(slugs).not.toContain('hidden-p');
  });
});

describe('admin_adjust_stock', () => {
  const adjust = (who: Parameters<TestDb['as']>[0], id: string, kind: string, qty: number) =>
    db.as(who, (q) =>
      q<{ v: string }>('select public.admin_adjust_stock($1, $2, $3, $4) as v', [id, kind, qty, 'test']),
    );
  const qtyOf = async (id: string) =>
    Number((await db.admin<{ q: string }>('select stock_qty as q from public.variants where id = $1', [id]))[0].q);

  it('incoming, damaged and too-large damaged behave as documented', async () => {
    const id = await makeVariant(db, { stock_qty: 0 });
    const [a] = await adjust(ADMIN, id, 'incoming', 10);
    expect(Number(a.v)).toBe(10);
    const moves = await db.admin('select * from public.stock_movements where variant_id = $1', [id]);
    expect(moves).toHaveLength(1);
    expect(moves[0]).toMatchObject({ kind: 'incoming', created_by: ADMIN.userId });
    expect(Number(moves[0].qty)).toBe(10);

    const [b] = await adjust(ADMIN, id, 'damaged', 3);
    expect(Number(b.v)).toBe(7);
    const [m2] = await db.admin<{ qty: string }>(
      `select qty from public.stock_movements where variant_id = $1 and kind = 'damaged'`,
      [id],
    );
    expect(Number(m2.qty)).toBe(-3);

    await expect(adjust(ADMIN, id, 'damaged', 20)).rejects.toThrow('insufficient_stock');
    expect(await qtyOf(id)).toBe(7);
  });

  it('adjustment is signed', async () => {
    const id = await makeVariant(db, { stock_qty: 5 });
    expect(Number((await adjust(ADMIN, id, 'adjustment', -2))[0].v)).toBe(3);
    expect(Number((await adjust(ADMIN, id, 'adjustment', 4))[0].v)).toBe(7);
  });

  it('refuses customers', async () => {
    const id = await makeVariant(db, { stock_qty: 5 });
    await expect(adjust(CUSTOMER, id, 'incoming', 1)).rejects.toThrow('not_allowed');
    expect(await qtyOf(id)).toBe(5);
  });

  it('refuses sale and cancellation_return kinds', async () => {
    const id = await makeVariant(db, { stock_qty: 5 });
    await expect(adjust(ADMIN, id, 'sale', 1)).rejects.toThrow('invalid_kind');
    await expect(adjust(ADMIN, id, 'cancellation_return', 1)).rejects.toThrow('invalid_kind');
  });

  it('customers cannot write stock movements directly', async () => {
    const id = await makeVariant(db);
    await expect(
      db.as(CUSTOMER, (q) =>
        q(`insert into public.stock_movements (variant_id, kind, qty) values ($1, 'incoming', 5)`, [id]),
      ),
    ).rejects.toThrow(/permission denied|row-level security/);
  });
});

describe('public-images storage', () => {
  const insertObject = (who: Parameters<TestDb['as']>[0]) =>
    db.as(who, (q) => q(`insert into storage.objects (bucket_id, name) values ('public-images', 'products/a.webp')`));

  it('the bucket exists and is public', async () => {
    const rows = await db.admin<{ public: boolean }>(`select public from storage.buckets where id = 'public-images'`);
    expect(rows[0].public).toBe(true);
  });
  it('an admin can upload', async () => {
    await expect(insertObject(ADMIN)).resolves.toBeDefined();
  });
  it('a customer cannot upload', async () => {
    await expect(insertObject(CUSTOMER)).rejects.toThrow(/row-level security/);
  });
});
