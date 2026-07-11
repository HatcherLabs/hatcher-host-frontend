import type { CityOperationsSummary } from '@/lib/api/types';

export function cityOperationsAttentionTotal(summary: CityOperationsSummary): number {
  return summary.agents.needsAttention
    + summary.tasks.awaitingApproval
    + summary.tasks.failed
    + summary.incidents.unreadCount;
}

export function formatSettlementAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: amount >= 1_000 ? 0 : 4,
  }).format(amount);
}

export function primarySettlementLabel(summary: CityOperationsSummary): string {
  const primary = summary.partnerEarnings.byAsset[0];
  if (!primary) return 'No verified settlements';
  const suffix = summary.partnerEarnings.partial ? '+' : '';
  return `${formatSettlementAmount(primary.amount)}${suffix} ${primary.asset}`;
}

export function settlementCountLabel(summary: CityOperationsSummary): string {
  const count = summary.partnerEarnings.verifiedGrossSettlements;
  const suffix = summary.partnerEarnings.partial ? '+' : '';
  const noun = count === 1 && !summary.partnerEarnings.partial ? 'settlement' : 'settlements';
  return `${new Intl.NumberFormat('en-US').format(count)}${suffix} ${noun}`;
}
