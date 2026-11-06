// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { ADMIN, CUSTOMER, createTestDb, createUser, type TestDb } from './harness';
import { makeProduct, makeVariant } from './fixtures';

let db: TestDb;
beforeAll(async () => {
  db = await createTestDb();
  await createUser(db, ADMIN);
  await createUser(db, CUSTOMER);
});

const deleteVariant = (id: string) => db.as(ADMIN, (q) => q('delete from public.variants where id = $1', [id]));
const deleteProduct = (id: string) => db.as(ADMIN, (q) => q('delete from public.products where id = $1', [id]));

async function orderWith(variantId: string) {
  const [o] = await db.admin<{ id: string }>(
    `insert into public.orders (number, user_id, client_request_id, fulfilment, weight_g, subtotal, delivery_fee, total, payment_method)
     values ('GKS-TEST-' || gen_random_uuid(), $1, gen_random_uuid(), 'pickup', 500, 100, 0, 100, 'cash') returning id`,
    [CUSTOMER.userId],
  );
  await db.admin(
    `insert into public.order_items (order_id, variant_id, unit_price, line_total, weight_g, qty) values ($1, $2, 100, 100, 500, 1)`,
    [o.id, variantId],
  );
}

describe('deleting catalogue rows keeps history', () => {
  it('still deletes a variant with no stock history or orders', async () => {
    const id = await makeVariant(db);
    await deleteVariant(id);
    expect(await db.admin('select 1 from public.variants where id = $1', [id])).toHaveLength(0);
  });

  it('refuses to delete a variant with stock movements (they would be lost)', async () => {
    const id = await makeVariant(db, { stock_qty: 0 });
    await db.as(ADMIN, (q) => q(`select public.admin_adjust_stock($1, 'incoming', 5, 'first stock')`, [id]));
    await expect(deleteVariant(id)).rejects.toThrow(/foreign key constraint/);
    expect(await db.admin('select 1 from public.stock_movements where variant_id = $1', [id])).toHaveLength(1);
  });

  it('refuses to delete a variant that is in an order (the order could never be confirmed)', async () => {
    const id = await makeVariant(db);
    await orderWith(id);
    await expect(deleteVariant(id)).rejects.toThrow(/foreign key constraint/);
  });

  it('refuses to delete a product whose variant has history', async () => {
    const productId = await makeProduct(db);
    const id = await makeVariant(db, { product_id: productId, stock_qty: 0 });
    await db.as(ADMIN, (q) => q(`select public.admin_adjust_stock($1, 'incoming', 2, null)`, [id]));
    await expect(deleteProduct(productId)).rejects.toThrow(/foreign key constraint/);
  });
});
