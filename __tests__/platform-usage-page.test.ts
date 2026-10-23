import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HATCH_TOKEN_MINT } from '@/lib/config';
import UsagePage from '@/app/[locale]/usage/page';

vi.mock('@/components/marketing/v3/MarketingShell', () => ({ MarketingShell: 'div' }));
vi.mock('@/i18n/routing', () => ({ Link: 'a' }));
vi.mock('@/lib/seo', () => ({ localizedMetadata: () => ({}) }));

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
const metric = { calls: 2, inputTokens: 100, outputTokens: 50, totalTokens: 150 };

function mockData(monthStart = '2026-10-01T00:00:00.000Z') {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T12:00:00.000Z'));
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url.includes('platform-usage')) return Response.json({ success: true, data: {
      generatedAt: '2026-10-21T11:59:00.000Z', timezone: 'UTC', firstRecordedAt: null,
      lifetime: metric, month: metric, today: metric, daily: [],
      activity: { monthStart, totalUsers: 500, monthlyActiveUsers: 123, totalAgents: 300, monthlyActiveAgents: 67 },
    } });
    if (url.includes('/burns')) return Response.json({ success: true, data: {
      mint: HATCH_TOKEN_MINT, generatedAt: '2026-10-21T10:00:00.000Z', currentSupply: 900_000_000,
      totalBurned: 100_000_000, burnedShareOfOriginalSupply: 0.1, scannedTransactions: 50, burnCount: 1,
      periodTotals: { day: 100, week: 200, month: 300 }, burns: [{ id: 'burn',
        signature: 'verified-signature', explorerUrl: 'https://solscan.io/tx/verified-signature', amount: 100, blockTime: 1792576800 }],
    } });
    return Response.json([]);
  }));
}

describe('platform dashboard rendering', () => {
  it('renders distinct monthly activity, AI tokens, supply, and transaction links', async () => {
    mockData();
    const html = renderToStaticMarkup(await UsagePage());
    expect(html).toContain('Active users this month');
    expect(html).toContain('<strong>123</strong>');
    expect(html).toContain('<strong>67</strong>');
    expect(html).toContain('AI usage');
    expect(html).toContain('100M');
    expect(html).toContain('https://solscan.io/tx/verified-signature');
    expect(html).toContain('Market data is temporarily unavailable');
    expect(html).toContain('may not include all historical burns');
  });

  it('does not label cached activity from last month as current', async () => {
    mockData('2026-09-01T00:00:00.000Z');
    const html = renderToStaticMarkup(await UsagePage());
    expect(html).not.toContain('<strong>123</strong>');
    expect(html).toContain('Monthly activity is temporarily unavailable');
    expect(html).toContain('<strong>500</strong>');
  });

  it('keeps the page readable when all sources fail without inventing zero metrics', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const html = renderToStaticMarkup(createElement('div', null, await UsagePage()));
    expect(html).toContain('Usage data is temporarily unavailable');
    expect(html).toContain('Burn transaction history is temporarily unavailable');
    expect(html).toContain('<strong>—</strong>');
    expect(html).not.toContain('<strong>0</strong>');
  });

  it('still displays verified supply and total burns when history is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_url, options) => options?.method === 'POST'
      ? Response.json({ result: { value: { amount: '959344785746508', decimals: 6 } } })
      : new Response('{}', { status: 503 })));
    const html = renderToStaticMarkup(await UsagePage());
    expect(html).toContain('40.7M');
    expect(html).toContain('4.07%');
    expect(html).toContain('Supply verified on Solana');
    expect(html).toContain('Burn transaction history is temporarily unavailable');
  });
});
