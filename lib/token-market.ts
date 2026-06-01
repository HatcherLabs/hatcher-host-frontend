export type MarketCapSource = 'onchain_supply' | 'dexscreener_fdv' | 'dexscreener_market_cap';

export function resolveMarketCapUsd(input: {
  priceUsd: number | null;
  currentSupply: number | null;
  dexMarketCapUsd: number | null;
  dexFdvUsd: number | null;
}): { value: number | null; source: MarketCapSource | null } {
  if (
    input.priceUsd !== null
    && input.priceUsd > 0
    && input.currentSupply !== null
    && input.currentSupply > 0
  ) {
    return {
      value: input.priceUsd * input.currentSupply,
      source: 'onchain_supply',
    };
  }

  if (input.dexFdvUsd !== null) {
    return {
      value: input.dexFdvUsd,
      source: 'dexscreener_fdv',
    };
  }

  if (input.dexMarketCapUsd !== null) {
    return {
      value: input.dexMarketCapUsd,
      source: 'dexscreener_market_cap',
    };
  }

  return { value: null, source: null };
}
