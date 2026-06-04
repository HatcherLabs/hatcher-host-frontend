import { describe, expect, it } from 'vitest';
import {
  isAllowedSolanaRpcPayload,
  isAuthorizedSolanaRpcProxyRequest,
  isTrustedSolanaRpcSource,
  requiresSolanaRpcProxyAuth,
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

  it('requires explicit proxy auth when a paid server-side RPC is configured', () => {
    expect(requiresSolanaRpcProxyAuth({ HELIUS_API_KEY: 'helius-key' }))
      .toBe(true);
    expect(requiresSolanaRpcProxyAuth({ SOLANA_RPC_URL: 'https://paid-rpc.example' }))
      .toBe(true);
    expect(requiresSolanaRpcProxyAuth({})).toBe(false);

    expect(isAuthorizedSolanaRpcProxyRequest(null, 'proxy-secret')).toBe(false);
    expect(isAuthorizedSolanaRpcProxyRequest('Bearer wrong', 'proxy-secret')).toBe(false);
    expect(isAuthorizedSolanaRpcProxyRequest('Bearer proxy-secret', 'proxy-secret')).toBe(true);
  });
});
