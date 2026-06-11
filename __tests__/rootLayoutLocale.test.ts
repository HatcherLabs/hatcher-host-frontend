import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('RootLayout locale markup', () => {
  it('uses the resolved request locale for the document language', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');

    expect(source).toContain('await getLocale()');
    expect(source).toContain('requestHeaders.get(HATCHER_LOCALE_HEADER)');
    expect(source).toContain('getMessages({ locale })');
    expect(source).toContain('<html lang={locale}');
    expect(source).not.toContain('<html lang="en"');
  });
});
