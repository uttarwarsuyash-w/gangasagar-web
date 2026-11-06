import { FileText, Info, MessageCircle } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { fill } from '@/lib/errors';
import { formatRupees, formatWeight } from '@/lib/money';

export interface DeliveryRules {
  nanded_free_min_value: number;
  nanded_light_fee: number;
  nanded_heavy_fee: number;
  nanded_heavy_min_g: number;
  outside_fee: number;
  quotation_min_g: number;
}

/** The plan's defaults; the cart replaces them with site_settings.delivery when it loads. Hints only — fees come from price_cart. */
export const DEFAULT_RULES: DeliveryRules = {
  nanded_free_min_value: 499,
  nanded_light_fee: 89,
  nanded_heavy_fee: 49,
  nanded_heavy_min_g: 2000,
  outside_fee: 179,
  quotation_min_g: 20000,
};

export function DeliveryNotice({
  lang,
  weightG,
  subtotal,
  zone,
  requiresQuotation,
  rules,
  quotationLink,
}: {
  lang: Lang;
  weightG: number;
  subtotal: number;
  zone: 'nanded' | 'outside' | null;
  requiresQuotation: boolean;
  rules: DeliveryRules;
  quotationLink: string;
}) {
  const t = getDictionary(lang).cart;
  if (requiresQuotation) {
    return (
      <div className="rounded-2xl border border-accent/60 bg-accent/10 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <FileText aria-hidden className="h-5 w-5" /> {t.quotationTitle}
        </p>
        <p className="mt-1 text-ink/80">{fill(t.quotationText, { kg: formatWeight(rules.quotation_min_g) })}</p>
        <a
          href={quotationLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-full bg-green-700 px-5 py-2.5 font-semibold text-white hover:bg-green-800"
        >
          <MessageCircle aria-hidden className="h-5 w-5" /> {t.quotationButton}
        </a>
      </div>
    );
  }
  if (zone === 'outside') return null;
  const belowFree = subtotal < rules.nanded_free_min_value;
  const showHeavy = belowFree && weightG < rules.nanded_heavy_min_g;
  if (!belowFree) return null;
  return (
    <ul className="space-y-2 rounded-2xl bg-brand-light/60 p-4 text-sm">
      <li data-testid="free-hint" className="flex gap-2">
        <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        {fill(t.freeHint, { amount: formatRupees(Math.round((rules.nanded_free_min_value - subtotal) * 100) / 100) })}
      </li>
      {showHeavy && (
        <li data-testid="heavy-hint" className="flex gap-2">
          <Info aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          {fill(t.heavyHint, {
            heavy: formatRupees(rules.nanded_heavy_fee),
            light: formatRupees(rules.nanded_light_fee),
            kg: formatWeight(rules.nanded_heavy_min_g),
          })}
        </li>
      )}
    </ul>
  );
}
