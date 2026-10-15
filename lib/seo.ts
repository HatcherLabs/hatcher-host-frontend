import type { Metadata } from 'next';
/**
 * SEO helpers for hreflang / alternate language link generation.
 *
 * Use buildLanguagesMap(path) wherever a layout/page sets `alternates`.
 */

import { defaultLocale, locales } from '@/i18n/config';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hatcher.host';

// These routes currently have English editorial content, even with localized navigation.
// Add languages only when their primary content has actually been translated.
const ENGLISH_CONTENT_ROUTES = ['/tutorials', '/security', '/features', '/compute', '/whitepaper', '/blog'];

export function contentLocales(path: string): readonly string[] {
  return ENGLISH_CONTENT_ROUTES.some((route) => path === route || path.startsWith(`${route}/`))
    ? [defaultLocale] : locales;
}

/**
 * Returns a `languages` map suitable for Next.js `alternates.languages`.
 *
 * @param path  The route path, e.g. '/pricing'. Must start with '/'.
 *              Use '/' for the homepage.
 */
export function buildLanguagesMap(path: string): Record<string, string> {
  const suffix = path === '/' ? '' : path;
  const languages: Record<string, string> = {};

  for (const locale of contentLocales(path)) {
    const prefix = locale === defaultLocale ? '' : `/${locale}`;
    languages[locale] = `${SITE_URL}${prefix}${suffix}`;
  }

  // x-default points to the canonical (English) URL
  languages['x-default'] = `${SITE_URL}${suffix}`;

  return languages;
}

/** Canonicals and hreflang must refer to the same locale-specific URL. */
export function buildPageAlternates(path: string, locale: string = defaultLocale) {
  const languages = buildLanguagesMap(path);
  return { canonical: languages[locale] ?? languages[defaultLocale], languages };
}

export function localizedMetadata(path: string, metadata: Metadata) {
  return async ({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> => {
    const { locale } = await params;
    const alternates = buildPageAlternates(path, locale);
    return {
      ...metadata,
      alternates,
      ...(metadata.openGraph ? { openGraph: { ...metadata.openGraph, url: alternates.canonical } } : {}),
    };
  };
}
