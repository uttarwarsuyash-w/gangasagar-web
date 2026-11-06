import type { Lang } from '@/i18n/types';

/** Only allow same-site absolute paths as a post-login destination. */
export function safeNext(next: string | null | undefined, lang: Lang): string {
  if (next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\')) return next;
  return `/${lang}/`;
}
