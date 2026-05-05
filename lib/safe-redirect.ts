import { locales } from '@/i18n/config';

const DEFAULT_AUTH_RETURN_PATH = '/dashboard';
const AUTH_ROUTES = ['/login', '/register', '/forgot-password', '/verify-email', '/reset-password'];

function isAuthRoute(pathname: string): boolean {
  const localePrefix = locales.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`));
  const unprefixed = localePrefix ? pathname.slice(localePrefix.length + 1) || '/' : pathname;
  return AUTH_ROUTES.some((route) => unprefixed === route || unprefixed.startsWith(`${route}/`));
}

export function sanitizeLocalReturnPath(
  rawPath: string | null | undefined,
  fallback = DEFAULT_AUTH_RETURN_PATH,
): string {
  if (!rawPath) return fallback;

  const value = rawPath.trim();
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return fallback;
  }

  try {
    const url = new URL(value, 'https://hatcher.host');
    if (url.origin !== 'https://hatcher.host' || isAuthRoute(url.pathname)) {
      return fallback;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function loginHrefForReturn(returnPath: string): string {
  const safeReturnPath = sanitizeLocalReturnPath(returnPath);
  return `/login?return=${encodeURIComponent(safeReturnPath)}`;
}
