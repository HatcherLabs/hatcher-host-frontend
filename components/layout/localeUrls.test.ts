import { describe, expect, it } from 'vitest';

import { buildLocaleUrl, stripLocalePrefix } from './localeUrls';

describe('locale URLs', () => {
  it('uses explicit default-locale URLs so middleware can reset stale locale cookies', () => {
    expect(stripLocalePrefix('/ro/pricing', 'ro')).toBe('/pricing');
    expect(buildLocaleUrl('/pricing', 'en')).toBe('/en/pricing');
    expect(buildLocaleUrl('/', 'en')).toBe('/en');
  });

  it('uses prefixed URLs for non-default locales', () => {
    expect(buildLocaleUrl('/pricing', 'de')).toBe('/de/pricing');
    expect(buildLocaleUrl('/', 'ro')).toBe('/ro');
  });
});
