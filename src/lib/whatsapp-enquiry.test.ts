import { describe, expect, it } from 'vitest';
import { buildProductEnquiryLink } from '@/features/catalog/enquiry';

describe('buildProductEnquiryLink', () => {
  it('goes to the main WhatsApp number with the encoded name and URL', () => {
    const link = buildProductEnquiryLink('Roasted Chana (500 g)', 'https://example.pages.dev/en/product/chana/', 'en');
    expect(link.startsWith('https://wa.me/919403951524?text=')).toBe(true);
    expect(link).toContain(encodeURIComponent('Roasted Chana (500 g)'));
    expect(link).toContain(encodeURIComponent('https://example.pages.dev/en/product/chana/'));
  });
  it('writes the Hindi message for hi', () => {
    const link = buildProductEnquiryLink('चना', 'https://x/hi/product/chana/', 'hi');
    expect(decodeURIComponent(link.split('?text=')[1])).toContain('नमस्ते');
  });
});
