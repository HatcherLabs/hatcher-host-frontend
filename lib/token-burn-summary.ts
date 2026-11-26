import { HATCH_TOKEN_MINT } from './config';
import type { TokenBurnSummary } from './token-burns';

export function isTokenBurnSummary(value: unknown): value is TokenBurnSummary {
  if (!value || typeof value !== 'object') return false;
  const data = value as TokenBurnSummary;
  const amount = (n: unknown) => n === null || (typeof n === 'number' && Number.isFinite(n) && n >= 0);
  return data.mint === HATCH_TOKEN_MINT
    && typeof data.generatedAt === 'string' && Number.isFinite(Date.parse(data.generatedAt))
    && amount(data.totalBurned) && amount(data.burnedShareOfOriginalSupply)
    && Number.isInteger(data.burnCount) && data.burnCount >= 0
    && Number.isInteger(data.scannedTransactions) && data.scannedTransactions >= 0
    && !!data.periodTotals && ['day', 'week', 'month'].every(key =>
      amount(data.periodTotals[key as keyof typeof data.periodTotals]))
    && Array.isArray(data.burns) && data.burns.every(burn =>
      typeof burn.id === 'string' && typeof burn.signature === 'string'
      && typeof burn.amount === 'number' && Number.isFinite(burn.amount) && burn.amount > 0
      && burn.explorerUrl === `https://solscan.io/tx/${burn.signature}`);
}
