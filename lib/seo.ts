/**
 * SEO helpers for hreflang / alternate language link generation.
 *
 * Use buildLanguagesMap(path) wherever a layout/page sets `alternates`.
 */

import { defaultLocale, locales } from '@/i18n/config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

/**
 * Returns a `languages` map suitable for Next.js `alternates.languages`.
 *
 * @param path  The route path, e.g. '/pricing'. Must start with '/'.
 *              Use '/' for the homepage.
 */
export function buildLanguagesMap(path: string): Record<string, string> {
  const suffix = path === '/' ? '' : path;
  const languages: Record<string, string> = {};

  for (const locale of locales) {
    const prefix = locale === defaultLocale ? '' : `/${locale}`;
    languages[locale] = `${SITE_URL}${prefix}${suffix}`;
  }

  // x-default points to the canonical (English) URL
  languages['x-default'] = `${SITE_URL}${suffix}`;

  return languages;
}
