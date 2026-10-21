import { afterEach, describe, expect, it, vi } from 'vitest';
import { HATCH_TOKEN_MINT } from '@/lib/config';
import { loadTokenMarket, summarizeTokenMarket } from '@/lib/token-market';
import { loadTokenSupply } from '@/lib/token-supply';

afterEach(() => vi.unstubAllGlobals());

const pair = (address: string, liquidity: number, overrides = {}) => ({
  chainId: 'solana', pairAddress: address, baseToken: { address: HATCH_TOKEN_MINT },
  priceUsd: '0.0012', marketCap: 1_200_000, fdv: 1_300_000,
  liquidity: { usd: liquidity }, volume: { h24: 1_000 }, ...overrides,
});

describe('independent on-chain supply', () => {
  it('derives total burns from raw supply without depending on transaction scans', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ result: {
      value: { amount: '959344785746508', decimals: 6 },
    } })));
    expect(await loadTokenSupply()).toMatchObject({ currentSupply: 959344785.746508,
      totalBurned: 40655214.253492 });
  });

  it('does not report zero burns for RPC errors or an unexpected mint format', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(Response.json({ error: { code: -32000 } }))
      .mockResolvedValueOnce(Response.json({ result: { value: { amount: '123', decimals: 9 } } }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadTokenSupply()).toBeNull();
    expect(await loadTokenSupply()).toBeNull();
  });
});

describe('public token market data', () => {
  it('uses the most liquid matching Solana pair and deduplicates pool totals', () => {
    const result = summarizeTokenMarket([
      pair('small', 100), pair('large', 500, { priceUsd: '0.0013' }), pair('large', 500),
      pair('wrong-chain', 5_000, { chainId: 'ethereum' }),
      pair('wrong-token', 5_000, { baseToken: { address: 'other' } }),
    ], '2026-10-21T12:00:00.000Z');
    expect(result).toMatchObject({ priceUsd: 0.0013, marketCapUsd: 1_200_000,
      liquidityUsd: 600, volume24hUsd: 2_000, pairCount: 2 });
  });

  it('does not substitute FDV for missing market cap or missing data with zero', () => {
    expect(summarizeTokenMarket([pair('one', 100, { marketCap: null, volume: {}, priceUsd: 'bad' })]))
      .toMatchObject({ marketCapUsd: null, volume24hUsd: null, priceUsd: null });
    expect(summarizeTokenMarket([])).toBeNull();
    expect(summarizeTokenMarket({ error: 'unavailable' })).toBeNull();
  });

  it('returns unavailable on upstream failure, with a bounded request', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    expect(await loadTokenMarket()).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining(HATCH_TOKEN_MINT),
      expect.objectContaining({ signal: expect.any(AbortSignal), next: { revalidate: 300 } }));
  });
});
