import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/catalog/public-api', () => ({
  fetchCatalog: async () => ({ categories: [], products: [] }),
}));

import { generateStaticParams as productParams } from '@/app/[lang]/product/[slug]/page';
import { generateStaticParams as categoryParams } from '@/app/[lang]/shop/[category]/page';

describe('static params with an empty catalogue', () => {
  it('product route builds a placeholder page', async () => {
    expect(await productParams()).toEqual([{ slug: '_' }]);
  });
  it('category route builds a placeholder page', async () => {
    expect(await categoryParams()).toEqual([{ category: '_' }]);
  });
});
