/** The public site address (NEXT_PUBLIC_SITE_URL), or the current origin, without a trailing slash. */
export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && env.trim()) return env.replace(/\/+$/, '');
  return typeof window !== 'undefined' ? window.location.origin : '';
}
