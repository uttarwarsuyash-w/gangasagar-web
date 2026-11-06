import { BUSINESS } from '@/config/business';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';
import { waLink } from '@/lib/whatsapp';

/** WhatsApp link to the main number asking about one product. */
export function buildProductEnquiryLink(name: string, url: string, lang: Lang): string {
  return waLink(BUSINESS.whatsapp.main, fill(getDictionary(lang).shop.enquiryText, { name, url }));
}

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim()) return env.replace(/\/+$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
}
