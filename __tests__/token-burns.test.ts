import { describe, expect, it } from 'vitest';
import { extractBurnEvents, summarizeBurnEvents } from '@/lib/token-burns';

const MINT = 'Cntmo5DJNQkB2vYyS4mUx2UoTW4mPrHgWefz8miZpump';

describe('token burn helpers', () => {
  it('extracts outer and inner burn instructions for the selected mint only', () => {
    const burns = extractBurnEvents([
      {
        slot: 123,
        blockTime: 1_777_000_000,
        transaction: {
          signatures: ['sig-one'],
          message: {
            instructions: [
              {
                parsed: {
                  type: 'burnChecked',
                  info: {
                    mint: MINT,
                    source: 'source-a',
                    authority: 'owner-a',
                    tokenAmount: {
                      amount: '1500000',
                      decimals: 6,
                      uiAmountString: '1.5',
                    },
                  },
                },
              },
              {
                parsed: {
                  type: 'transferChecked',
                  info: {
                    mint: MINT,
                    tokenAmount: { amount: '999999', decimals: 6, uiAmountString: '0.999999' },
                  },
                },
              },
            ],
          },
        },
        meta: {
          innerInstructions: [
            {
              instructions: [
                {
                  parsed: {
                    type: 'burn',
                    info: {
                      mint: MINT,
                      account: 'source-b',
                      owner: 'owner-b',
                      amount: '2500000',
                    },
                  },
                },
                {
                  parsed: {
                    type: 'burn',
                    info: {
                      mint: 'DifferentMint1111111111111111111111111111111',
                      amount: '1000000',
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ]);

    expect(burns).toHaveLength(2);
    expect(burns.map((burn) => burn.amount)).toEqual([1.5, 2.5]);
    expect(burns[0]).toMatchObject({
      signature: 'sig-one',
      source: 'source-a',
      authority: 'owner-a',
      instructionType: 'burnChecked',
    });
    expect(burns[1]).toMatchObject({
      source: 'source-b',
      authority: 'owner-b',
      instructionType: 'burn',
    });
  });

  it('uses current on-chain supply for the global total while keeping period totals from tracked burns', () => {
    const now = new Date('2026-05-19T12:00:00.000Z');
    const burns = [
      {
        id: 'sig-1:0',
        signature: 'sig-1',
        slot: 1,
        blockTime: Math.floor(now.getTime() / 1000) - 60 * 60,
        amount: 10,
        amountRaw: '10000000',
        authority: null,
        source: null,
        instructionType: 'burn' as const,
        explorerUrl: 'https://solscan.io/tx/sig-1',
      },
      {
        id: 'sig-2:0',
        signature: 'sig-2',
        slot: 2,
        blockTime: Math.floor(now.getTime() / 1000) - 8 * 24 * 60 * 60,
        amount: 20,
        amountRaw: '20000000',
        authority: null,
        source: null,
        instructionType: 'burnChecked' as const,
        explorerUrl: 'https://solscan.io/tx/sig-2',
      },
    ];

    const summary = summarizeBurnEvents({
      mint: MINT,
      burns,
      currentSupply: 999_999_950,
      currentSupplyRaw: '999999950000000',
      scannedSignatures: 5,
      scannedTransactions: 4,
      now,
      generatedAt: now.toISOString(),
    });

    expect(summary.totalBurned).toBe(50);
    expect(summary.totalBurnedRaw).toBe('50000000');
    expect(summary.burnedShareOfOriginalSupply).toBe(0.00000005);
    expect(summary.periodTotals.day).toBe(10);
    expect(summary.periodTotals.week).toBe(10);
    expect(summary.periodTotals.month).toBe(30);
    expect(summary.scannedSignatures).toBe(5);
    expect(summary.scannedTransactions).toBe(4);
  });
});
