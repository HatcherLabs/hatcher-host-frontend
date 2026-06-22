import { expect, test } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('SEO routing hygiene', () => {
  test('homepage exposes complete hreflang alternates', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const hreflangs = await page.locator('link[rel="alternate"][hreflang]').evaluateAll((links) =>
      links.map((link) => ({
        lang: link.getAttribute('hreflang'),
        href: link.getAttribute('href'),
      })),
    );

    expect(hreflangs.map((entry) => entry.lang)).toEqual(
      expect.arrayContaining([
        'en',
        'zh',
        'de',
        'fr',
        'ro',
        'es',
        'pt-BR',
        'id',
        'vi',
        'ja',
        'hi',
        'tr',
        'x-default',
      ]),
    );
    expect(hreflangs.find((entry) => entry.lang === 'x-default')?.href).toMatch(/https:\/\/hatcher\.host\/?$/);
  });

  test('retired blog slugs redirect to the canonical article', async ({ request }) => {
    for (const slug of ['openclaw-vs-hermes-vs-elizaos', 'openclaw-vs-hermes-elizaos-milady']) {
      const response = await request.get(`/blog/${slug}`, { maxRedirects: 0 });
      expect([301, 308]).toContain(response.status());
      expect(response.headers().location).toBe('/blog/state-of-ai-agent-hosting-2026');
    }
  });

  test('localized retired blog slugs preserve locale while redirecting', async ({ request }) => {
    const response = await request.get('/de/blog/openclaw-vs-hermes-elizaos-milady', { maxRedirects: 0 });
    expect([301, 308]).toContain(response.status());
    expect(response.headers().location).toBe('/de/blog/state-of-ai-agent-hosting-2026');
  });

  test('sitemap includes public pages and excludes private dashboard pages', async ({ request }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    expect(xml).toContain('https://hatcher.host/pricing');
    expect(xml).toContain('https://hatcher.host/city');
    expect(xml).toContain('https://hatcher.host/blog/state-of-ai-agent-hosting-2026');
    expect(xml).not.toContain('https://hatcher.host/dashboard');
    expect(xml).not.toContain('https://hatcher.host/admin');
  });

  test('robots points crawlers to sitemap and blocks private app paths', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect(response.status()).toBe(200);
    const body = await response.text();

    expect(body).toContain('Sitemap: https://hatcher.host/sitemap.xml');
    expect(body).toContain('Disallow: /dashboard/');
    expect(body).toContain('Disallow: /admin/');
  });
});
