import { NextRequest, NextResponse } from 'next/server';
import { HATCHER_BURN_CACHE_SECONDS } from '@/lib/token-burns';
import { isTokenBurnSummary } from '@/lib/token-burn-summary';
import { API_URL } from '@/lib/config';

export const runtime = 'nodejs';
export const revalidate = 0;

// The backend owns receipt caching and coalesces refreshes. Never replace a
// failed payment-aware read with a separate, incomplete mint/wallet scan.
export async function GET(_request: NextRequest) {
  try {
    const url = new URL('/prices/hatch/burns?tracker=2', API_URL);
    const response = await fetch(url, {
      headers: { accept: 'application/json' }, cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    const payload = await response.json();
    const data = payload?.data;
    if (!response.ok || !payload.success || !isTokenBurnSummary(data)) {
      throw new Error('Invalid burn summary');
    }
    return NextResponse.json(data, {
      headers: {
        'cache-control': response.headers.get('x-hatcher-cache') === 'STALE'
          ? 'no-store'
          : `public, s-maxage=${HATCHER_BURN_CACHE_SECONDS}, stale-while-revalidate=60`,
      },
    });
  } catch {
    return NextResponse.json({
      error: 'burn_tracker_unavailable', message: 'Unable to fetch burn data. Please try again.',
    }, { status: 502, headers: { 'cache-control': 'no-store' } });
  }
}
