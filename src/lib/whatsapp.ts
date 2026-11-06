import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { formatRupees } from '@/lib/money';

/** Digits only, with any +91 / 91 / leading 0 removed, so a 10-digit Indian mobile remains. */
export function tenDigits(phone: string): string {
  let d = phone.replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

/** https://wa.me/91<10 digits>?text=<encoded> */
export function waLink(phone: string, text: string): string {
  return `https://wa.me/91${tenDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone: string): string {
  return `tel:+91${tenDigits(phone)}`;
}


/** The customer-facing WhatsApp text for a status change. */
export function statusMessage(order: { number: string; total: number }, status: string, lang: Lang): string {
  const o = getDictionary(lang).order;
  const label = o.statuses[status as keyof typeof o.statuses] ?? status;
  return o.orderUpdate
    .replace('{number}', order.number)
    .replace('{total}', formatRupees(order.total))
    .replace('{status}', label);
}
