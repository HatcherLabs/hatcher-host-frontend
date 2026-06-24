import { NextRequest, NextResponse } from 'next/server';
import {
  isAllowedSolanaRpcPayload,
  isAuthorizedSolanaRpcProxyRequest,
  isTrustedSolanaRpcSource,
  paidSolanaRpcUrl,
  publicSolanaRpcUrl,
  requiresSolanaRpcProxyAuth,
  shouldUsePaidSolanaRpc,
  solanaRpcMethods,
} from '@/lib/solana-rpc-guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function upstreamRpc(usePaidRpc: boolean): string {
  if (usePaidRpc) {
    return paidSolanaRpcUrl() || publicSolanaRpcUrl();
  }
  return publicSolanaRpcUrl();
}

const MAX_BODY_BYTES = 512 * 1024;
const RATE_LIMIT_WINDOW_MS = 60_000;
const READ_RATE_LIMIT_MAX = 120;
const WRITE_RATE_LIMIT_MAX = 20;
const SOLANA_RPC_UPSTREAM_TIMEOUT_MS = 15_000;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  const requestOrigins = publicSiteOrigins(request);
  const authorization = request.headers.get('authorization');
  const isTrustedBrowserRequest = isTrustedSolanaRpcSource(
    request.headers.get('origin'),
    request.headers.get('referer'),
    requestOrigins,
  );
  const isAuthorizedProxyRequest = isAuthorizedSolanaRpcProxyRequest(authorization);

  if (!isTrustedBrowserRequest && !isAuthorizedProxyRequest) {
    if (requiresSolanaRpcProxyAuth()) {
      return jsonRpcError(null, -32004, 'Unauthorized', 401);
    }
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SOLANA_RPC_UPSTREAM_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(upstreamRpc(shouldUsePaidSolanaRpc(
      authorization,
      process.env,
      { trustedBrowserRequest: isTrustedBrowserRequest },
    )), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (err) {
    const id = rpcErrorId(payload);
    if (isAbortError(err)) {
      return jsonRpcError(id, -32006, 'Solana RPC upstream timed out', 504);
    }
    return jsonRpcError(id, -32007, 'Solana RPC upstream request failed', 502);
  } finally {
    clearTimeout(timeout);
  }

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

function rpcErrorId(payload: unknown): unknown {
  return isRpcObject(payload) ? payload.id ?? null : null;
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === 'AbortError';
}

function publicSiteOrigins(request: NextRequest): string[] {
  const origins = new Set<string>([request.nextUrl.origin]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    try {
      origins.add(new URL(siteUrl).origin);
    } catch {
      // Fall back to the request origin below.
    }
  }
  return Array.from(origins);
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
