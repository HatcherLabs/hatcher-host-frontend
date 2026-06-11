import { describe, expect, it } from 'vitest';

import {
  HATCHER_LOCALE_HEADER,
  resolveLocaleFromPathAndCookie,
} from '../i18n/localeHeader';

describe('locale request header helpers', () => {
  it('resolves explicit locale path prefixes before cookies', () => {
    expect(HATCHER_LOCALE_HEADER).toBe('x-hatcher-locale');
    expect(resolveLocaleFromPathAndCookie('/ro/pricing', 'de')).toBe('ro');
    expect(resolveLocaleFromPathAndCookie('/en', 'ro')).toBe('en');
  });

  it('falls back to a valid locale cookie and then the default locale', () => {
    expect(resolveLocaleFromPathAndCookie('/pricing', 'zh')).toBe('zh');
    expect(resolveLocaleFromPathAndCookie('/pricing', 'invalid')).toBe('en');
    expect(resolveLocaleFromPathAndCookie('/pricing')).toBe('en');
  });
});
