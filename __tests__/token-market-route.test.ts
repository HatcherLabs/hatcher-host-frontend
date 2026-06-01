import { describe, expect, it } from 'vitest';

import { resolveMarketCapUsd } from '../lib/token-market';

describe('token market route', () => {
  it('uses live token supply and price for HATCHER market cap', () => {
    expect(resolveMarketCapUsd({
      priceUsd: 0.0002618,
      currentSupply: 959_842_650.47418,
      dexMarketCapUsd: 221_877,
      dexFdvUsd: 251_335,
    })).toEqual({
      value: 251_286.80589414033,
      source: 'onchain_supply',
    });
  });

  it('falls back to DexScreener FDV before its marketCap when supply is unavailable', () => {
    expect(resolveMarketCapUsd({
      priceUsd: 0.0002618,
      currentSupply: null,
      dexMarketCapUsd: 221_877,
      dexFdvUsd: 251_335,
    })).toEqual({
      value: 251_335,
      source: 'dexscreener_fdv',
    });
  });
});
