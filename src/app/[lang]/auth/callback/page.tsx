import { CallbackClient } from './CallbackClient';
import { isLang, type Lang } from '@/i18n/types';

export default async function AuthCallbackPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <CallbackClient lang={(isLang(lang) ? lang : 'en') as Lang} />;
}
