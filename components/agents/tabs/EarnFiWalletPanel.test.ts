import { describe, expect, it } from 'vitest';
import {
  canRunEarnFiPaidAction,
  estimateEarnFiUiCost,
  extractEarnFiVerificationItems,
  formatEarnFiUsd,
  getEarnFiJobPollTargets,
  summarizeEarnFiJob,
} from './EarnFiWalletPanel';

describe('EarnFiWalletPanel helpers', () => {
  it('formats small paid job dollar amounts without hiding cents', () => {
    expect(formatEarnFiUsd(0.066)).toBe('$0.066');
    expect(formatEarnFiUsd(1)).toBe('$1.00');
  });

  it('summarizes recent job records for compact Wallet display', () => {
    expect(summarizeEarnFiJob({
      kind: 'interrupt',
      jobId: 'EFI123456789',
      estimatedUsd: 0.165,
      aiCreditsCharged: 165,
      createdAt: '2026-06-11T10:00:00.000Z',
    })).toEqual('Interrupt EFI123...6789 - $0.165 / 165 credits');
  });

  it('summarizes direct x402 settlement as agent wallet spend', () => {
    expect(summarizeEarnFiJob({
      kind: 'manual',
      jobId: 'MANUAL111122223333',
      estimatedUsd: 0.033,
      settlementMode: 'direct_x402',
      aiCreditsCharged: 0,
      createdAt: '2026-06-11T10:00:00.000Z',
    })).toEqual('Manual MANUAL...3333 - $0.033 / agent wallet');
  });

  it('estimates custom manual job spend for the UI', () => {
    expect(estimateEarnFiUiCost(3, '0.05')).toBe(0.165);
    expect(estimateEarnFiUiCost(0, '0.05')).toBeNull();
    expect(estimateEarnFiUiCost(1, '0.01')).toBeNull();
    expect(estimateEarnFiUiCost(1, 'bad')).toBeNull();
  });

  it('only enables paid actions when the agent has an EarnFi token and the integration is enabled', () => {
    expect(canRunEarnFiPaidAction({ enabled: true, tokenStored: true })).toBe(true);
    expect(canRunEarnFiPaidAction({ enabled: false, tokenStored: true })).toBe(false);
    expect(canRunEarnFiPaidAction({ enabled: true, tokenStored: false })).toBe(false);
  });

  it('keeps polling actions scoped to the job type', () => {
    expect(getEarnFiJobPollTargets({ kind: 'social', jobId: 'job-1' })).toEqual([
      'status',
      'submissions',
      'completions',
      'verifications',
    ]);
    expect(getEarnFiJobPollTargets({ kind: 'manual', jobId: 'job-2' })).toEqual([
      'status',
      'submissions',
      'completions',
      'verifications',
    ]);
    expect(getEarnFiJobPollTargets({ kind: 'interrupt', jobId: 'job-3' })).toEqual(['status']);
  });

  it('extracts reviewable verification IDs from nested EarnFi responses', () => {
    expect(extractEarnFiVerificationItems({
      data: {
        verifications: [
          { id: 123, status: 'pending' },
          { verification_id: '456', status: 'submitted' },
          { id: null },
        ],
      },
    })).toEqual([
      { id: '123', status: 'pending' },
      { id: '456', status: 'submitted' },
    ]);
  });
});
