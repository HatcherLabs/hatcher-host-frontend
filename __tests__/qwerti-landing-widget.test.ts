import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  QWERTI_WIDGET_SCRIPT_INTEGRITY,
  QWERTI_WIDGET_SCRIPT_SRC,
} from '../lib/qwerti-widget';

describe('Qwerti landing widget', () => {
  it('loads the campaign from a pinned core bundle with subresource integrity', () => {
    const landingPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/page.tsx'),
      'utf8',
    );

    expect(landingPage).toContain("import Script from 'next/script'");
    expect(landingPage).toContain('QWERTI_WIDGET_SCRIPT_SRC');
    expect(landingPage).toContain('integrity={QWERTI_WIDGET_SCRIPT_INTEGRITY}');
    expect(landingPage).toContain('crossOrigin="anonymous"');
    expect(landingPage).toContain('data-widget="qwerti-widget"');
    expect(landingPage).toContain('data-campaign="hatcher-792703809-48487"');
    expect(landingPage).toContain('data-auto-open="false"');
    expect(landingPage).toContain('data-loader-version="1.0.0"');
    expect(landingPage).toContain('strategy="afterInteractive"');
    expect(landingPage).not.toContain('/widget/v1/buy.js');
    expect(QWERTI_WIDGET_SCRIPT_SRC).toMatch(
      /^https:\/\/widget\.qwerti\.ai\/widget\/v1\/core\.[A-Za-z0-9_-]+\.js$/,
    );
    expect(QWERTI_WIDGET_SCRIPT_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]+={0,2}$/);
  });
});
