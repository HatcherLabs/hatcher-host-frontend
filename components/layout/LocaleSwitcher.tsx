'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname as useRawPathname } from 'next/navigation';
import { useRouter, usePathname } from '@/i18n/routing';
import { locales, localeLabels, localeFlags, type Locale } from '@/i18n/config';

// Paths outside the [locale] segment — no localized version exists.
// Keep in sync with NON_LOCALE_PREFIXES in middleware.ts.
const NON_LOCALE_PREFIXES = [
  '/admin',
  '/privacy',
  '/terms',
  '/impressum',
  '/cookies',
  '/og',
  '/skill',
  '/.well-known',
];

function isNonLocalePath(rawPath: string): boolean {
  return NON_LOCALE_PREFIXES.some(
    (p) => rawPath === p || rawPath.startsWith(p + '/'),
  );
}

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const rawPathname = useRawPathname();
  const t = useTranslations('localeSwitcher');
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      // Non-locale routes (legal pages, admin) have no localized version —
      // jump to the homepage in the target locale instead of a dead 404.
      if (isNonLocalePath(rawPathname)) {
        router.replace('/', { locale: next });
      } else {
        router.replace(pathname, { locale: next });
      }
    });
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">{t('label')}</span>
      <select
        value={locale}
        onChange={(e) => onChange(e.target.value as Locale)}
        disabled={isPending}
        aria-label={t('label')}
        className="appearance-none bg-transparent pr-6 pl-2 py-1 rounded-md text-sm hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] cursor-pointer text-[var(--text-primary)] disabled:opacity-50"
      >
        {locales.map((loc) => (
          <option key={loc} value={loc} className="bg-[var(--bg-card)] text-[var(--text-primary)]">
            {localeFlags[loc]} {localeLabels[loc]}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 opacity-60"
        viewBox="0 0 12 12"
      >
        <path d="M3 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </label>
  );
}
