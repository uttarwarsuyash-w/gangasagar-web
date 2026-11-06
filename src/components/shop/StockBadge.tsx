import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import type { StockLabel } from '@/features/catalog/types';

const styles: Record<StockLabel, string> = {
  Available: 'bg-green-100 text-green-800',
  'Limited Stock': 'bg-accent/25 text-ink',
  'Out of Stock': 'bg-ink/10 text-ink/70',
};

export function StockBadge({ label, lang }: { label: StockLabel; lang: Lang }) {
  const text = getDictionary(lang).shop.stockLabels[label] ?? label;
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${styles[label] ?? ''}`}>{text}</span>;
}
