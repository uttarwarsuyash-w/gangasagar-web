import { describe, expect, it } from 'vitest';
import en from './dictionaries/en';
import hi from './dictionaries/hi';
import { getDictionary } from './get-dictionary';

function leafKeys(obj: unknown, prefix = ''): string[] {
  if (typeof obj === 'string') return [prefix];
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj).flatMap(([k, v]) => leafKeys(v, prefix ? `${prefix}.${k}` : k));
}

function get(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

describe('dictionaries', () => {
  it('hi has every key of en', () => {
    const missing = leafKeys(en).filter((k) => {
      const v = get(hi, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(missing, `Missing Hindi keys: ${missing.join(', ')}`).toEqual([]);
  });

  it('getDictionary("hi") never returns a blank string', () => {
    const d = getDictionary('hi');
    const blanks = leafKeys(en).filter((k) => {
      const v = get(d, k);
      return typeof v !== 'string' || v.trim() === '';
    });
    expect(blanks).toEqual([]);
  });
});
