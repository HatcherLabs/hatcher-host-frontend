import { describe, expect, it } from 'vitest';

import { buildVantaraProviderPayload } from './VantaraWalletPanel';

describe('Vantara wallet panel helpers', () => {
  it('builds a trimmed provider publication payload and falls back to the agent wallet', () => {
    expect(buildVantaraProviderPayload({
      name: '  Hatch Task  ',
      description: '  Runs paid Hatcher tasks.  ',
      pricePerCallUsdc: '0.05',
      providerReceiveWallet: '   ',
    }, 'AgentSolanaWallet111111111111111111111111111')).toEqual({
      name: 'Hatch Task',
      description: 'Runs paid Hatcher tasks.',
      pricePerCallUsdc: 0.05,
      providerReceiveWallet: 'AgentSolanaWallet111111111111111111111111111',
    });
  });

  it('rejects invalid prices before sending a provider publication request', () => {
    expect(() => buildVantaraProviderPayload({
      name: 'Hatch Task',
      description: 'Runs paid Hatcher tasks.',
      pricePerCallUsdc: '0',
      providerReceiveWallet: 'AgentSolanaWallet111111111111111111111111111',
    }, null)).toThrow('Price must be a positive USDC amount');
  });

  it('rejects prices above the Vantara self-serve ceiling', () => {
    expect(() => buildVantaraProviderPayload({
      name: 'Hatch Task',
      description: 'Runs paid Hatcher tasks.',
      pricePerCallUsdc: '5.01',
      providerReceiveWallet: 'AgentSolanaWallet111111111111111111111111111',
    }, null)).toThrow('Price must be at most 5 USDC');
  });

  it('matches Vantara self-serve text limits', () => {
    expect(() => buildVantaraProviderPayload({
      name: 'x'.repeat(121),
      description: 'Runs paid Hatcher tasks.',
      pricePerCallUsdc: '0.05',
      providerReceiveWallet: 'AgentSolanaWallet111111111111111111111111111',
    }, null)).toThrow('Name must be 120 characters or fewer');

    expect(() => buildVantaraProviderPayload({
      name: 'Hatch Task',
      description: 'x'.repeat(2001),
      pricePerCallUsdc: '0.05',
      providerReceiveWallet: 'AgentSolanaWallet111111111111111111111111111',
    }, null)).toThrow('Description must be 2000 characters or fewer');
  });
});
