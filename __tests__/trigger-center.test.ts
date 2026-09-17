import { describe, expect, it } from 'vitest';
import { describeTriggerConfig, triggerSourceLabel } from '@/lib/trigger-center';

describe('trigger center formatting', () => {
  it('labels every managed source', () => {
    expect(triggerSourceLabel('github')).toBe('GitHub');
    expect(triggerSourceLabel('price_move')).toBe('Price move');
    expect(triggerSourceLabel('solana_onchain')).toBe('Solana on-chain');
  });

  it('summarizes GitHub, price, and Solana configs without exposing secrets', () => {
    expect(describeTriggerConfig({
      repository: 'HatcherLabs/Hatcher',
      events: ['push', 'pull_request'],
      branches: ['main'],
    })).toBe('HatcherLabs/Hatcher · push, pull_request');
    expect(describeTriggerConfig({
      mint: 'So11111111111111111111111111111111111111112',
      symbol: 'SOL',
      condition: 'change_down',
      changePercent: 5,
      windowMinutes: 60,
    })).toBe('SOL down 5% / 60m');
    expect(describeTriggerConfig({
      address: 'So11111111111111111111111111111111111111112',
      commitment: 'confirmed',
      includeFailed: false,
    })).toBe('So1111…11112 · confirmed');
  });
});
