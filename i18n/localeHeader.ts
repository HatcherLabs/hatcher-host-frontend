import { defaultLocale, isLocale, type Locale } from './config';

export const HATCHER_LOCALE_HEADER = 'x-hatcher-locale';

export function resolveLocaleFromPathAndCookie(
  pathname: string,
  cookieLocale?: string | null,
): Locale {
  const pathLocale = pathname.split('/')[1];

  if (isLocale(pathLocale)) {
    return pathLocale;
  }

  if (isLocale(cookieLocale)) {
    return cookieLocale;
  }

  return defaultLocale;
}
