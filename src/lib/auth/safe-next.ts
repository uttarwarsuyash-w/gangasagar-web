import type { Lang } from '@/i18n/types';

const BASE = 'https://same-site.invalid';

/**
 * Only allow same-site paths as a post-login destination.
 * Parses the way a browser does (which drops tabs and newlines), so "/\t/evil.example" cannot slip through.
 */
export function safeNext(next: string | null | undefined, lang: Lang): string {
  const home = `/${lang}/`;
  if (!next || !next.startsWith('/') || /[\u0000-\u001f\u007f\\]/.test(next)) return home;
  try {
    const url = new URL(next, BASE);
    if (url.origin !== BASE) return home;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return home;
  }
}
