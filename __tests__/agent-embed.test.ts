import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config.mjs';
import { GET as getAgentWidgetScript } from '@/app/embed/widget.js/route';
import {
  buildAgentEmbedSnippet,
  buildAgentEmbedUrl,
  normalizeAgentEmbedOptions,
} from '@/lib/agent-embed';

describe('embeddable agent helpers', () => {
  it('generates dashboard embed code with the API-supported agent id', () => {
    const configSource = readFileSync(
      join(__dirname, '..', 'components', 'agents', 'tabs', 'ConfigTab.tsx'),
      'utf8'
    );

    expect(configSource).toContain('const embedPublicId = agent.id;');
    expect(configSource).not.toContain('const embedPublicId = agent.slug ?? agent.id;');
  });

  it('builds a compact agent URL from allowlisted appearance options', () => {
    expect(
      buildAgentEmbedUrl(
        'research agent/one',
        { theme: 'dark', accent: 'blue', position: 'left' },
        'https://hatcher.host/'
      )
    ).toBe(
      'https://hatcher.host/embed/agent/research%20agent%2Fone?theme=dark&accent=blue&widget=1'
    );
  });

  it('falls back to safe defaults for unknown appearance values', () => {
    expect(
      normalizeAgentEmbedOptions({
        theme: 'night',
        accent: 'javascript:alert(1)',
        position: 'center',
      })
    ).toEqual({ theme: 'auto', accent: 'green', position: 'right' });
  });

  it('creates a copy-paste widget snippet without executable user input', () => {
    const snippet = buildAgentEmbedSnippet(
      'agent" onload="alert(1)',
      { theme: 'light', accent: 'purple', position: 'left' },
      'https://hatcher.host'
    );

    expect(snippet).toContain('src="https://hatcher.host/embed/widget.js"');
    expect(snippet).toContain('data-theme="light"');
    expect(snippet).toContain('data-accent="purple"');
    expect(snippet).toContain('data-position="left"');
    expect(snippet).toContain('data-agent="agent&quot; onload=&quot;alert(1)"');
    expect(snippet).not.toContain('data-agent="agent" onload=');
  });
});

describe('embeddable agent routing', () => {
  it('serves a cross-origin, cached loader that creates the iframe only when opened', async () => {
    const response = getAgentWidgetScript();
    const source = await response.text();

    expect(response.headers.get('content-type')).toContain('application/javascript');
    expect(response.headers.get('cross-origin-resource-policy')).toBe('cross-origin');
    expect(response.headers.get('cache-control')).toContain('max-age=3600');
    expect(source).toContain("launcher.addEventListener('click', () => setOpen(true))");
    expect(source.indexOf('const ensureFrame')).toBeLessThan(
      source.indexOf("launcher.addEventListener('click'")
    );
    expect(source).not.toContain('innerHTML');
  });

  it('supports explicit demo opening without changing the lazy default', async () => {
    const source = await getAgentWidgetScript().text();

    expect(source).toContain("const openInitially = script.dataset.open === 'true'");
    expect(source).toContain("window.addEventListener('hatcher:embed:open'");
    expect(source).toContain('if (openInitially) setOpen(true)');
  });

  it('does not redirect /embed/agent/:id away from the widget surface', async () => {
    const redirects = await nextConfig.redirects();
    expect(
      redirects.some((redirect: { source: string }) => redirect.source.includes('embed/agent/:id'))
    ).toBe(false);
  });

  it('keeps /embed outside locale rewriting', () => {
    const middleware = readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf8');
    expect(middleware).toMatch(/NON_LOCALE_PREFIXES\s*=\s*\[[\s\S]*['"]\/embed['"]/u);
  });

  it('keeps the standalone demo outside locale rewriting', () => {
    const middleware = readFileSync(join(__dirname, '..', 'middleware.ts'), 'utf8');
    expect(middleware).toMatch(/NON_LOCALE_PREFIXES\s*=\s*\[[\s\S]*['"]\/demo['"]/u);
  });
});
