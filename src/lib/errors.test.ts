import { describe, expect, it } from 'vitest';
import { errorCode, fill } from './errors';

describe('errorCode', () => {
  it('reads our raised codes', () => {
    expect(errorCode({ message: 'insufficient_stock', code: 'P0001' })).toBe('insufficient_stock');
  });
  it('maps unique violations to duplicate', () => {
    expect(errorCode({ message: 'duplicate key value violates unique constraint', code: '23505' })).toBe('duplicate');
  });
  it('recognises network failures', () => {
    expect(errorCode(new TypeError('Failed to fetch'))).toBe('network');
  });
  it('falls back to unknown', () => expect(errorCode({ message: 'weird' })).toBe('unknown'));
});

describe('fill', () => {
  it('replaces placeholders', () => expect(fill('Delete {name}', { name: 'Peanuts' })).toBe('Delete Peanuts'));
});
