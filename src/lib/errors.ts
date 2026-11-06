/** Known error codes raised by our Postgres functions (raise exception '<code>'). */
const KNOWN = new Set([
  'not_allowed', 'insufficient_stock', 'invalid_kind', 'invalid_quantity', 'invalid_transition',
  'payment_required', 'invalid_state', 'not_found', 'unavailable', 'not_signed_in', 'quotation_required',
  'invalid_payment_method', 'invalid_address', 'invalid_pincode', 'invalid_fulfilment', 'empty_cart',
  'invalid_reference', 'invalid_request', 'duplicate', 'in_use', 'not_configured',
]);

/** Turns a Supabase/PostgREST error (or thrown Error) into one of our codes, or 'network' / 'unknown'. */
export function errorCode(err: unknown): string {
  if (!err) return 'unknown';
  const e = err as { message?: string; code?: string; name?: string };
  if (e.code === '23505') return 'duplicate';
  // Foreign-key refusal: the row has stock history or orders (deletes are restricted to keep them).
  if (e.code === '23503' || e.code === '23001') return 'in_use';
  const msg = (e.message ?? String(err)).trim();
  if (KNOWN.has(msg)) return msg;
  const found = [...KNOWN].find((k) => new RegExp(`\\b${k}\\b`).test(msg));
  if (found) return found;
  if (e.name === 'TypeError' || /failed to fetch|network|load failed/i.test(msg)) return 'network';
  return 'unknown';
}

export class AppError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

/** Throws an AppError with our code when a Supabase call returned an error. */
export function check<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw new AppError(errorCode(res.error));
  return res.data;
}

export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => vars[k] ?? '');
}
