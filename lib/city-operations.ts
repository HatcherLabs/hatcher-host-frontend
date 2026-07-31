import type { CityOperationsSummary } from '@/lib/api/types';

export function cityOperationsAttentionTotal(summary: CityOperationsSummary): number {
  return summary.agents.needsAttention
    + summary.tasks.awaitingApproval
    + summary.tasks.failed
    + summary.incidents.unreadCount;
}

