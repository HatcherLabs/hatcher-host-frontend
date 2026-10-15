import assert from 'node:assert/strict';
import { get as httpGet } from 'node:http';
import { get as httpsGet } from 'node:https';

const base = process.argv[2] || 'http://localhost:3100';
async function get(path, options = {}) {
  return fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(20_000) });
}
for (const path of ['/', '/ro', '/security', '/docs', '/privacy', '/terms', '/cookies', '/impressum', '/ro/pricing', '/de/features', '/platform', '/tutorials']) {
  const response = await get(path);
  assert.equal(response.status, 200, path);
  const html = await response.text();
  const canonical = [...html.matchAll(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(canonical.length, 1, `${path}: one canonical`);
  assert.equal(canonical[0].replace(/\/$/, ''), `https://hatcher.host${path === '/' ? '' : path}`, path);
  assert.doesNotMatch(html, /<meta[^>]*name="robots"[^>]*content="noindex/, path);
}
for (const userAgent of ['Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36', 'Googlebot']) {
  for (const path of ['/seo-audit-missing-20261015', '/blog/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015', '/agent/seo-audit-missing-20261015/trader']) {
    const response = await get(path, { headers: { 'User-Agent': userAgent } });
    assert.equal(response.status, 404, `${path}: ${userAgent}`);
    assert.match(await response.text(), /<meta[^>]*name="robots"[^>]*content="noindex/, path);
  }
}
const tutorialHtml = await (await get('/tutorials')).text();
const schemas = [...tutorialHtml.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const videos = schemas.flatMap((s) => s['@graph'] || []).filter((v) => v['@type'] === 'VideoObject');
assert.equal(videos.length, 10);
for (const video of videos) assert.ok(Number.isFinite(Date.parse(video.uploadDate)), video.name);
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