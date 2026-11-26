import { describe, expect, it } from 'vitest';

import { buildLocaleUrl, stripLocalePrefix } from './localeUrls';

describe('locale URLs', () => {
  it('uses explicit default-locale URLs so middleware can reset stale locale cookies', () => {
    expect(stripLocalePrefix('/ro/pricing', 'ro')).toBe('/pricing');
    expect(buildLocaleUrl('/pricing', 'en')).toBe('/en/pricing?_locale=en');
    expect(buildLocaleUrl('/', 'en')).toBe('/en?_locale=en');
  });

  it('uses prefixed URLs for non-default locales', () => {
    expect(buildLocaleUrl('/pricing', 'de')).toBe('/de/pricing');
    expect(buildLocaleUrl('/', 'ro')).toBe('/ro');
  });
});
