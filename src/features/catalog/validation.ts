export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export interface ProductInput {
  id?: string;
  slug: string;
  category_id: string | null;
  brand: string | null;
  name_en: string;
  name_hi: string | null;
  description_en: string | null;
  description_hi: string | null;
  images: string[];
  seo_title_en: string | null;
  seo_title_hi: string | null;
  seo_description_en: string | null;
  seo_description_hi: string | null;
  is_active: boolean;
}

export interface VariantInput {
  id?: string;
  product_id: string;
  label_en: string;
  label_hi: string | null;
  net_weight_g: number;
  pack_type: string | null;
  retail_price: number;
  mrp: number | null;
  sale_price: number | null;
  sale_ends_at: string | null;
  is_loose: boolean;
  loose_min_g: number | null;
  loose_step_g: number | null;
  min_stock: number | null;
  limited_below: number | null;
  is_active: boolean;
  sort: number;
}

export interface CategoryInput {
  id?: string;
  slug: string;
  parent_id?: string | null;
  name_en: string;
  name_hi?: string | null;
  image_url?: string | null;
  sort?: number;
  is_active?: boolean;
}

/** Error values are codes; the UI maps them to dictionary text (admin.errors.<code>). */
export type FieldErrors = Record<string, string>;

const blank = (s: string | null | undefined) => !s || s.trim() === '';
const isPositiveInt = (n: unknown) => typeof n === 'number' && Number.isInteger(n) && n > 0;
const isPositive = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && n > 0;

export function validateProduct(input: ProductInput): FieldErrors {
  const e: FieldErrors = {};
  if (!SLUG_RE.test(input.slug ?? '')) e.slug = 'invalid_slug';
  if (blank(input.name_en)) e.name_en = 'required';
  return e;
}

export function validateCategory(input: CategoryInput): FieldErrors {
  const e: FieldErrors = {};
  if (!SLUG_RE.test(input.slug ?? '')) e.slug = 'invalid_slug';
  if (blank(input.name_en)) e.name_en = 'required';
  return e;
}

export function validateVariant(input: VariantInput): FieldErrors {
  const e: FieldErrors = {};
  if (blank(input.label_en)) e.label_en = 'required';
  if (!isPositiveInt(input.net_weight_g)) e.net_weight_g = 'positive_integer';
  if (!isPositive(input.retail_price)) e.retail_price = 'positive_price';
  if (input.mrp != null && !isPositive(input.mrp)) e.mrp = 'positive_price';
  if (input.sale_price != null) {
    if (!isPositive(input.sale_price) || !(input.sale_price < input.retail_price)) e.sale_price = 'sale_below_retail';
    if (blank(input.sale_ends_at)) e.sale_ends_at = 'sale_end_required';
  }
  if (input.is_loose) {
    if (input.net_weight_g !== 1000) e.net_weight_g = 'loose_per_kg';
    if (!isPositiveInt(input.loose_step_g)) e.loose_step_g = 'positive_integer';
    else if (!isPositiveInt(input.loose_min_g) || (input.loose_min_g as number) < (input.loose_step_g as number))
      e.loose_min_g = 'min_at_least_step';
    else if ((input.loose_min_g as number) % (input.loose_step_g as number) !== 0) e.loose_min_g = 'min_multiple_of_step';
  }
  for (const k of ['min_stock', 'limited_below'] as const) {
    const v = input[k];
    if (v != null && !(typeof v === 'number' && Number.isFinite(v) && v >= 0)) e[k] = 'not_negative';
  }
  return e;
}
