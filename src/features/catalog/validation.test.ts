import { describe, expect, it } from 'vitest';
import { validateCategory, validateProduct, validateVariant, type ProductInput, type VariantInput } from './validation';

const product = (over: Partial<ProductInput> = {}): ProductInput => ({
  slug: 'peanuts',
  category_id: null,
  brand: null,
  name_en: 'Peanuts',
  name_hi: null,
  description_en: null,
  description_hi: null,
  images: [],
  seo_title_en: null,
  seo_title_hi: null,
  seo_description_en: null,
  seo_description_hi: null,
  is_active: true,
  ...over,
});

const variant = (over: Partial<VariantInput> = {}): VariantInput => ({
  product_id: 'p1',
  label_en: '500 g',
  label_hi: null,
  net_weight_g: 500,
  pack_type: null,
  retail_price: 100,
  mrp: null,
  sale_price: null,
  sale_ends_at: null,
  is_loose: false,
  loose_min_g: null,
  loose_step_g: null,
  min_stock: null,
  limited_below: null,
  is_active: true,
  sort: 0,
  ...over,
});

describe('validateProduct', () => {
  it('accepts a valid product', () => expect(validateProduct(product())).toEqual({}));
  it.each(['Peanuts', 'pea nuts', '-peanuts', 'peanuts-', 'pea--nuts', 'मूंगफली', ''])('rejects slug %j', (slug) => {
    expect(validateProduct(product({ slug }))).toHaveProperty('slug');
  });
  it.each(['peanuts', 'roasted-chana-500', 'a1'])('accepts slug %j', (slug) => {
    expect(validateProduct(product({ slug }))).not.toHaveProperty('slug');
  });
  it('requires name_en', () => {
    expect(validateProduct(product({ name_en: '  ' }))).toHaveProperty('name_en');
  });
});

describe('validateVariant', () => {
  it('accepts a valid pack', () => expect(validateVariant(variant())).toEqual({}));
  it.each([0, -5, 1.5, NaN])('rejects net weight %s', (net_weight_g) => {
    expect(validateVariant(variant({ net_weight_g }))).toHaveProperty('net_weight_g');
  });
  it.each([0, -1, NaN])('rejects retail price %s', (retail_price) => {
    expect(validateVariant(variant({ retail_price }))).toHaveProperty('retail_price');
  });
  it('requires a sale price below the retail price', () => {
    const ends = '2099-01-01T00:00:00Z';
    expect(validateVariant(variant({ sale_price: 100, sale_ends_at: ends }))).toHaveProperty('sale_price');
    expect(validateVariant(variant({ sale_price: 120, sale_ends_at: ends }))).toHaveProperty('sale_price');
    expect(validateVariant(variant({ sale_price: 90, sale_ends_at: ends }))).toEqual({});
  });
  it('needs an end date for a sale', () => {
    expect(validateVariant(variant({ sale_price: 90 }))).toHaveProperty('sale_ends_at');
  });
  it('requires label_en', () => expect(validateVariant(variant({ label_en: '' }))).toHaveProperty('label_en'));

  describe('loose', () => {
    const loose = (over: Partial<VariantInput> = {}) =>
      variant({ is_loose: true, net_weight_g: 1000, loose_min_g: 250, loose_step_g: 250, ...over });
    it('accepts min 500 step 250', () => expect(validateVariant(loose({ loose_min_g: 500 }))).toEqual({}));
    it('needs a step above 0', () => {
      expect(validateVariant(loose({ loose_step_g: 0 }))).toHaveProperty('loose_step_g');
      expect(validateVariant(loose({ loose_step_g: null }))).toHaveProperty('loose_step_g');
    });
    it('needs minimum ≥ step', () => {
      expect(validateVariant(loose({ loose_min_g: 100, loose_step_g: 250 }))).toHaveProperty('loose_min_g');
    });
    it('needs minimum divisible by step', () => {
      expect(validateVariant(loose({ loose_min_g: 600, loose_step_g: 250 }))).toHaveProperty('loose_min_g');
    });
  });
});

describe('validateCategory', () => {
  it('checks slug and English name', () => {
    expect(validateCategory({ slug: 'Bad Slug', name_en: '' })).toMatchObject({ slug: expect.any(String), name_en: expect.any(String) });
    expect(validateCategory({ slug: 'namkeen', name_en: 'Namkeen' })).toEqual({});
  });
});
