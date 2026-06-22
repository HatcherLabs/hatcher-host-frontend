import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import type { Metadata } from 'next';
import { buildSocialPreviewImage } from '@/lib/site-assets';

const OG_LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  de: 'de_DE',
  fr: 'fr_FR',
  ro: 'ro_RO',
  es: 'es_ES',
  'pt-BR': 'pt_BR',
  id: 'id_ID',
  vi: 'vi_VN',
  ja: 'ja_JP',
  hi: 'hi_IN',
  tr: 'tr_TR',
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hatcher.host';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  return {
    title: {
      default: t('appName'),
      template: `%s · ${t('appName')}`,
    },
    description: t('tagline'),
    // languages are set per-route via buildLanguagesMap() in each route's metadata
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
    },
    openGraph: {
      locale: OG_LOCALE_MAP[locale] ?? 'en_US',
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE_MAP[l] ?? 'en_US'),
      type: 'website',
      images: [buildSocialPreviewImage(SITE_URL)],
    },
  };
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
