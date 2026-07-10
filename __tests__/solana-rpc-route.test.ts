import { describe, expect, it } from 'vitest';
import {
  isAllowedSolanaRpcPayload,
  isAuthorizedSolanaRpcProxyRequest,
  isTrustedSolanaRpcSource,
  paidSolanaRpcUrl,
  publicSolanaRpcUrl,
  requiresSolanaRpcProxyAuth,
  shouldUsePaidSolanaRpc,
} from '../lib/solana-rpc-guards';

describe('/api/solana-rpc route guards', () => {
  it('keeps wallet transaction submission available for allowed JSON-RPC payloads', () => {
    expect(isAllowedSolanaRpcPayload({ jsonrpc: '2.0', id: 1, method: 'sendTransaction' }))
      .toBe(true);
    expect(isAllowedSolanaRpcPayload({ jsonrpc: '2.0', id: 1, method: 'getHealth' }))
      .toBe(true);
  });

  it('rejects disallowed JSON-RPC methods', () => {
    expect(isAllowedSolanaRpcPayload({ jsonrpc: '2.0', id: 1, method: 'requestAirdrop' })).toBe(
      false,
    );
  });

  it('requires same-site browser context in production', () => {
    expect(isTrustedSolanaRpcSource(null, null, 'https://hatcher.host', 'production')).toBe(
      false,
    );
    expect(
      isTrustedSolanaRpcSource(
        'https://hatcher.host',
        null,
        'https://hatcher.host',
        'production',
      ),
    ).toBe(true);
    expect(
      isTrustedSolanaRpcSource(
        'https://hatcher.host',
        null,
        'http://hatcher.host',
        'production',
      ),
    ).toBe(true);
    expect(
      isTrustedSolanaRpcSource(
        'https://attacker.example',
        null,
        'https://hatcher.host',
        'production',
      ),
    ).toBe(false);
  });

  it('accepts same-site browser context against any configured trusted origin', () => {
    expect(
      isTrustedSolanaRpcSource(
        'https://hatcher.host',
        null,
        ['https://www.hatcher.host', 'https://hatcher.host'],
        'production',
      ),
    ).toBe(true);
    expect(
      isTrustedSolanaRpcSource(
        'https://attacker.example',
        null,
        ['https://www.hatcher.host', 'https://hatcher.host'],
        'production',
      ),
    ).toBe(false);
  });

  it('detects when paid server-side RPC access needs explicit proxy auth', () => {
    expect(requiresSolanaRpcProxyAuth({ HELIUS_API_KEY: 'helius-key' }))
      .toBe(true);
    expect(requiresSolanaRpcProxyAuth({ SOLANA_RPC_URL: 'https://paid-rpc.example' }))
      .toBe(true);
    expect(requiresSolanaRpcProxyAuth({})).toBe(false);

    expect(isAuthorizedSolanaRpcProxyRequest(null, 'proxy-secret')).toBe(false);
    expect(isAuthorizedSolanaRpcProxyRequest('Bearer wrong', 'proxy-secret')).toBe(false);
    expect(isAuthorizedSolanaRpcProxyRequest('Bearer proxy-secret', 'proxy-secret')).toBe(true);
  });

  it('keeps paid RPC restricted to callers holding the server proxy token', () => {
    const env = {
      HELIUS_API_KEY: 'helius-key',
      SOLANA_RPC_PROXY_TOKEN: 'proxy-secret',
      NEXT_PUBLIC_SOLANA_RPC: 'https://mainnet.helius-rpc.com/?api-key=leaked-public-key',
    };

    expect(publicSolanaRpcUrl(env)).toBe('https://api.mainnet-beta.solana.com/');
    expect(paidSolanaRpcUrl(env)).toBe('https://mainnet.helius-rpc.com/?api-key=helius-key');
    expect(shouldUsePaidSolanaRpc(null, env)).toBe(false);
    expect(shouldUsePaidSolanaRpc('Bearer forged', env)).toBe(false);
    expect(shouldUsePaidSolanaRpc('Bearer proxy-secret', env)).toBe(true);
  });
});
