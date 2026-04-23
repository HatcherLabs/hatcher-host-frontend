import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { isLocale } from './config';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  // next-intl 3.x doesn't export `hasLocale` (added in v4).
  // Use our isLocale type guard until we upgrade.
  const locale = isLocale(requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
