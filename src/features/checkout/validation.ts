import { normalizePincode } from './pincode';

export interface AddressInput {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  city: string;
  state?: string;
  pincode: string;
}

/** Strips +91 / 91 / 0 prefixes, spaces and dashes. */
export function normalizePhone(input: string): string {
  let d = (input ?? '').replace(/[\s-]/g, '');
  if (d.startsWith('+91')) d = d.slice(3);
  else if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d;
}

export const PHONE_RE = /^[6-9]\d{9}$/;

/** Error values are keys of checkout.errors. */
export function validateAddress(
  a: AddressInput,
  opts: { pickup?: boolean } = {},
): { errors: Record<string, string>; value: AddressInput } {
  const errors: Record<string, string> = {};
  const value: AddressInput = {
    name: (a.name ?? '').trim(),
    phone: normalizePhone(a.phone),
    line1: (a.line1 ?? '').trim(),
    line2: a.line2?.trim() || undefined,
    landmark: a.landmark?.trim() || undefined,
    city: (a.city ?? '').trim(),
    state: a.state?.trim() || undefined,
    pincode: normalizePincode(a.pincode) ?? (a.pincode ?? '').trim(),
  };
  if (!value.name) errors.name = 'required';
  if (!PHONE_RE.test(value.phone)) errors.phone = 'phone';
  if (!opts.pickup) {
    if (!value.line1) errors.line1 = 'required';
    if (!value.city) errors.city = 'required';
    if (!normalizePincode(a.pincode)) errors.pincode = 'pincode';
  }
  return { errors, value };
}
