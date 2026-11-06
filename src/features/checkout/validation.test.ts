import { describe, expect, it } from 'vitest';
import { normalizePhone, validateAddress } from './validation';

const base = { name: 'Asha Patil', phone: '9403951524', line1: '12 Station Road', city: 'Nanded', pincode: '431602' };

describe('normalizePhone', () => {
  it.each([
    ['+91 94039 51524', '9403951524'],
    ['094039-51524', '9403951524'],
    ['91 9403951524', '9403951524'],
    ['9403951524', '9403951524'],
  ])('%j → %j', (input, out) => expect(normalizePhone(input)).toBe(out));
});

describe('validateAddress', () => {
  it('normalises phone and pincode', () => {
    const r = validateAddress({ ...base, phone: '+91 94039 51524', pincode: '431 602' });
    expect(r.errors).toEqual({});
    expect(r.value.phone).toBe('9403951524');
    expect(r.value.pincode).toBe('431602');
  });
  it('rejects a short phone', () => {
    expect(validateAddress({ ...base, phone: '12345' }).errors).toHaveProperty('phone');
  });
  it('rejects a number that is not a mobile', () => {
    expect(validateAddress({ ...base, phone: '1234567890' }).errors).toHaveProperty('phone');
  });
  it('rejects a short pincode with a message instead of guessing', () => {
    expect(validateAddress({ ...base, pincode: '43160' }).errors).toHaveProperty('pincode');
  });
  it('requires name, line1 and city for delivery', () => {
    const r = validateAddress({ name: ' ', phone: '9403951524', line1: '', city: '', pincode: '431602' });
    expect(Object.keys(r.errors).sort()).toEqual(['city', 'line1', 'name']);
  });
  it('needs only name and phone for pickup', () => {
    const r = validateAddress({ name: 'Asha', phone: '9403951524', line1: '', city: '', pincode: '' }, { pickup: true });
    expect(r.errors).toEqual({});
  });
});
