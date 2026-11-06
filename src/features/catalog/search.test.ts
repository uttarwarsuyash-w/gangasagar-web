import { describe, expect, it } from 'vitest';
import { filterProducts } from './search';
import type { PublicProduct, PublicVariant } from './types';

const v = (over: Partial<PublicVariant> = {}): PublicVariant => ({
  id: 'v', product_id: 'p', label_en: '500 g', label_hi: null, net_weight_g: 500, pack_type: null, price: 100,
  mrp: null, retail_price: 100, sale_ends_at: null, is_loose: false, loose_min_g: null, loose_step_g: null,
  stock_label: 'Available', sort: 0, ...over,
});
const p = (over: Partial<PublicProduct>): PublicProduct => ({
  id: 'p', slug: 'p', category_id: null, brand: null, name_en: '', name_hi: null, description_en: null,
  description_hi: null, images: [], seo_title_en: null, seo_title_hi: null, seo_description_en: null,
  seo_description_hi: null, variants: [v()], ...over,
});

const products = [
  p({ id: '1', slug: 'peanuts', name_en: 'Roasted Peanuts', name_hi: 'भुनी मूंगफली', brand: 'Gangasagar', category_id: 'c1' }),
  p({ id: '2', slug: 'chikki', name_en: 'Peanut Chikki', brand: 'RK', category_id: 'c2', variants: [v({ stock_label: 'Out of Stock' })] }),
  p({ id: '3', slug: 'chana', name_en: 'Roasted Chana', name_hi: 'भुना चना', brand: null, category_id: 'c1', variants: [v({ is_loose: true })] }),
];
const categories = [
  { id: 'c1', slug: 'namkeen' },
  { id: 'c2', slug: 'sweets' },
];
const ids = (r: PublicProduct[]) => r.map((x) => x.id);

describe('filterProducts', () => {
  it('matches the Hindi name', () => {
    expect(ids(filterProducts(products, { query: 'मूंगफली' }, categories))).toEqual(['1']);
  });
  it('matches the brand', () => {
    expect(ids(filterProducts(products, { query: 'rk' }, categories))).toEqual(['2']);
  });
  it('ignores case and extra spaces', () => {
    expect(ids(filterProducts(products, { query: '  ROASTED    peanuts ' }, categories))).toEqual(['1']);
    expect(ids(filterProducts(products, { query: 'peanut' }, categories))).toEqual(['1', '2']);
  });
  it('returns everything for an empty query', () => {
    expect(ids(filterProducts(products, { query: '   ' }, categories))).toEqual(['1', '2', '3']);
  });
  it('filters by category slug, brand, availability and loose', () => {
    expect(ids(filterProducts(products, { categorySlug: 'namkeen' }, categories))).toEqual(['1', '3']);
    expect(ids(filterProducts(products, { brand: 'RK' }, categories))).toEqual(['2']);
    expect(ids(filterProducts(products, { availability: 'available' }, categories))).toEqual(['1', '3']);
    expect(ids(filterProducts(products, { loose: true }, categories))).toEqual(['3']);
  });
});
