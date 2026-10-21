import { HATCH_TOKEN_MINT } from './config';

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
    return { value: input.dexFdvUsd, source: 'dexscreener_fdv' };
  }
  if (input.dexMarketCapUsd !== null) {
    return { value: input.dexMarketCapUsd, source: 'dexscreener_market_cap' };
  }
  return { value: null, source: null };
}

export interface TokenMarket {
  generatedAt: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  pairCount: number;
  sourceUrl: string;
}

type Pair = {
  chainId?: string;
  pairAddress?: string;
  baseToken?: { address?: string };
  priceUsd?: string;
  marketCap?: number | null;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
};

function amount(value: unknown): number | null {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function summarizeTokenMarket(
  data: unknown, generatedAt = new Date().toISOString(),
): TokenMarket | null {
  if (!Array.isArray(data)) return null;
  const unique = new Map<string, Pair>();
  for (const value of data) {
    if (!value || typeof value !== 'object') continue;
    const pair = value as Pair;
    // priceUsd and marketCap refer to the base token, never the quote token.
    if (pair.chainId !== 'solana' || pair.baseToken?.address !== HATCH_TOKEN_MINT
      || typeof pair.pairAddress !== 'string' || !pair.pairAddress) continue;
    if (!unique.has(pair.pairAddress)) unique.set(pair.pairAddress, pair);
  }
  const pairs = [...unique.values()].sort((a, b) =>
    (amount(b.liquidity?.usd) ?? 0) - (amount(a.liquidity?.usd) ?? 0));
  if (!pairs.length) return null;
  const sum = (read: (pair: Pair) => unknown): number | null => {
    const values = pairs.map(pair => amount(read(pair)));
    return values.some(value => value === null) ? null
      : values.reduce<number>((total, value) => total + (value ?? 0), 0);
  };
  return {
    generatedAt,
    priceUsd: amount(pairs[0].priceUsd),
    marketCapUsd: amount(pairs[0].marketCap),
    liquidityUsd: sum(pair => pair.liquidity?.usd),
    volume24hUsd: sum(pair => pair.volume?.h24),
    pairCount: pairs.length,
    sourceUrl: `https://dexscreener.com/solana/${encodeURIComponent(pairs[0].pairAddress!)}`,
  };
}

export async function loadTokenMarket(): Promise<TokenMarket | null> {
  try {
    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${HATCH_TOKEN_MINT}`,
      { next: { revalidate: 300 }, signal: AbortSignal.timeout(8_000) },
    );
    if (!response.ok) return null;
    const date = response.headers.get('date');
    const generatedAt = date && Number.isFinite(Date.parse(date))
      ? new Date(date).toISOString() : new Date().toISOString();
    return summarizeTokenMarket(await response.json(), generatedAt);
  } catch {
    return null;
  }
}
