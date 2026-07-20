import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Qwerti landing widget', () => {
  it('loads the campaign only from the localized landing page', () => {
    const landingPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/page.tsx'),
      'utf8',
    );

    expect(landingPage).toContain("import Script from 'next/script'");
    expect(landingPage).toContain('https://widget.qwerti.ai/widget/v1/buy.js');
    expect(landingPage).toContain('data-widget="qwerti-widget"');
    expect(landingPage).toContain('data-campaign="hatcher-792703809-48487"');
    expect(landingPage).toContain('data-auto-open="true"');
    expect(landingPage).toContain('strategy="afterInteractive"');
  });
});
