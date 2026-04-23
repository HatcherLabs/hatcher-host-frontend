/**
 * SEO helpers for hreflang / alternate language link generation.
 *
 * Locales are fixed: en (default, no prefix), zh, de, fr, ro.
 * Use buildLanguagesMap(path) wherever a layout/page sets `alternates`.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

const LOCALES = ['en', 'zh', 'de', 'fr', 'ro'] as const;
const DEFAULT_LOCALE = 'en';

/**
 * Returns a `languages` map suitable for Next.js `alternates.languages`.
 *
 * @param path  The route path, e.g. '/pricing'. Must start with '/'.
 *              Use '/' for the homepage.
 */
export function buildLanguagesMap(path: string): Record<string, string> {
  const suffix = path === '/' ? '' : path;
  const languages: Record<string, string> = {};

  for (const locale of LOCALES) {
    const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
    languages[locale] = `${SITE_URL}${prefix}${suffix}`;
  }

  // x-default points to the canonical (English) URL
  languages['x-default'] = `${SITE_URL}${suffix}`;

  return languages;
}
