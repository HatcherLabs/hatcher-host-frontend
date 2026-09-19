import type { CommerceActionRequest } from '@/lib/api';

export function commerceActionLabel(action: CommerceActionRequest['action']): string {
  return action === 'pay_order' ? 'Pay for physical order' : 'Create physical order';
}

export function commerceActionNeedsReconciliation(action: CommerceActionRequest): boolean {
  return action.status === 'reconciliation_required';
}
