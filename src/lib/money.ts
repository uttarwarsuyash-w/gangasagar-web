const whole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
const paise = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** ₹1,234 or ₹49.50 */
export function formatRupees(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const n = Number(value);
  return Number.isInteger(n) ? whole.format(n) : paise.format(n);
}

/** 1500 → "1.5 kg", 250 → "250 g" */
export function formatWeight(grams: number): string {
  if (grams >= 1000) return `${Number((grams / 1000).toFixed(3))} kg`;
  return `${grams} g`;
}
