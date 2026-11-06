import { describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn(async () => ({ data: { lines: [], errors: [] }, error: null })) }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ rpc }) }));

import { buildQuotationWhatsAppLink, priceCart, toRpcItems } from './pricing';

describe('priceCart', () => {
  it('sends packs as qty and loose as grams to price_cart', async () => {
    await priceCart([{ variantId: 'a', qty: 2 }, { variantId: 'b', grams: 500 }], '431 602', 'delivery');
    expect(rpc).toHaveBeenCalledWith('price_cart', {
      p_items: [{ variant_id: 'a', qty: 2 }, { variant_id: 'b', grams: 500 }],
      p_pincode: '431 602',
      p_fulfilment: 'delivery',
    });
  });
  it('maps items', () => expect(toRpcItems([{ variantId: 'x', qty: 1 }])).toEqual([{ variant_id: 'x', qty: 1 }]));
});

describe('buildQuotationWhatsAppLink', () => {
  it('lists each line for the main number', () => {
    const link = buildQuotationWhatsAppLink(
      [
        { name_en: 'Peanuts', name_hi: 'मूंगफली', label_en: '1 kg', label_hi: null, qty: 20, grams: null },
        { name_en: 'Chana', name_hi: null, label_en: 'Loose', label_hi: null, qty: null, grams: 5000 },
      ],
      'en',
    );
    expect(link.startsWith('https://wa.me/919403951524?text=')).toBe(true);
    const text = decodeURIComponent(link.split('?text=')[1]);
    expect(text).toContain('Peanuts 1 kg × 20');
    expect(text).toContain('Chana Loose 5 kg');
  });
});
