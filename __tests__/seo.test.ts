import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPageAlternates, localizedMetadata } from '@/lib/seo';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import sitemap from '@/app/sitemap';
import { fetchPublicProfile } from '@/lib/public-profile';

vi.mock('@/lib/config', () => ({ API_URL: 'https://api.example.test' }));
vi.mock('@/components/marketing/v3/MarketingShell', () => ({ MarketingShell: 'div' }));

afterEach(() => vi.unstubAllGlobals());

describe('Search Console regressions', () => {
  it('keeps the canonical URL aligned with the language alternates', async () => {
    expect(buildPageAlternates('/', 'en').canonical).toBe('https://hatcher.host');
    const alternates = buildPageAlternates('/pricing', 'ro');
    expect(alternates.canonical).toBe('https://hatcher.host/ro/pricing');
    expect(alternates.languages?.ro).toBe(alternates.canonical);
    const metadata = await localizedMetadata('/docs', { title: 'Docs' })({ params: Promise.resolve({ locale: 'de' }) });
    expect(metadata.title).toBe('Docs');
    expect(metadata.alternates?.canonical).toBe('https://hatcher.host/de/docs');
  });

  it('does not advertise English-only content as translated', () => {
    for (const path of ['/tutorials', '/tutorials/skills', '/security', '/features', '/compute', '/whitepaper', '/blog/example']) {
      const alternates = buildPageAlternates(path, 'ro');
      expect(alternates.canonical).toBe(`https://hatcher.host${path}`);
      expect(Object.keys(alternates.languages)).toEqual(['en', 'x-default']);
    }
    expect(buildPageAlternates('/platform', 'ro').canonical).toBe('https://hatcher.host/ro/platform');
  });

  it('publishes individual video pages in the sitemap, without untranslated variants', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
    const entries = await sitemap();
    for (const tutorial of HATCHER_TUTORIALS) {
      expect(entries.map((entry) => entry.url)).toContain(`https://hatcher.host/tutorials/${tutorial.slug}`);
    }
    expect(entries.map((entry) => entry.url)).not.toContain('https://hatcher.host/ro/tutorials');
    expect(entries.map((entry) => entry.url)).not.toContain('https://hatcher.host/de/security');
    expect(entries.map((entry) => entry.url)).toContain('https://hatcher.host/ro/platform');
  });

  it('keeps private agents out of the public sitemap', async () => {
    const fetcher = vi.fn();
    vi.stubGlobal('fetch', fetcher);
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(fetcher).not.toHaveBeenCalled();
    expect(urls).toContain('/platform');
    expect(urls.some((path) => /\/(?:agent|traders|dashboard)(?:\/|$)/.test(path))).toBe(false);
  });

  it('treats only definitive missing profiles as not found', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 404 })));
    expect(await fetchPublicProfile('/agents/missing')).toEqual({ status: 'missing' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })));
    expect(await fetchPublicProfile('/agents/existing')).toEqual({ status: 'unavailable' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    expect(await fetchPublicProfile('/agents/existing')).toEqual({ status: 'unavailable' });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: { name: 'Public agent' } }))));
    expect(await fetchPublicProfile('/agents/existing')).toEqual({ status: 'found', data: { name: 'Public agent' } });
  });
});