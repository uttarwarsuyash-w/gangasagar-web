import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps a same-site path', () => expect(safeNext('/en/checkout/', 'en')).toBe('/en/checkout/'));
  it('defaults to the language home', () => expect(safeNext(null, 'hi')).toBe('/hi/'));
  it('rejects other sites', () => {
    expect(safeNext('https://evil.example/', 'en')).toBe('/en/');
    expect(safeNext('//evil.example/', 'en')).toBe('/en/');
    expect(safeNext('/\\evil.example', 'en')).toBe('/en/');
  });
});
