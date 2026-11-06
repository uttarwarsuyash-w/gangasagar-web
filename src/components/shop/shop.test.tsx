import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getDictionary } from '@/i18n/get-dictionary';
import type { PublicProduct, PublicVariant } from '@/features/catalog/types';

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/shop/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/lib/supabase/client', () => ({
  getSupabase: () => ({ from: () => ({ select: () => ({ in: async () => ({ data: [], error: null }) }) }) }),
}));

import { ProductCard } from './ProductCard';
import { LooseQuantity, VariantPicker } from './VariantPicker';
import { ShopBrowser } from './ShopBrowser';

const en = getDictionary('en');
const variant = (over: Partial<PublicVariant> = {}): PublicVariant => ({
  id: 'v1', product_id: 'p1', label_en: '500 g', label_hi: null, net_weight_g: 500, pack_type: null, price: 120,
  mrp: 140, retail_price: 120, sale_ends_at: null, is_loose: false, loose_min_g: null, loose_step_g: null,
  stock_label: 'Limited Stock', sort: 0, ...over,
});
const product: PublicProduct = {
  id: 'p1', slug: 'peanuts', category_id: null, brand: 'RK', name_en: 'Peanuts', name_hi: null, description_en: null,
  description_hi: null, images: [], seo_title_en: null, seo_title_hi: null, seo_description_en: null,
  seo_description_hi: null, variants: [variant()],
};

describe('ProductCard', () => {
  it('never renders a stock number', () => {
    const leaky = { ...product, variants: [{ ...variant(), stock_qty: 37, min_stock: 13 } as PublicVariant] };
    const { container } = render(<ProductCard lang="en" product={leaky} />);
    expect(container.textContent).not.toMatch(/37|13/);
    expect(container.textContent).toContain('Limited Stock');
    expect(container.textContent).toContain('₹120');
  });
  it('links to the product page in the current language', () => {
    render(<ProductCard lang="hi" product={product} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hi/product/peanuts/');
  });
});

describe('LooseQuantity', () => {
  it('starts at 250 g, + gives 500 g, − at 250 g stays 250 g', async () => {
    const user = userEvent.setup();
    function Harness() {
      return <VariantPicker lang="en" variants={[variant({ is_loose: true, net_weight_g: 1000, loose_min_g: 250, loose_step_g: 250, price: 200 })]} />;
    }
    render(<Harness />);
    const value = () => screen.getByTestId('loose-grams');
    expect(value()).toHaveTextContent('250 g');
    await user.click(screen.getByRole('button', { name: en.shop.less }));
    expect(value()).toHaveTextContent('250 g');
    await user.click(screen.getByRole('button', { name: en.shop.more }));
    expect(value()).toHaveTextContent('500 g');
    await user.click(screen.getByRole('button', { name: en.shop.more }));
    expect(value()).toHaveTextContent('750 g');
    await user.click(screen.getByRole('button', { name: en.shop.less }));
    expect(value()).toHaveTextContent('500 g');
  });
  it('exports a standalone stepper', () => expect(LooseQuantity).toBeTypeOf('function'));
});

describe('ShopBrowser', () => {
  it('shows "No products yet" for an empty catalogue', () => {
    render(<ShopBrowser lang="en" catalog={{ categories: [], products: [] }} />);
    expect(screen.getByText(en.shop.noProducts)).toBeInTheDocument();
  });
  it('lists products and filters by search', async () => {
    const user = userEvent.setup();
    const other = { ...product, id: 'p2', slug: 'chana', name_en: 'Chana', brand: null, variants: [variant({ id: 'v2', product_id: 'p2' })] };
    render(<ShopBrowser lang="en" catalog={{ categories: [], products: [product, other] }} />);
    expect(screen.getAllByRole('article')).toHaveLength(2);
    await user.type(screen.getByRole('searchbox'), 'chana');
    expect(screen.getAllByRole('article')).toHaveLength(1);
  });
});
