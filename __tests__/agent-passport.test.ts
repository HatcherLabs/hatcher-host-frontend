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
    expect(networkById(passport, 'cyberia')).toMatchObject({
      caip2: 'eip155:49406',
      status: 'wallet-ready',
      walletAddress: '0xAgentEvm',
      sharedWalletWith: 'skale',
      contracts: {
        hatcher: '0x621021F18b6404123f98b1395c418868418ACF36',
        usdc: '0xdc25597B19799010047F17e9591EFE08EFd40077',
      },
    });
    expect(networkById(passport, 'botchain')).toMatchObject({
      caip2: 'eip155:677',
      status: 'wallet-ready',
      walletAddress: '0xAgentEvm',
      sharedWalletWith: 'skale',
      explorerUrl: 'https://scan.botchain.ai/address/0xAgentEvm',
    });
    expect(networkById(passport, 'solana')?.caip2).toBe('solana:mainnet-beta');
    expect(networkById(passport, 'base')?.agentId).toBeNull();
    expect(networkById(passport, 'cyberia')?.agentId).toBeNull();
    expect(networkById(passport, 'botchain')?.agentId).toBeNull();
    expect(networkById(passport, 'solana')?.agentId).toBeNull();
    expect(passport.payments).toEqual([]);
    expect(passport.runtime.signerMode).toBe('runtime-signing');
    expect(passport.runtime.trading.networks).toEqual(['skale', 'base', 'cyberia', 'botchain']);
    expect((passport.runtime.trading as Record<string, unknown>).requiresExplicitUserIntent).toBeUndefined();
  });
});
