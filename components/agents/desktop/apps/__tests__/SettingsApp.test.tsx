import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';
import { SettingsApp } from '../SettingsApp';
import type { Agent } from '@/lib/api';

/**
 * Locks the Settings-window rewrite: a same-origin iframe of the REAL agent
 * dashboard page (Config tab), locale-aware, with NO sandbox attribute (it
 * is our own authenticated page and needs full functionality) — plus the
 * "Open in full page" affordance. Framing works because the sitewide policy
 * is SAMEORIGIN / frame-ancestors 'self'.
 */

const messages = {
  desktop: {
    settings: {
      iframeTitle: 'Agent settings',
      openFullPage: 'Open in full page',
    },
  },
};

const agent: Agent = {
  id: 'agent_1',
  name: 'Test Agent',
  description: null,
  avatarUrl: null,
  status: 'active',
  framework: 'hermes',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderApp(locale: string): string {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} timeZone="UTC" messages={messages}>
      <SettingsApp agent={agent} />
    </NextIntlClientProvider>,
  );
}

describe('SettingsApp', () => {
  it('renders a same-origin iframe of the agent dashboard config tab', () => {
    const html = renderApp('en');
    // `localePrefix: 'as-needed'` — the default locale carries no prefix.
    expect(html).toContain('<iframe');
    expect(html).toContain('src="/dashboard/agent/agent_1?tab=config"');
  });

  it('localizes the iframe path for non-default locales', () => {
    const html = renderApp('de');
    expect(html).toContain('src="/de/dashboard/agent/agent_1?tab=config"');
  });

  it('sets no sandbox and no referrerPolicy on the iframe (own authenticated page)', () => {
    const html = renderApp('en');
    expect(html).not.toContain('sandbox');
    expect(html).not.toContain('referrerpolicy');
  });

  it('offers an "Open in full page" link to the same path in a new tab', () => {
    const html = renderApp('en');
    expect(html).toContain('href="/dashboard/agent/agent_1?tab=config"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener"');
    expect(html).toContain('Open in full page');
  });
});
