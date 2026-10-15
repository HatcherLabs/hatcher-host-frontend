import { HATCHER_TUTORIALS } from '../lib/tutorials';
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
    expect(xml).toContain('https://hatcher.host/explore');
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

test('public pages have locale-correct canonical URLs', async ({ request }) => {
  for (const path of ['/', '/ro', '/security', '/docs', '/privacy', '/terms', '/cookies', '/impressum', '/ro/pricing', '/de/features', '/platform', '/tutorials']) {
    const response = await request.get(path, { headers: { Cookie: 'HATCHER_LOCALE=en' } });
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const links = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map((match) => match[1]);
    expect(links, path).toHaveLength(1);
    expect(links[0].replace(/\/$/, ''), path).toBe(`https://hatcher.host${path === '/' ? '' : path === '/de/features' ? '/features' : path}`);
    expect(html, path).not.toMatch(/<meta[^>]*name="robots"[^>]*content="noindex/);
  }
});

test('missing public routes send 404 and noindex to browsers and Googlebot', async ({ request }) => {
  for (const userAgent of ['Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', 'Googlebot']) {
    for (const path of ['/seo-audit-missing-20261015', '/blog/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015/trader', '/tutorials/not-a-tutorial']) {
      const response = await request.get(path, { headers: { 'User-Agent': userAgent } });
      expect(response.status(), `${path} ${userAgent}`).toBe(404);
      expect(await response.text()).toMatch(/<meta[^>]*name="robots"[^>]*content="noindex/);
    }
  }
});

test('each tutorial is a primary video page with dates, canonical and written guide', async ({ request }) => {
  for (const tutorial of HATCHER_TUTORIALS) {
    const path = `/tutorials/${tutorial.slug}`;
    const response = await request.get(path);
    expect(response.status(), path).toBe(200);
    const html = await response.text();
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    const videos = schemas.flatMap((schema) => schema['@graph'] || []).filter((item) => item['@type'] === 'VideoObject');
    expect(videos).toHaveLength(1);
    expect(videos[0].uploadDate).toBe(tutorial.uploadDate);
    expect(videos[0].contentUrl).toBe(`https://hatcher.host${tutorial.videoSrc}`);
    expect(html).toContain(`rel="canonical" href="https://hatcher.host${path}"`);
    expect(html).toContain('Written guide');
  }
});

test('English content does not advertise untranslated alternates', async ({ request }) => {
  for (const path of ['/ro/tutorials', '/ro/security', '/de/features', '/de/blog', '/ro/tutorials/skills']) {
    const response = await request.get(path);
    const html = await response.text();
    expect(response.headers().link || '').not.toContain('hreflang');
    expect(html).not.toMatch(/hrefLang="(?:ro|de)"|hreflang="(?:ro|de)"/);
  }
});

test('catalog links to videos while old hash bookmarks still select the player', async ({ page }) => {
  await page.goto('/tutorials#skills');
  await expect(page.locator('#active-tutorial-title')).toHaveText('Install and use Skills');
  await page.getByRole('link', { name: 'Install and use Skills: video & written guide', exact: true }).click();
  await expect(page).toHaveURL(/\/tutorials\/skills$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Install and use Skills');
  await expect(page.locator('video')).toHaveAttribute('controls', '');
});

test('video sitemap is discoverable and schemas stay relevant to the page', async ({ request }) => {
  const xml = await (await request.get('/video-sitemap.xml')).text();
  expect((xml.match(/<video:video>/g) || []).length).toBe(10);
  expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://hatcher.host/video-sitemap.xml');
  expect(await (await request.get('/privacy')).text()).not.toMatch(/"@type":"(?:FAQPage|SearchAction|SoftwareApplication)"/);
  expect(await (await request.get('/platform')).text()).toContain('"@type":"SoftwareApplication"');
});

test('private routes remain excluded in every language', async ({ request }) => {
  for (const path of ['/dashboard', '/ro/dashboard', '/settings', '/de/settings', '/login', '/reset-password', '/admin']) {
    const response = await request.get(path, { headers: { Cookie: 'HATCHER_LOCALE=en' } });
    expect(response.headers()['x-robots-tag'], path).toContain('noindex');
  }
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Disallow: /ro/dashboard$');
  expect(robots).not.toContain('Disallow: /tutorials');
});
test('www redirects behind the reverse proxy and preserves path/query', async ({ request }) => {
  const response = await request.get('/ro/pricing?utm_source=seo-test', {
    maxRedirects: 0, headers: { Host: 'www.hatcher.host' },
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe('https://hatcher.host/ro/pricing?utm_source=seo-test');
});