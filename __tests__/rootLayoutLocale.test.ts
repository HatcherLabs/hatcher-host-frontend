import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('RootLayout locale markup', () => {
  it('uses the resolved request locale for the document language', () => {
    const source = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');

    expect(source).toContain('const locale = await getLocale();');
    expect(source).toContain('<html lang={locale}');
    expect(source).not.toContain('<html lang="en"');
  });
});
