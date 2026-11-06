import type { TestDb } from './harness';

let n = 0;
const next = () => ++n;

export async function makeCategory(db: TestDb, over: Record<string, unknown> = {}) {
  const i = next();
  const [r] = await db.admin<{ id: string }>(
    `insert into public.categories (slug, name_en, is_active) values ($1, $2, $3) returning id`,
    [over.slug ?? `cat-${i}`, over.name_en ?? `Category ${i}`, over.is_active ?? true],
  );
  return r.id;
}

export async function makeProduct(db: TestDb, over: Record<string, unknown> = {}) {
  const i = next();
  const categoryId = (over.category_id as string | undefined) ?? (await makeCategory(db));
  const [r] = await db.admin<{ id: string }>(
    `insert into public.products (slug, category_id, brand, name_en, name_hi, is_active)
     values ($1, $2, $3, $4, $5, $6) returning id`,
    [
      over.slug ?? `product-${i}`,
      categoryId,
      over.brand ?? null,
      over.name_en ?? `Product ${i}`,
      over.name_hi ?? null,
      over.is_active ?? true,
    ],
  );
  return r.id;
}

export interface VariantFixture {
  product_id?: string;
  label_en?: string;
  net_weight_g?: number;
  retail_price?: number;
  sale_price?: number | null;
  sale_ends_at?: string | null;
  is_loose?: boolean;
  loose_min_g?: number | null;
  loose_step_g?: number | null;
  stock_qty?: number;
  stock_unit?: 'packs' | 'kg';
  min_stock?: number | null;
  limited_below?: number | null;
  is_active?: boolean;
}

export async function makeVariant(db: TestDb, over: VariantFixture = {}) {
  const productId = over.product_id ?? (await makeProduct(db));
  const loose = over.is_loose ?? false;
  const [r] = await db.admin<{ id: string }>(
    `insert into public.variants
       (product_id, label_en, net_weight_g, retail_price, sale_price, sale_ends_at, is_loose,
        loose_min_g, loose_step_g, stock_qty, stock_unit, min_stock, limited_below, is_active)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`,
    [
      productId,
      over.label_en ?? (loose ? 'Loose' : '500 g'),
      over.net_weight_g ?? (loose ? 1000 : 500),
      over.retail_price ?? 100,
      over.sale_price ?? null,
      over.sale_ends_at ?? null,
      loose,
      over.loose_min_g ?? (loose ? 250 : null),
      over.loose_step_g ?? (loose ? 250 : null),
      over.stock_qty ?? 100,
      over.stock_unit ?? (loose ? 'kg' : 'packs'),
      over.min_stock ?? null,
      over.limited_below ?? null,
      over.is_active ?? true,
    ],
  );
  return r.id;
}
