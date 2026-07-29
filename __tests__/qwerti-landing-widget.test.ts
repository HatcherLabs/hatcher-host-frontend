import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  QWERTI_WIDGET_SCRIPT_INTEGRITY,
  QWERTI_WIDGET_SCRIPT_SRC,
} from '../lib/qwerti-widget';

// The widget script moved from the landing page into QwertiWidgetGate (root
// layout), which loads it on the landing route only and hides the injected
// floating UI everywhere else via body[data-qwerti-hidden] + globals.css.
describe('Qwerti landing widget', () => {
  const gate = readFileSync(
    resolve(process.cwd(), 'components/landing/QwertiWidgetGate.tsx'),
    'utf8',
  );

  it('loads the campaign from a pinned core bundle with subresource integrity', () => {
    expect(gate).toContain("import Script from 'next/script'");
    expect(gate).toContain('QWERTI_WIDGET_SCRIPT_SRC');
    expect(gate).toContain('integrity={QWERTI_WIDGET_SCRIPT_INTEGRITY}');
    expect(gate).toContain('crossOrigin="anonymous"');
    expect(gate).toContain('data-widget="qwerti-widget"');
    expect(gate).toContain('data-campaign="hatcher-792703809-48487"');
    expect(gate).toContain('data-auto-open="false"');
    expect(gate).toContain('data-loader-version="1.0.0"');
    expect(gate).toContain('strategy="afterInteractive"');
    expect(gate).not.toContain('/widget/v1/buy.js');
    expect(QWERTI_WIDGET_SCRIPT_SRC).toMatch(
      /^https:\/\/widget\.qwerti\.ai\/widget\/v1\/core\.[A-Za-z0-9_-]+\.js$/,
    );
    expect(QWERTI_WIDGET_SCRIPT_INTEGRITY).toMatch(/^sha384-[A-Za-z0-9+/]+={0,2}$/);
  });

  it('gates the script to the landing route and hides the widget elsewhere', () => {
    expect(gate).toContain("pathname === '/'");
    expect(gate).toContain('if (!isLanding) return null');
    expect(gate).toContain("dataset.qwertiHidden = 'true'");

    const landingPage = readFileSync(
      resolve(process.cwd(), 'app/[locale]/page.tsx'),
      'utf8',
    );
    expect(landingPage).not.toContain('QWERTI_WIDGET_SCRIPT_SRC');

    const rootLayout = readFileSync(resolve(process.cwd(), 'app/layout.tsx'), 'utf8');
    expect(rootLayout).toContain('<QwertiWidgetGate />');

    const globalsCss = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8');
    expect(globalsCss).toContain("body[data-qwerti-hidden] [class*='qwerti-']");
    expect(globalsCss).toContain('display: none !important');
  });
});
