import en, { type Dictionary } from './dictionaries/en';
import hi from './dictionaries/hi';
import type { Lang } from './types';

export type { Dictionary };

function mergeWithFallback<T>(base: T, over: unknown): T {
  if (typeof base === 'string') {
    return (typeof over === 'string' && over.trim() !== '' ? over : base) as T;
  }
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(base as object)) {
    const o = over && typeof over === 'object' ? (over as Record<string, unknown>)[key] : undefined;
    out[key] = mergeWithFallback((base as Record<string, unknown>)[key], o);
  }
  return out as T;
}

const cache: Partial<Record<Lang, Dictionary>> = {};

export function getDictionary(lang: Lang): Dictionary {
  if (lang === 'en') return en;
  return (cache[lang] ??= mergeWithFallback(en, hi));
}
