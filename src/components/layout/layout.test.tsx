import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { makeSupabaseMock } from '@/test/supabase-mock';

vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => makeSupabaseMock({ user: null }) }));
let pathname = '/hi/shop/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { Header } from './Header';
import { Footer } from './Footer';
import { LanguageSwitcher } from './LanguageSwitcher';

describe('Header', () => {
  it.each(['en', 'hi'] as const)('every link starts with /%s/', (lang) => {
    pathname = `/${lang}/shop/`;
    render(<Header lang={lang} />);
    const links = within(screen.getByRole('banner')).getAllByRole('link');
    expect(links.length).toBeGreaterThan(2);
    for (const a of links) {
      const href = a.getAttribute('href') ?? '';
      const other = lang === 'en' ? 'hi' : 'en';
      // The language switcher is the one link allowed to point at the other language.
      if (a.getAttribute('hreflang') === other) expect(href.startsWith(`/${other}/`)).toBe(true);
      else expect(href.startsWith(`/${lang}/`)).toBe(true);
    }
  });
});

describe('LanguageSwitcher', () => {
  it('keeps the current page', () => {
    pathname = '/en/shop/peanuts/';
    render(<LanguageSwitcher lang="en" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/hi/shop/peanuts/');
  });
});

describe('Footer', () => {
  it('has a Call link to the main number', () => {
    render(<Footer lang="en" />);
    const call = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('tel:'));
    expect(call).toHaveAttribute('href', 'tel:+919403951524');
  });
  it('has a WhatsApp link to the main number', () => {
    render(<Footer lang="hi" />);
    const wa = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.startsWith('https://wa.me/'));
    expect(wa?.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/919403951524/);
  });
});
