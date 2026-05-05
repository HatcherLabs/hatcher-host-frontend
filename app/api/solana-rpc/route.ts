import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function upstreamRpc(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (process.env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
  }
  return process.env.NEXT_PUBLIC_SOLANA_RPC || 'https://api.mainnet-beta.solana.com';
}

const MAX_BODY_BYTES = 512 * 1024;
const ALLOWED_METHODS = new Set([
  'getAccountInfo',
  'getBalance',
  'getBlockHeight',
  'getFeeForMessage',
  'getHealth',
  'getLatestBlockhash',
  'getMinimumBalanceForRentExemption',
  'getSignatureStatuses',
  'getTokenAccountBalance',
  'getTokenAccountsByOwner',
  'sendTransaction',
  'simulateTransaction',
]);

export async function POST(request: NextRequest) {
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

  if (!isAllowedPayload(payload)) {
    const id = isRpcObject(payload) ? payload.id ?? null : null;
    return jsonRpcError(id, -32601, 'Solana RPC method not allowed', 403);
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

function isAllowedPayload(payload: unknown): boolean {
  if (Array.isArray(payload)) {
    return payload.length > 0 && payload.every(isAllowedRpcObject);
  }
  return isAllowedRpcObject(payload);
}

function isAllowedRpcObject(payload: unknown): payload is { method: string; id?: unknown } {
  return (
    isRpcObject(payload)
    && typeof payload.method === 'string'
    && ALLOWED_METHODS.has(payload.method)
  );
}

function isRpcObject(payload: unknown): payload is { method?: unknown; id?: unknown } {
  return typeof payload === 'object' && payload !== null && !Array.isArray(payload);
}

function jsonRpcError(id: unknown, code: number, message: string, status: number) {
  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code, message } },
    { status, headers: { 'cache-control': 'no-store' } },
  );
}
