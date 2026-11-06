import { describe, expect, it } from 'vitest';
import { localHref, pick, switchPath } from './localized';

describe('pick', () => {
  const row = { name_en: 'Peanuts', name_hi: 'मूंगफली' };
  it('returns the Hindi value for hi', () => expect(pick(row, 'name', 'hi')).toBe('मूंगफली'));
  it('returns the English value for en', () => expect(pick(row, 'name', 'en')).toBe('Peanuts'));
  it.each([null, undefined, '', '   '])('falls back to English when Hindi is %j', (v) => {
    expect(pick({ name_en: 'Peanuts', name_hi: v }, 'name', 'hi')).toBe('Peanuts');
  });
  it('returns an empty string only when both are missing', () => {
    expect(pick({}, 'name', 'hi')).toBe('');
  });
});

describe('switchPath', () => {
  it('swaps the language segment', () => {
    expect(switchPath('/en/shop/peanuts/', 'hi')).toBe('/hi/shop/peanuts/');
    expect(switchPath('/hi/', 'en')).toBe('/en/');
  });
  it('handles a path with no language segment', () => {
    expect(switchPath('/', 'hi')).toBe('/hi/');
    expect(switchPath('/shop/', 'hi')).toBe('/hi/shop/');
  });
  it('handles a bare language path', () => expect(switchPath('/en', 'hi')).toBe('/hi/'));
});

describe('localHref', () => {
  it('prefixes the language and keeps the trailing slash', () => {
    expect(localHref('en', '/shop/')).toBe('/en/shop/');
    expect(localHref('hi', '/')).toBe('/hi/');
    expect(localHref('hi', 'cart')).toBe('/hi/cart/');
  });
});
