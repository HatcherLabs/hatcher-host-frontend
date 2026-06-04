import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedSolanaRpcPayload,
  isAuthorizedSolanaRpcProxyRequest,
  isTrustedSolanaRpcSource,
  requiresSolanaRpcProxyAuth,
  solanaRpcMethods,
} from '@/lib/solana-rpc-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function upstreamRpc(): string {
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  return process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

const MAX_BODY_BYTES = 512 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const READ_RATE_LIMIT_MAX = 120;
const WRITE_RATE_LIMIT_MAX = 20;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (
    requiresSolanaRpcProxyAuth()
    && !isAuthorizedSolanaRpcProxyRequest(request.headers.get('authorization'))
  ) {
    return jsonRpcError(null, -32004, 'Unauthorized', 401);
  }

  const requestOrigin = publicSiteOrigin(request);
  if (
    !isTrustedSolanaRpcSource(
      request.headers.get('origin'),
      request.headers.get('referer'),
      requestOrigin,
    )
  ) {
    return jsonRpcError(null, -32003, 'Forbidden', 403);
  }

  const body = await request.text();
  if (body.length > MAX_BODY_BYTES) {
    return jsonRpcError(null, -32600, 'Request too large', 413);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonRpcError(null, -32700, 'Parse error', 400);
  }

  if (!isAllowedSolanaRpcPayload(payload)) {
    const id = isRpcObject(payload) ? payload.id ?? null : null;
    return jsonRpcError(id, -32601, 'Solana RPC method not allowed', 403);
  }

  const methods = solanaRpcMethods(payload);
  const isWrite = methods.includes('sendTransaction');
  const rateKey = `${clientRateKey(request)}:${isWrite ? 'write' : 'read'}`;
  const rateLimit = isWrite ? WRITE_RATE_LIMIT_MAX : READ_RATE_LIMIT_MAX;
  if (!consumeRateLimit(rateKey, rateLimit)) {
    const id = isRpcObject(payload) ? payload.id ?? null : null;
    return jsonRpcError(id, -32005, 'Rate limit exceeded', 429);
  }

  const upstream = await fetch(upstreamRpc(), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
    cache: 'no-store',
  });

  return new NextResponse(await upstream.text(), {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
      'cache-control': 'no-store',
    },
  });
}

function isRpcObject(payload: unknown): payload is { method?: unknown; id?: unknown } {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function publicSiteOrigin(request: NextRequest): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      return new URL(siteUrl).origin;
    } catch {
      // Fall back to the request origin below.
    }
  }
  return request.nextUrl.origin;
}

function clientRateKey(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (
    request.headers.get('cf-connecting-ip')
    || forwardedFor
    || request.headers.get('x-real-ip')
    || 'unknown'
  );
}

function consumeRateLimit(key: string, max: number, now = Date.now()): boolean {
  const existing = rateBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (existing.count >= max) return false;
  existing.count++;
  return true;
}

function jsonRpcError(id: unknown, code: number, message: string, status: number) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
