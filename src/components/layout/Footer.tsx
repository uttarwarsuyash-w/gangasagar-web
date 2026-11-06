import { MessageCircle, Phone } from 'lucide-react';
import { getDictionary } from '@/i18n/get-dictionary';
import type { Lang } from '@/i18n/types';
import { BUSINESS } from '@/config/business';
import { telLink, waLink } from '@/lib/whatsapp';

export function Footer({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  return (
    <footer className="mt-16 border-t border-brand/10 bg-brand-dark text-white">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-2">
        <div>
          <p className="text-xl font-bold">{lang === 'hi' ? 'गंगासागर' : BUSINESS.name}</p>
          <p className="mt-1 text-white/80">{t.footer.since}</p>
          <p className="mt-1 text-white/80">{t.footer.hours}</p>
        </div>
        <div>
          <h2 className="font-semibold">{t.footer.contact}</h2>
          <ul className="mt-2 space-y-2">
            <li>
              <a href={telLink(BUSINESS.phones.main)} className="inline-flex items-center gap-2 hover:underline">
                <Phone aria-hidden className="h-4 w-4" /> {t.footer.callUs}: {BUSINESS.phones.main}
              </a>
            </li>
            <li>
              <a
                href={waLink(BUSINESS.whatsapp.main, t.home.whatsappHello)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                <MessageCircle aria-hidden className="h-4 w-4" /> {t.footer.whatsappUs}: {BUSINESS.whatsapp.main}
              </a>
            </li>
            <li>
              <a
                href={waLink(BUSINESS.whatsapp.support, t.home.whatsappHello)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 hover:underline"
              >
                <MessageCircle aria-hidden className="h-4 w-4" /> {t.footer.support}: {BUSINESS.whatsapp.support}
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
