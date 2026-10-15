import assert from 'node:assert/strict';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';

const canonicalPaths = { '/de/features': '/features', '/ro/security': '/security', '/ro/tutorials': '/tutorials' };
const base = process.argv[2] || 'http://localhost:3100';
async function get(path, options = {}) {
  return fetch(`${base}${path}`, { redirect: 'manual', ...options, signal: AbortSignal.timeout(20_000) });
}
for (const path of ['/', '/ro', '/security', '/docs', '/privacy', '/terms', '/cookies', '/impressum', '/ro/pricing', '/de/features', '/platform', '/tutorials', '/ro/security', '/ro/tutorials']) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const canonical = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(canonical.length, 1, `${path}: one canonical`);
  assert.equal(canonical[0].replace(/\/$/, ''), `https://hatcher.host${path === '/' ? '' : (canonicalPaths[path] || path)}`, path);
  assert.doesNotMatch(html, /<meta[^>]*name="robots"[^>]*content="noindex/, path);
}
for (const userAgent of ['Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', 'Googlebot']) {
  for (const path of ['/seo-audit-missing-20261015', '/blog/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015/trader', '/tutorials/missing-video']) {
    const response = await get(path, { headers: { 'User-Agent': userAgent } });
    assert.equal(response.status, 404, `${path}: ${userAgent}`);
    assert.match(await response.text(), /<meta[^>]*name="robots"[^>]*content="noindex/, path);
  }
}
const tutorialHtml = await (await get('/tutorials')).text();
const schemas = [...tutorialHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const catalog = schemas.find((schema) => schema['@type'] === 'ItemList');
assert.equal(catalog.itemListElement.length, 10);
for (const item of catalog.itemListElement) {
  const path = new URL(item.url).pathname;
  const response = await get(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const graph = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].flatMap((m) => JSON.parse(m[1])['@graph'] || []);
  const video = graph.find((entry) => entry['@type'] === 'VideoObject');
  assert.ok(video && Number.isFinite(Date.parse(video.uploadDate)), path);
  assert.equal(video.url, item.url, path);
  assert.ok(html.includes('Written guide'), path);
  assert.ok(html.includes(`rel="canonical" href="${item.url}"`), path);
}
for (const path of ['/ro/security', '/ro/tutorials', '/de/features', '/ro/tutorials/skills']) {
  const response = await get(path);
  const html = await response.text();
  assert.doesNotMatch(response.headers.get('link') || '', /hreflang="(?:ro|de)"/, path);
  assert.doesNotMatch(html, /hrefLang="(?:ro|de)"|hreflang="(?:ro|de)"/, path);
}
const privacy = await (await get('/privacy')).text();
assert.doesNotMatch(privacy, /"@type":"(?:FAQPage|SearchAction|SoftwareApplication)"/);
const videoSitemap = await get('/video-sitemap.xml');
assert.equal(videoSitemap.status, 200);
assert.equal(((await videoSitemap.text()).match(/<video:video>/g) || []).length, 10);
for (const path of ['/dashboard', '/ro/dashboard', '/settings', '/de/settings', '/login', '/reset-password', '/admin']) {
  const response = await get(path);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/, path);
}
const robots = await (await get('/robots.txt')).text();
assert.ok(robots.includes('Disallow: /ro/dashboard$'));
assert.ok(robots.includes('Disallow: /dashboard/'));
assert.ok(!robots.includes('Disallow: /tutorials'));
console.log('SEO smoke passed: canonical URLs, 10 video dates, browser/Googlebot 404s, private noindex, localized robots');
// Next's internal URL can use localhost behind nginx; the Host header remains public.
// Native HTTP preserves Host; Node fetch can replace this header with the URL host.
const www = await new Promise((resolve, reject) => {
  const url = new URL('/ro/pricing?utm_source=seo-test', base);
  const request = (url.protocol === 'https:' ? httpsGet : httpGet)(url, {
    headers: { Host: 'www.hatcher.host' },
  }, (response) => {
    response.resume();
    resolve({ status: response.statusCode, location: response.headers.location });
  });
  request.on('error', reject);
  request.setTimeout(20_000, () => request.destroy(new Error('www check timed out')));
});
assert.equal(www.status, 308, 'www permanent redirect behind proxy');
assert.equal(www.location, 'https://hatcher.host/ro/pricing?utm_source=seo-test');
console.log('Proxy Host canonical redirect passed');

// Audit every advertised URL, not just a fixed sample. Limit concurrent requests.
const sitemapResponse = await get('/sitemap.xml');
assert.equal(sitemapResponse.status, 200, 'sitemap');
const sitemapXml = await sitemapResponse.text();
const urls = [...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
assert.ok(urls.length > 0, 'sitemap must not be empty');
assert.equal(new Set(urls).size, urls.length, 'duplicate sitemap URL');
const failures = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < urls.length) {
    const url = urls[cursor++];
    try {
      const pathname = new URL(url).pathname;
      const response = await get(pathname, { redirect: 'manual', headers: { Cookie: 'HATCHER_LOCALE=en' } });
      assert.equal(response.status, 200, 'non-200 URL');
      assert.doesNotMatch(response.headers.get('x-robots-tag') || '', /noindex/i);
      const html = await response.text();
      assert.doesNotMatch(html, /<meta[^>]*name="(?:robots|googlebot)"[^>]*content="[^"]*noindex/i);
      const canonical = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(canonical.length, 1, 'one canonical required');
      assert.equal(canonical[0].replace(/\/$/, ''), url.replace(/\/$/, ''), 'sitemap URL must be canonical');
    } catch (error) { failures.push(`${url}: ${error.message}`); }
  }
}));
assert.deepEqual(failures, [], 'sitemap coverage');
console.log(`Sitemap audit passed: ${urls.length} unique URLs, HTTP 200, matching canonical, indexable`);
