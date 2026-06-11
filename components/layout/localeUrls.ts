import { defaultLocale, type Locale } from '@/i18n/config';

export function stripLocalePrefix(raw: string, currentLocale: Locale): string {
  const prefix = `/${currentLocale}`;
  if (raw === prefix) return '/';
  if (raw.startsWith(prefix + '/')) return raw.slice(prefix.length);
  return raw;
}

export function buildLocaleUrl(cleanPath: string, targetLocale: Locale): string {
  const path = cleanPath === '/' ? '' : cleanPath;

  // Use an explicit /en hop for the default locale. Middleware redirects it
  // back to the unprefixed URL while resetting HATCHER_LOCALE=en, which avoids
  // stale non-default locale cookies sending / back to /ro, /de, etc.
  if (targetLocale === defaultLocale) {
    return `/en${path}`;
  }

  return `/${targetLocale}${path}`;
}
