import { describe, expect, it } from 'vitest';
import { formatRupees, formatWeight } from './money';

describe('formatRupees', () => {
  it('formats whole and fractional rupees', () => {
    expect(formatRupees(89)).toBe('₹89');
    expect(formatRupees(1234)).toBe('₹1,234');
    expect(formatRupees(49.5)).toBe('₹49.50');
    expect(formatRupees('498.99')).toBe('₹498.99');
  });
});

describe('formatWeight', () => {
  it('uses kg from 1000 g', () => {
    expect(formatWeight(250)).toBe('250 g');
    expect(formatWeight(1500)).toBe('1.5 kg');
    expect(formatWeight(20000)).toBe('20 kg');
  });
});
