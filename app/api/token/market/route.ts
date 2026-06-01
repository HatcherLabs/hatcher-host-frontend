import { NextResponse } from 'next/server';
import { HATCH_TOKEN_MINT } from '@/lib/config';
import { resolveMarketCapUsd, type MarketCapSource } from '@/lib/token-market';

export const runtime = 'nodejs';
export const revalidate = 60;

const DEXSCREENER_TOKEN_URL = `https://api.dexscreener.com/latest/dex/tokens/${HATCH_TOKEN_MINT}`;
const CACHE_SECONDS = 60;

type DexPair = {
  chainId?: string;
  dexId?: string;
  url?: string;
  pairAddress?: string;
  baseToken?: { address?: string; symbol?: string; name?: string };
  quoteToken?: { symbol?: string };
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  liquidity?: { usd?: number };
  volume?: { h24?: number };
  priceChange?: { h24?: number };
};

type DexResponse = {
  pairs?: DexPair[];
};

type RpcTokenAmount = {
  amount?: string;
  decimals?: number;
  uiAmount?: number | null;
  uiAmountString?: string;
};

type RpcResult<T> = {
  result?: T;
  error?: {
    code?: number;
    message?: string;
  };
};

type TokenMarketPayload = {
  symbol: string;
  mint: string;
  priceUsd: number | null;
  marketCapUsd: number | null;
  marketCapSource: MarketCapSource | null;
  fdvUsd: number | null;
  currentSupply: number | null;
  liquidityUsd: number | null;
  volume24hUsd: number | null;
  priceChange24h: number | null;
  pairUrl: string;
  solscanUrl: string;
  tokenPageUrl: string;
  source: 'dexscreener';
  updatedAt: string;
};

let memoryCache: {
  expiresAt: number;
  data: TokenMarketPayload;
} | null = null;

export async function GET() {
  const now = Date.now();
  if (memoryCache && memoryCache.expiresAt > now) {
    return json(memoryCache.data, 'HIT');
  }

  try {
    const response = await fetch(DEXSCREENER_TOKEN_URL, {
      headers: { accept: 'application/json' },
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) {
      throw new Error(`Dexscreener returned ${response.status}`);
    }

    const payload = await response.json() as DexResponse;
    const pair = pickBestPair(payload.pairs ?? []);
    if (!pair) throw new Error('No HATCHER pair found on Dexscreener');

    const priceUsd = readNumber(pair.priceUsd);
    const dexMarketCapUsd = readNumber(pair.marketCap);
    const dexFdvUsd = readNumber(pair.fdv);
    const currentSupply = await fetchTokenSupply(HATCH_TOKEN_MINT).catch(() => null);
    const marketCap = resolveMarketCapUsd({
      priceUsd,
      currentSupply,
      dexMarketCapUsd,
      dexFdvUsd,
    });

    const data: TokenMarketPayload = {
      symbol: pair.baseToken?.symbol ?? 'HATCHER',
      mint: HATCH_TOKEN_MINT,
      priceUsd,
      marketCapUsd: marketCap.value,
      marketCapSource: marketCap.source,
      fdvUsd: dexFdvUsd,
      currentSupply,
      liquidityUsd: readNumber(pair.liquidity?.usd),
      volume24hUsd: readNumber(pair.volume?.h24),
      priceChange24h: readNumber(pair.priceChange?.h24),
      pairUrl: pair.url ?? `https://dexscreener.com/solana/${HATCH_TOKEN_MINT}`,
      solscanUrl: `https://solscan.io/token/${HATCH_TOKEN_MINT}`,
      tokenPageUrl: '/token',
      source: 'dexscreener',
      updatedAt: new Date().toISOString(),
    };
    memoryCache = {
      data,
      expiresAt: now + CACHE_SECONDS * 1_000,
    };
    return json(data, 'MISS');
  } catch (error) {
    if (memoryCache) {
      return json(memoryCache.data, 'STALE');
    }

    return NextResponse.json(
      {
        error: 'token_market_unavailable',
        message: error instanceof Error ? error.message : 'Unable to fetch HATCHER market data',
      },
      {
        status: 502,
        headers: { 'cache-control': 'no-store' },
      },
    );
  }
}

function pickBestPair(pairs: DexPair[]): DexPair | null {
  const hatcherPairs = pairs.filter((pair) =>
    pair.chainId === 'solana'
    && pair.baseToken?.address === HATCH_TOKEN_MINT
    && readNumber(pair.marketCap ?? pair.fdv) !== null
  );
  if (hatcherPairs.length === 0) return null;
  return hatcherPairs.toSorted((a, b) => {
    const aPumpSwap = a.dexId === 'pumpswap' ? 1 : 0;
    const bPumpSwap = b.dexId === 'pumpswap' ? 1 : 0;
    if (aPumpSwap !== bPumpSwap) return bPumpSwap - aPumpSwap;
    return (readNumber(b.liquidity?.usd) ?? 0) - (readNumber(a.liquidity?.usd) ?? 0);
  })[0] ?? null;
}

function readNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchTokenSupply(mint: string): Promise<number | null> {
  const response = await fetch(upstreamRpc(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenSupply',
      params: [mint],
    }),
    cache: 'no-store',
  });

  if (!response.ok) throw new Error(`Solana RPC returned ${response.status}`);

  const payload = await response.json() as RpcResult<{ value?: RpcTokenAmount }>;
  if (payload.error) {
    throw new Error(payload.error.message || `Solana RPC error ${payload.error.code ?? 'unknown'}`);
  }
  return amountFromTokenAmount(payload.result?.value);
}

function upstreamRpc(): string {
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  return process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

function amountFromTokenAmount(tokenAmount?: RpcTokenAmount): number | null {
  if (!tokenAmount) return null;
  if (tokenAmount.uiAmountString) {
    const parsed = Number(tokenAmount.uiAmountString);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof tokenAmount.uiAmount === 'number' && Number.isFinite(tokenAmount.uiAmount)) {
    return tokenAmount.uiAmount;
  }
  if (tokenAmount.amount) {
    const raw = Number(tokenAmount.amount);
    const decimals = tokenAmount.decimals ?? 6;
    if (Number.isFinite(raw)) return raw / 10 ** decimals;
  }
  return null;
}

function json(data: TokenMarketPayload, cacheStatus: 'HIT' | 'MISS' | 'STALE') {
  return NextResponse.json(data, {
    headers: {
      'cache-control': `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=300`,
      'x-hatcher-cache': cacheStatus,
    },
  });
}
