import { describe, expect, it } from 'vitest';

import { buildMpp32SettingsPayload } from './Mpp32WalletPanel';

describe('MPP32 wallet panel helpers', () => {
  it('builds a bounded owner opt-in payload', () => {
    expect(buildMpp32SettingsPayload({
      enabled: true,
      dailyBudgetUsd: '1.5',
      maxPerCallUsd: '0.02',
    })).toEqual({
      enabled: true,
      dailyBudgetUsd: 1.5,
      maxPerCallUsd: 0.02,
    });
  });

  it('rejects invalid budget values before sending a PATCH', () => {
    expect(() => buildMpp32SettingsPayload({
      enabled: true,
      dailyBudgetUsd: '0',
      maxPerCallUsd: '0.02',
    })).toThrow('Daily budget must be a positive USD amount');
  });
});
