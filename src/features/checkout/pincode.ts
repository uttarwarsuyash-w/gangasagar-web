/** Same rule as the database's normalize_pincode: strip non-digits, keep exactly 6 digits, else null. */
export function normalizePincode(input: string | null | undefined): string | null {
  const digits = (input ?? '').replace(/\D/g, '');
  return /^\d{6}$/.test(digits) ? digits : null;
}
