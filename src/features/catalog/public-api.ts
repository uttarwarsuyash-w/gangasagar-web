import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { EMPTY_CATALOG, type Catalog, type PublicProduct, type PublicVariant } from './types';

let cached: Promise<Catalog> | null = null;

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function normaliseVariant(v: Record<string, unknown>): PublicVariant {
  return {
    ...(v as unknown as PublicVariant),
    price: Number(v.price),
    retail_price: Number(v.retail_price),
    mrp: num(v.mrp),
  };
}

async function load(): Promise<Catalog> {
  // Smoke tests build from a fixture file instead of a live database (build-time only, never shipped).
  const fixture = process.env.CATALOG_FIXTURE;
  if (fixture) return JSON.parse(await readFile(fixture, 'utf8')) as Catalog;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return EMPTY_CATALOG;

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const [cats, prods, vars] = await Promise.all([
    supabase.from('categories').select('id, slug, parent_id, name_en, name_hi, image_url, sort').eq('is_active', true).order('sort').order('name_en'),
    supabase
      .from('products')
      .select('id, slug, category_id, brand, name_en, name_hi, description_en, description_hi, images, seo_title_en, seo_title_hi, seo_description_en, seo_description_hi')
      .eq('is_active', true)
      .order('name_en'),
    supabase.from('variant_public').select('*').order('sort'),
  ]);
  // A configured but failing database must fail the build, not publish an empty shop.
  for (const r of [cats, prods, vars]) if (r.error) throw new Error(`fetchCatalog: ${r.error.message}`);

  const variants = (vars.data ?? []).map((v) => normaliseVariant(v as Record<string, unknown>));
  const products: PublicProduct[] = (prods.data ?? []).map((p) => ({
    ...(p as unknown as Omit<PublicProduct, 'variants'>),
    images: (p as { images?: string[] }).images ?? [],
    variants: variants
      .filter((v) => v.product_id === (p as { id: string }).id)
      .sort((a, b) => a.sort - b.sort || a.net_weight_g - b.net_weight_g),
  }));
  return { categories: (cats.data ?? []) as Catalog['categories'], products };
}

/** Build-time catalogue (anon key): active categories, active products and variant_public. */
export function fetchCatalog(): Promise<Catalog> {
  return (cached ??= load());
}
