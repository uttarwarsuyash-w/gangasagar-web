import { describe, expect, it, vi } from 'vitest';

vi.mock('./dictionaries/hi', () => ({ default: { auth: { signOut: '', loading: '   ' } } }));

import { getDictionary } from './get-dictionary';
import en from './dictionaries/en';

describe('getDictionary fallback', () => {
  it('falls back to English for missing, empty or blank Hindi strings', () => {
    const d = getDictionary('hi');
    expect(d.auth.signOut).toBe(en.auth.signOut);
    expect(d.auth.loading).toBe(en.auth.loading);
    expect(d.auth.signInWithGoogle).toBe(en.auth.signInWithGoogle);
  });
});
