import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildPageAlternates, localizedMetadata } from '@/lib/seo';
import { HATCHER_TUTORIALS } from '@/lib/tutorials';
import sitemap from '@/app/sitemap';
import { fetchPublicProfile } from '@/lib/public-profile';

vi.mock('@/lib/config', () => ({ API_URL: 'https://api.example.test' }));
vi.mock('@/components/marketing/v3/MarketingShell', () => ({ MarketingShell: 'div' }));
vi.mock('@/app/[locale]/tutorials/TutorialsPlayer', () => ({ TutorialsPlayer: 'div' }));

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

  it('renders a real publication timestamp for every VideoObject', async () => {
    const { default: Page } = await import('@/app/[locale]/tutorials/page');
    const page = Page();
    const schema = JSON.parse(page.props.children[1].props.dangerouslySetInnerHTML.__html);
    expect(schema['@graph']).toHaveLength(10);
    for (const video of schema['@graph']) {
      expect(video.uploadDate).toMatch(/^2026-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      expect(Date.parse(video.uploadDate)).toBeLessThan(Date.parse('2026-10-11'));
      expect(video.name).toBeTruthy();
      expect(video.thumbnailUrl).toMatch(/^https:\/\/hatcher.host\/tutorials\//);
    }
    expect(HATCHER_TUTORIALS).toHaveLength(10);
  });

  it('includes public agent slugs from the actual paginated API envelope', async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        agents: [{ id: 'one', slug: 'public-one' }], pagination: { hasMore: true },
      } })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: {
        agents: [{ id: 'two', slug: 'public-two' }], pagination: { hasMore: false },
      } })));
    vi.stubGlobal('fetch', fetcher);
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toContain('https://hatcher.host/agent/public-one');
    expect(entries.map((entry) => entry.url)).toContain('https://hatcher.host/agent/public-two');
    expect(entries.map((entry) => entry.url)).toContain('https://hatcher.host/platform');
    expect(entries.some((entry) => entry.url.includes('/dashboard'))).toBe(false);
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