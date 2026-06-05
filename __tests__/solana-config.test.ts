import { afterEach, describe, expect, it, vi } from 'vitest';

describe('Solana browser RPC config', () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it('uses the same-origin RPC proxy for browser wallet flows by default', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://hatcher.host');
    vi.stubEnv('NEXT_PUBLIC_SOLANA_RPC', 'https://api.mainnet-beta.solana.com');
    vi.stubEnv('NEXT_PUBLIC_SOLANA_RPC_BROWSER_ENDPOINT', undefined);

    const { SOLANA_RPC_BROWSER_ENDPOINT } = await import('../lib/config');

    expect(SOLANA_RPC_BROWSER_ENDPOINT).toBe('https://hatcher.host/api/solana-rpc');
  });
});
