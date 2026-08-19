import { describe, expect, it } from 'vitest';
import { LANDING_CHAINS } from '@/components/landing/v3/parts/SectionEcosystem';

describe('landing network list', () => {
  it('shows every supported Hatcher network, including Robinhood and BOT Chain', () => {
    expect(LANDING_CHAINS.map((chain) => chain.label)).toEqual([
      'Solana',
      'SKALE',
      'Base',
      'Cyberia',
      'Robinhood Chain',
      'BOT Chain',
    ]);
    expect(LANDING_CHAINS.find((chain) => chain.label === 'Robinhood Chain')?.href)
      .toBe('https://docs.robinhood.com/chain/');
    expect(LANDING_CHAINS.find((chain) => chain.label === 'BOT Chain')?.href)
      .toBe('https://www.botchain.ai/en');
  });
});
