import { getSupabase } from '@/lib/supabase/client';
import { check } from '@/lib/errors';
import type { CategoryInput, ProductInput, VariantInput } from './validation';

export interface ProductRow {
  id: string;
  slug: string;
  name_en: string;
  name_hi: string | null;
  brand: string | null;
  is_active: boolean;
  variant_count: number;
  category_name: string | null;
}

export interface VariantRow extends VariantInput {
  id: string;
  stock_qty: number;
  stock_unit: 'packs' | 'kg';
}

export interface ProductDetail extends ProductInput {
  id: string;
  variants: VariantRow[];
}

export interface CategoryRow extends CategoryInput {
  id: string;
  parent_id: string | null;
  name_hi: string | null;
  image_url: string | null;
  sort: number;
  is_active: boolean;
}

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

export async function listProducts(): Promise<ProductRow[]> {
  const rows = check(
    await getSupabase()
      .from('products')
      .select('id, slug, name_en, name_hi, brand, is_active, category:categories(name_en), variants(count)')
      .order('name_en'),
  ) as unknown as Array<Record<string, unknown>>;
  return rows.map((r) => ({
    id: r.id as string,
    slug: r.slug as string,
    name_en: r.name_en as string,
    name_hi: (r.name_hi as string) ?? null,
    brand: (r.brand as string) ?? null,
    is_active: r.is_active as boolean,
    category_name: ((r.category as { name_en?: string } | null)?.name_en as string) ?? null,
    variant_count: ((r.variants as Array<{ count: number }> | null)?.[0]?.count as number) ?? 0,
  }));
}

export async function getProduct(id: string): Promise<ProductDetail | null> {
  const row = check(
    await getSupabase().from('products').select('*, variants(*)').eq('id', id).maybeSingle(),
  ) as unknown as (ProductDetail & { variants: Array<Record<string, unknown>> }) | null;
  if (!row) return null;
  const variants = (row.variants ?? [])
    .map((v) => ({
      ...(v as unknown as VariantRow),
      retail_price: Number(v.retail_price),
      mrp: num(v.mrp),
      sale_price: num(v.sale_price),
      stock_qty: Number(v.stock_qty),
      min_stock: num(v.min_stock),
      limited_below: num(v.limited_below),
    }))
    .sort((a, b) => a.sort - b.sort || a.net_weight_g - b.net_weight_g);
  return { ...row, images: row.images ?? [], variants };
}

export async function saveProduct(input: ProductInput): Promise<string> {
  const { id, ...fields } = input;
  const db = getSupabase().from('products');
  const res = id
    ? await db.update(fields).eq('id', id).select('id').single()
    : await db.insert(fields).select('id').single();
  return (check(res) as { id: string }).id;
}

export async function saveVariant(input: VariantInput): Promise<string> {
  const { id, ...rest } = input;
  // Stock quantity is never written here: it changes only through admin_adjust_stock and orders.
  const fields = {
    ...rest,
    net_weight_g: rest.is_loose ? 1000 : rest.net_weight_g,
    stock_unit: rest.is_loose ? 'kg' : 'packs',
    loose_min_g: rest.is_loose ? rest.loose_min_g : null,
    loose_step_g: rest.is_loose ? rest.loose_step_g : null,
    sale_ends_at: rest.sale_price == null ? null : rest.sale_ends_at,
  };
  const db = getSupabase().from('variants');
  const res = id
    ? await db.update(fields).eq('id', id).select('id').single()
    : await db.insert(fields).select('id').single();
  return (check(res) as { id: string }).id;
}

export async function deleteProduct(id: string): Promise<void> {
  check(await getSupabase().from('products').delete().eq('id', id));
}

export async function deleteVariant(id: string): Promise<void> {
  check(await getSupabase().from('variants').delete().eq('id', id));
}

export async function listCategories(): Promise<CategoryRow[]> {
  return check(
    await getSupabase().from('categories').select('*').order('sort').order('name_en'),
  ) as unknown as CategoryRow[];
}

export async function saveCategory(input: CategoryInput): Promise<string> {
  const { id, ...fields } = input;
  const db = getSupabase().from('categories');
  const res = id
    ? await db.update(fields).eq('id', id).select('id').single()
    : await db.insert(fields).select('id').single();
  return (check(res) as { id: string }).id;
}

export async function deleteCategory(id: string): Promise<void> {
  check(await getSupabase().from('categories').delete().eq('id', id));
}

export interface DashboardCounts {
  activeProducts: number;
  newOrders: number;
  lowStock: number;
}

export async function dashboardCounts(): Promise<DashboardCounts> {
  const supabase = getSupabase();
  const [products, orders, variants] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Order Placed'),
    supabase.from('variants').select('stock_qty, min_stock').eq('is_active', true).not('min_stock', 'is', null),
  ]);
  check(products);
  check(orders);
  const rows = (check(variants) ?? []) as Array<{ stock_qty: number; min_stock: number }>;
  return {
    activeProducts: products.count ?? 0,
    newOrders: orders.count ?? 0,
    lowStock: rows.filter((r) => Number(r.stock_qty) < Number(r.min_stock)).length,
  };
}
