import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { Mukta, Teko } from 'next/font/google';
import '../globals.css';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { INTRO_SCRIPT, ShutterIntro } from '@/components/layout/ShutterIntro';
import { SessionProvider } from '@/lib/auth/session';
import { ToastProvider } from '@/components/ui/Toast';
import { getDictionary } from '@/i18n/get-dictionary';
import { isLang, LANGS } from '@/i18n/types';

const mukta = Mukta({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mukta',
  display: 'swap',
});

const teko = Teko({
  subsets: ['latin', 'devanagari'],
  weight: ['400', '500', '600'],
  variable: '--font-teko',
  display: 'swap',
});

export const dynamicParams = false;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(isLang(lang) ? lang : 'en');
  return { title: { default: t.meta.title, template: `%s | ${t.meta.title}` }, description: t.meta.description };
}

export const viewport: Viewport = { themeColor: '#C0182B', width: 'device-width', initialScale: 1 };

export default async function LangLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <html lang={lang} className={`${mukta.variable} ${teko.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-paper font-sans text-ink antialiased">
        <script dangerouslySetInnerHTML={{ __html: INTRO_SCRIPT }} />
        <ShutterIntro words={['गंगासागर', 'किराणा', 'स्टोर्स']} sub={t.home.introSub} />
        <SessionProvider>
          <ToastProvider closeLabel={t.common.close}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
            >
              {t.nav.skipToContent}
            </a>
            <Header lang={lang} />
            <main id="main" className="flex-1">
              {children}
            </main>
            <Footer lang={lang} />
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
