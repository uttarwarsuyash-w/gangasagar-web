export type Lang = 'en' | 'hi';
export const LANGS: readonly Lang[] = ['en', 'hi'] as const;
export function isLang(v: unknown): v is Lang {
  return v === 'en' || v === 'hi';
}
