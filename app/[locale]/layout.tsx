import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import type { Locale } from '@/i18n/config';
import type { Metadata } from 'next';

const OG_LOCALE_MAP: Record<string, string> = {
  en: 'en_US',
  zh: 'zh_CN',
  de: 'de_DE',
  fr: 'fr_FR',
  ro: 'ro_RO',
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'common' });

  const languages: Record<string, string> = {};
  for (const loc of routing.locales) {
    languages[loc] = loc === routing.defaultLocale ? '/' : `/${loc}`;
  }
  languages['x-default'] = '/';

  return {
    title: {
      default: t('appName'),
      template: `%s · ${t('appName')}`,
    },
    description: t('tagline'),
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages,
    },
    openGraph: {
      locale: OG_LOCALE_MAP[locale] ?? 'en_US',
      alternateLocale: routing.locales
        .filter((l) => l !== locale)
        .map((l) => OG_LOCALE_MAP[l] ?? 'en_US'),
      type: 'website',
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
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      {children}
    </NextIntlClientProvider>
  );
}
