import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '../app/api/token/burns/route';
import { HATCH_TOKEN_MINT } from '../lib/config';

const data = { mint: HATCH_TOKEN_MINT, generatedAt: new Date().toISOString(),
  totalBurned: 40687746.755696, burnedShareOfOriginalSupply: 0.040687746755696,
  burnCount: 2, scannedTransactions: 2, periodTotals: { day: 16506.757035, week: 32532.502204, month: 32532.502204 },
  burns: [], historyComplete: true };
const request = () => new NextRequest('https://hatcher.host/api/token/burns');
afterEach(() => vi.unstubAllGlobals());
describe('canonical burn API proxy', () => {
  it('returns verified payment-aware history with a short shared cache', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true, data }));
    vi.stubGlobal('fetch', fetch);
    const response = await GET(request());
    expect(await response.json()).toEqual(data);
    expect(response.headers.get('cache-control')).toContain('s-maxage=60');
    expect(String(fetch.mock.calls[0][0])).toContain('tracker=2');
    expect(fetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });
  it.each([Response.json({ success: true, data: { error: 'unavailable' } }), Response.json({ success: false }, { status: 502 })])('does not replace errors with an incomplete zero-burn fallback', async response => {
    const fetch = vi.fn().mockResolvedValue(response);
    vi.stubGlobal('fetch', fetch);
    const result = await GET(request());
    expect(result.status).toBe(502);
    expect(result.headers.get('cache-control')).toBe('no-store');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('preserves unknown metrics during partial scans and does not cache stale snapshots', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true,
      data: { ...data, totalBurned: null, burnedShareOfOriginalSupply: null, periodTotals: { day: null, week: null, month: null }, historyComplete: false },
    }, { headers: { 'x-hatcher-cache': 'STALE' } })));
    const response = await GET(request());
    expect((await response.json()).periodTotals.day).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
