import { describe, expect, it } from 'vitest';
import { normalizePincode } from './pincode';

describe('normalizePincode', () => {
  it.each([
    ['431602', '431602'],
    ['431 602', '431602'],
    ['43160', null],
    ['4316021', null],
    ['', null],
    [null, null],
  ])('%j → %j', (input, out) => expect(normalizePincode(input)).toBe(out));
});
