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
});
