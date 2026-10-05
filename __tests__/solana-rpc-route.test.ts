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
  const rewardProgram = 'RWRDyfZa6Rk9UYi85yjYYfGmoUqffLqjo6vZdFawEez';
  const pool = 'G2zhUwUYBrwgm1E4ivp6QA1nNrtU4UFZ1Jwqv59mXfqQ';
  const rewardSearch = (program = rewardProgram, filters: unknown[] = [
    { memcmp: { offset: 0, bytes: '12345678' } },
    { memcmp: { offset: 10, bytes: pool } },
  ]) => ({ jsonrpc: '2.0', id: 1, method: 'getProgramAccounts', params: [program, { encoding: 'base64', filters }] });

  it('allows scoped Streamflow reward pool and reward entry discovery', () => {
    expect(isAllowedSolanaRpcPayload(rewardSearch())).toBe(true);
    expect(isAllowedSolanaRpcPayload(rewardSearch(rewardProgram, [
      { memcmp: { offset: 0, bytes: '12345678' } },
      { memcmp: { offset: 40, bytes: 'D6XiL9sSHpgqp6EqTHS2D9yyNpxkbJPJEw4AWwh8R2A5' } },
    ]))).toBe(true);
  });

  it('rejects broad scans, unrelated programs, and invalid reward discovery filters', () => {
    for (const payload of [
      rewardSearch(pool),
      rewardSearch(rewardProgram, []),
      rewardSearch(rewardProgram, [{ memcmp: { offset: 0, bytes: '12345678' } }]),
      rewardSearch(rewardProgram, [{ memcmp: { offset: 10, bytes: '11111111111111111111111111111111' } }]),
      rewardSearch(rewardProgram, [{ memcmp: { offset: 40, bytes: '' } }]),
      rewardSearch(rewardProgram, [{ memcmp: { offset: 40, bytes: 'bad-key' } }]),
      rewardSearch(rewardProgram, [{ memcmp: { offset: 40, bytes: pool, encoding: 'base64' } }]),
      { method: 'getProgramAccounts', params: [rewardProgram] },
      { method: 'getProgramAccounts', params: null },
    ]) {
      expect(isAllowedSolanaRpcPayload(payload)).toBe(false);
      expect(isAllowedSolanaRpcPayload([rewardSearch(), payload])).toBe(false);
    }
  });

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
