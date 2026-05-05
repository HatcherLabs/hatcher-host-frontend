import { describe, expect, it } from 'vitest';
import { buildFallbackPassport, networkById, shortAddress } from '../lib/agent-passport';

describe('agent passport helpers', () => {
  it('shortens long addresses without touching short values', () => {
    expect(shortAddress('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAs')).toBe('7xKXtg...sgAs');
    expect(shortAddress('short')).toBe('short');
    expect(shortAddress(null)).toBe('-');
  });

  it('builds a fallback passport with the same Solana CAIP-2 default as the backend', () => {
    const passport = buildFallbackPassport({
      id: 'agent-1',
      slug: 'alpha-agent',
      name: 'Alpha Agent',
      skaleWalletAddress: '0xAgentEvm',
      skaleAgentId: '42',
      status: 'active',
    }, 'agent-1');

    expect(passport.identity.handle).toBe('hatcher:alpha-agent');
    expect(networkById(passport, 'skale')?.status).toBe('registered');
    expect(networkById(passport, 'base')?.sharedWalletWith).toBe('skale');
    expect(networkById(passport, 'solana')?.caip2).toBe('solana:mainnet-beta');
    expect(passport.payments.find((payment) => payment.id === 'x402-solana-usdc')?.caip2)
      .toBe('solana:mainnet-beta');
  });
});
