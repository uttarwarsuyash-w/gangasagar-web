import type { Lang } from './types';

/** Reads `<field>_<lang>` from a row, falling back to English when the Hindi value is blank. */
export function pick(row: Record<string, unknown>, field: string, lang: Lang): string {
  const value = row[`${field}_${lang}`];
  if (typeof value === 'string' && value.trim() !== '') return value;
  const en = row[`${field}_en`];
  return typeof en === 'string' ? en : '';
}

/** Same page in another language: /en/shop/x/ → /hi/shop/x/. */
export function switchPath(pathname: string, to: Lang): string {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'en' || parts[0] === 'hi') parts.shift();
  const rest = parts.join('/');
  return rest ? `/${to}/${rest}${pathname.endsWith('/') || !rest ? '/' : ''}` : `/${to}/`;
}

/** Language-prefixed internal link with a trailing slash (static export uses trailingSlash). */
export function localHref(lang: Lang, path: string): string {
  const clean = path.replace(/^\/+/, '');
  if (!clean) return `/${lang}/`;
  const [p, q] = clean.split('?');
  const withSlash = p.endsWith('/') ? p : `${p}/`;
  return `/${lang}/${withSlash}${q ? `?${q}` : ''}`;
}
