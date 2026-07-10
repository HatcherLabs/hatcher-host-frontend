const MAX_BATCH_SIZE = 20;
const DEFAULT_PUBLIC_SOLANA_RPC = 'https://api.mainnet-beta.solana.com/';

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

export function isAllowedSolanaRpcPayload(payload: unknown): boolean {
  if (Array.isArray(payload)) {
    return (
      payload.length > 0
      && payload.length <= MAX_BATCH_SIZE
      && payload.every(isAllowedRpcObject)
    );
  }
  return isAllowedRpcObject(payload);
}

export function solanaRpcMethods(payload: unknown): string[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is { method: string } => isAllowedRpcObject(item))
      .map((item) => item.method);
  }
  return isAllowedRpcObject(payload) ? [payload.method] : [];
}

export function isTrustedSolanaRpcSource(
  origin: string | null,
  referer: string | null,
  requestOrigin: string | string[],
  nodeEnv = process.env.NODE_ENV,
): boolean {
  if (nodeEnv !== 'production') return true;
  const candidates = [origin, referer].filter((value): value is string => Boolean(value));
  if (candidates.length === 0) return false;
  const trustedOrigins = Array.isArray(requestOrigin) ? requestOrigin : [requestOrigin];
  const trustedHosts = new Set(
    trustedOrigins
      .map((value) => {
        try {
          return new URL(value).host;
        } catch {
          return null;
        }
      })
      .filter((value): value is string => Boolean(value)),
  );
  return candidates.some((value) => {
    try {
      return trustedHosts.has(new URL(value).host);
    } catch {
      return false;
    }
  });
}

export function requiresSolanaRpcProxyAuth(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(env.HELIUS_API_KEY || env.SOLANA_RPC_URL || env.SOLANA_RPC_PROXY_REQUIRE_AUTH === 'true');
}

export function publicSolanaRpcUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const rpcUrl = env.NEXT_PUBLIC_SOLANA_RPC;
  if (!rpcUrl) return DEFAULT_PUBLIC_SOLANA_RPC;

  try {
    const parsed = new URL(rpcUrl);
    const hasPubliclyExposedSecret = Array.from(parsed.searchParams.keys()).some((key) => {
      const normalized = key.toLowerCase().replace(/[-_]/g, '');
      return normalized === 'apikey' || normalized === 'token' || normalized === 'key';
    });
    if (hasPubliclyExposedSecret) return DEFAULT_PUBLIC_SOLANA_RPC;
    return parsed.toString();
  } catch {
    return DEFAULT_PUBLIC_SOLANA_RPC;
  }
}

export function paidSolanaRpcUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  if (env.HELIUS_API_KEY) {
    return `https://mainnet.helius-rpc.com/?api-key=${env.HELIUS_API_KEY}`;
  }
  return env.SOLANA_RPC_URL || null;
}

export function shouldUsePaidSolanaRpc(
  authorization: string | null,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!paidSolanaRpcUrl(env)) return false;
  return isAuthorizedSolanaRpcProxyRequest(authorization, env.SOLANA_RPC_PROXY_TOKEN);
}

export function isAuthorizedSolanaRpcProxyRequest(
  authorization: string | null,
  proxyToken = process.env.SOLANA_RPC_PROXY_TOKEN,
): boolean {
  if (!proxyToken) return false;
  return authorization === `Bearer ${proxyToken}`;
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
