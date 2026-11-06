import type { PublicProduct } from './types';

export interface ProductFilter {
  query?: string;
  categorySlug?: string | null;
  brand?: string | null;
  availability?: 'all' | 'available';
  loose?: boolean;
}

export function normalize(s: string | null | undefined): string {
  return (s ?? '').toLocaleLowerCase('en-IN').normalize('NFC').replace(/\s+/g, ' ').trim();
}

/** Filters products by text (English name, Hindi name, brand), category, brand, availability and loose. */
export function filterProducts(
  products: PublicProduct[],
  f: ProductFilter,
  categories: Array<{ id: string; slug: string; parent_id?: string | null }> = [],
): PublicProduct[] {
  const words = normalize(f.query).split(' ').filter(Boolean);
  let categoryIds: Set<string> | null = null;
  if (f.categorySlug) {
    const root = categories.find((c) => c.slug === f.categorySlug);
    categoryIds = new Set(root ? [root.id, ...categories.filter((c) => c.parent_id === root.id).map((c) => c.id)] : []);
  }
  return products.filter((p) => {
    if (categoryIds && !(p.category_id && categoryIds.has(p.category_id))) return false;
    if (f.brand && normalize(p.brand) !== normalize(f.brand)) return false;
    if (f.availability === 'available' && !p.variants.some((v) => v.stock_label !== 'Out of Stock')) return false;
    if (f.loose && !p.variants.some((v) => v.is_loose)) return false;
    if (words.length) {
      const hay = normalize([p.name_en, p.name_hi, p.brand].filter(Boolean).join(' '));
      if (!words.every((w) => hay.includes(w))) return false;
    }
    return true;
  });
}
