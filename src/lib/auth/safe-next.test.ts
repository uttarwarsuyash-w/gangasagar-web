import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps a same-site path', () => expect(safeNext('/en/checkout/', 'en')).toBe('/en/checkout/'));
  it('keeps the query string and hash', () => expect(safeNext('/en/account/order/?id=o1#pay', 'en')).toBe('/en/account/order/?id=o1#pay'));
  it('defaults to the language home', () => expect(safeNext(null, 'hi')).toBe('/hi/'));
  it('rejects other sites', () => {
    expect(safeNext('https://evil.example/', 'en')).toBe('/en/');
    expect(safeNext('//evil.example/', 'en')).toBe('/en/');
    expect(safeNext('/\\evil.example', 'en')).toBe('/en/');
  });
  it('rejects tab and newline tricks that browsers strip', () => {
    expect(safeNext('/\t/evil.example', 'en')).toBe('/en/');
    expect(safeNext(decodeURIComponent('%2F%09%2Fevil.example'), 'en')).toBe('/en/');
    expect(safeNext('/\n/evil.example', 'en')).toBe('/en/');
    expect(safeNext('/\\\t\\evil.example', 'en')).toBe('/en/');
  });
});
