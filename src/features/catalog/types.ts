export type StockLabel = 'Available' | 'Limited Stock' | 'Out of Stock';

/** A row of the variant_public view: never includes stock quantities. */
export interface PublicVariant {
  id: string;
  product_id: string;
  label_en: string;
  label_hi: string | null;
  net_weight_g: number;
  pack_type: string | null;
  price: number;
  mrp: number | null;
  retail_price: number;
  sale_ends_at: string | null;
  is_loose: boolean;
  loose_min_g: number | null;
  loose_step_g: number | null;
  stock_label: StockLabel;
  sort: number;
}

export interface PublicCategory {
  id: string;
  slug: string;
  parent_id: string | null;
  name_en: string;
  name_hi: string | null;
  image_url: string | null;
  sort: number;
}

export interface PublicProduct {
  id: string;
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
  variants: PublicVariant[];
}

export interface Catalog {
  categories: PublicCategory[];
  products: PublicProduct[];
}

export const EMPTY_CATALOG: Catalog = { categories: [], products: [] };
