import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const pageSource = readFileSync(
  join(__dirname, '..', 'app', 'demo', 'hatch', 'page.tsx'),
  'utf8'
);
const cookieConsentSource = readFileSync(
  join(__dirname, '..', 'components', 'ui', 'CookieConsent.tsx'),
  'utf8'
);

describe('Hatch embed demo page', () => {
  it('uses the verified public Hatch agent through the production widget loader', () => {
    expect(pageSource).toContain("const HATCH_AGENT_ID = 'cmp2dohkb00jtlsvsq1m5hriq'");
    expect(pageSource).toContain('src="/embed/widget.js"');
    expect(pageSource).toContain('data-agent={HATCH_AGENT_ID}');
    expect(pageSource).toContain('data-open="true"');
  });

  it('provides a direct control for reopening the live widget', () => {
    expect(pageSource).toContain('<HatchDemoActions');
    expect(pageSource).toContain('Open Hatch');
  });

  it('keeps the standalone demo clear of the global consent banner', () => {
    expect(cookieConsentSource).toContain("pathname.startsWith('/demo/hatch')");
  });
});
