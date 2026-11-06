'use client';

import { MessageCircle } from 'lucide-react';
import { buildProductEnquiryLink, siteUrl } from '@/features/catalog/enquiry';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';

export function WhatsAppEnquiryButton({ lang, name, path }: { lang: Lang; name: string; path: string }) {
  const t = getDictionary(lang).shop;
  return (
    <a
      href={buildProductEnquiryLink(name, `${siteUrl()}${path}`, lang)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-green-700/40 bg-white px-6 py-3 font-semibold text-green-800 hover:bg-green-50 sm:w-auto"
    >
      <MessageCircle aria-hidden className="h-5 w-5" /> {t.enquire}
    </a>
  );
}
