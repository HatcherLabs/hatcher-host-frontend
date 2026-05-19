import { NextRequest, NextResponse } from 'next/server';
import {
  HATCHER_BURN_CACHE_SECONDS,
  fetchHatcherBurnSummary,
  type TokenBurnSummary,
} from '@/lib/token-burns';
import { API_URL } from '@/lib/config';

export const runtime = 'nodejs';
export const revalidate = 21_600;

let memoryCache: {
  expiresAt: number;
  data: TokenBurnSummary;
} | null = null;

export async function GET(request: NextRequest) {
  const refresh = request.nextUrl.searchParams.has('refresh');
  const now = Date.now();

  if (!refresh && memoryCache && memoryCache.expiresAt > now) {
    return json(memoryCache.data, 'HIT');
  }

  try {
    const data = await fetchBackendBurnSummary(refresh)
      .catch(() => fetchHatcherBurnSummary());
    memoryCache = {
      data,
      expiresAt: now + HATCHER_BURN_CACHE_SECONDS * 1_000,
    };
    return json(data, refresh ? 'BYPASS' : 'MISS');
  } catch (error) {
    if (memoryCache) {
      return json(memoryCache.data, 'STALE');
    }

    return NextResponse.json(
      {
        error: 'burn_tracker_unavailable',
        message: error instanceof Error ? error.message : 'Unable to fetch burn data',
      },
      {
        status: 502,
        headers: {
          'cache-control': 'no-store',
        },
      },
    );
  }
}

async function fetchBackendBurnSummary(refresh: boolean): Promise<TokenBurnSummary> {
  const url = new URL('/prices/hatch/burns', API_URL);
  if (refresh) url.searchParams.set('refresh', String(Date.now()));
  const response = await fetch(url, {
    headers: { accept: 'application/json' },
    cache: 'no-store',
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? payload?.message ?? 'Backend burn tracker unavailable');
  }
  const data = payload?.data ?? payload;
  if (!data || typeof data !== 'object') {
    throw new Error('Backend burn tracker returned an invalid payload');
  }
  return data as TokenBurnSummary;
}

function json(data: TokenBurnSummary, cacheStatus: 'HIT' | 'MISS' | 'BYPASS' | 'STALE') {
  return NextResponse.json(data, {
    headers: {
      'cache-control': cacheStatus === 'BYPASS'
        ? 'no-store'
        : `public, s-maxage=${HATCHER_BURN_CACHE_SECONDS}, stale-while-revalidate=86400`,
      'x-hatcher-cache': cacheStatus,
    },
  });
}
